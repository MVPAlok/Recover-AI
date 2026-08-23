import {
  PaymentStatus,
  RecoveryStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
  WebhookProcessingStatus,
} from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { metricsService } from '../../services/metrics.service.js';
import { RazorpayWebhookRepository } from './razorpay.webhook.repository.js';
import { RazorpayWebhookValidator, WebhookValidationResult } from './razorpay.webhook.validator.js';

export interface WebhookProcessingResult {
  status:
    | 'PROCESSED'
    | 'DUPLICATE_IGNORED'
    | 'UNMATCHED_TRANSACTION'
    | 'AMOUNT_MISMATCH'
    | 'UNHANDLED_EVENT'
    | 'FAILED';
  eventId: string;
  eventType: string;
  transactionId?: string;
  message: string;
}

export class RazorpayWebhookService {
  constructor(
    private repository: RazorpayWebhookRepository = new RazorpayWebhookRepository(),
    private validator: RazorpayWebhookValidator = new RazorpayWebhookValidator()
  ) {}

  /**
   * Primary entry point for validating and processing incoming Razorpay webhook.
   */
  async handleWebhook(params: {
    rawBody?: Buffer | string;
    signature?: string;
    headerEventId?: string;
    bodyPayload?: unknown;
    webhookSecret?: string;
  }): Promise<WebhookProcessingResult> {
    // 1. Validate signature & payload
    const validation = this.validator.validate(params);

    // 2. Persist event for idempotency
    const { event, isDuplicate } = await this.repository.recordWebhookEvent({
      eventId: validation.eventId,
      eventType: validation.eventType,
      payload: validation.payload as unknown as Record<string, unknown>,
    });

    if (isDuplicate && event.processed) {
      logger.info(
        `[RazorpayWebhookService] Duplicate webhook event ${validation.eventId} already processed. Ignoring.`
      );
      metricsService.recordWebhook({ status: 'DUPLICATE_IGNORED' });
      return {
        status: 'DUPLICATE_IGNORED',
        eventId: validation.eventId,
        eventType: validation.eventType,
        message: `Duplicate webhook event ${validation.eventId} already processed.`,
      };
    }

    try {
      // 3. Process event according to eventType
      const result = await this.processEvent(validation);

      // 4. Update webhook event status
      if (result.status === 'PROCESSED' || result.status === 'DUPLICATE_IGNORED') {
        await this.repository.updateWebhookEventStatus(validation.eventId, {
          status: WebhookProcessingStatus.PROCESSED,
          processed: true,
        });
        metricsService.recordWebhook({ status: 'PROCESSED' });
      } else if (result.status === 'AMOUNT_MISMATCH') {
        await this.repository.updateWebhookEventStatus(validation.eventId, {
          status: WebhookProcessingStatus.FAILED,
          processed: false,
          errorMessage: result.message,
        });
        metricsService.recordWebhook({ status: 'AMOUNT_MISMATCH' });
      } else {
        await this.repository.updateWebhookEventStatus(validation.eventId, {
          status: WebhookProcessingStatus.PROCESSED,
          processed: true,
        });
        metricsService.recordWebhook({ status: 'PROCESSED' });
      }

      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.repository.updateWebhookEventStatus(validation.eventId, {
        status: WebhookProcessingStatus.FAILED,
        processed: false,
        errorMessage,
      });
      metricsService.recordWebhook({ status: 'FAILED' });
      throw err;
    }
  }

  /**
   * Dispatches and processes business logic based on event type with strict financial reconciliation.
   */
  private async processEvent(validation: WebhookValidationResult): Promise<WebhookProcessingResult> {
    const { eventId, eventType, payload } = validation;
    const payment = payload.payload?.payment?.entity;
    const order = payload.payload?.order?.entity;

    const orderId = payment?.order_id || order?.id;
    const paymentId = payment?.id;
    const transactionId =
      payment?.notes?.transactionId ||
      order?.notes?.transactionId ||
      (payload.payload as any)?.payment_link?.entity?.notes?.transactionId;

    logger.info(
      `[RazorpayWebhookService] Processing event ${eventType} (eventId: ${eventId}, orderId: ${orderId}, txId: ${transactionId})`
    );

    // 1. Lookup matching RecoverAI transaction
    const tx = await this.repository.findTransactionForWebhook({
      orderId,
      paymentId,
      transactionId,
    });

    if (!tx) {
      logger.warn(
        `[RazorpayWebhookService] No matching RecoverAI transaction found for event ${eventId} (orderId: ${orderId}, paymentId: ${paymentId})`
      );
      return {
        status: 'UNMATCHED_TRANSACTION',
        eventId,
        eventType,
        message: `No matching transaction found for order '${orderId}' or payment '${paymentId}'.`,
      };
    }

    const latestAttempt = tx.recoveryAttempts?.[0] || null;

    // 2. Handle specific webhook events
    switch (eventType) {
      case 'payment.captured': {
        const capturedAmountPaise = payment?.amount ?? 0;
        const capturedAmountRupees = capturedAmountPaise / 100;
        const expectedAmountRupees = tx.amount.toNumber();

        // Strict Financial Integrity: Check Amount Mismatch
        if (Math.abs(capturedAmountRupees - expectedAmountRupees) > 0.01) {
          logger.warn(
            `[RazorpayWebhookService] Amount mismatch for tx ${tx.id}: captured ₹${capturedAmountRupees} != expected ₹${expectedAmountRupees}`
          );

          await this.repository.updateTransactionFinancialState(tx.id, {
            status: TransactionStatus.FAILED,
            paymentStatus: PaymentStatus.AUTHORIZED,
            recoveryStatus: TransactionRecoveryStatus.REQUIRES_REVIEW,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
          });

          await this.repository.createAuditLog({
            merchantId: tx.merchantId,
            transactionId: tx.id,
            recoveryAttemptId: latestAttempt?.id,
            action: 'FINANCIAL_AMOUNT_MISMATCH_BLOCKED',
            details: {
              eventId,
              capturedAmountRupees,
              expectedAmountRupees,
              paymentId,
              orderId,
            },
          });

          return {
            status: 'AMOUNT_MISMATCH',
            eventId,
            eventType,
            transactionId: tx.id,
            message: `Amount mismatch: captured ₹${capturedAmountRupees} does not match expected ₹${expectedAmountRupees}. Recovery blocked and flagged for review.`,
          };
        }

        // Valid Capture Confirmed: Reconcile financial state atomically
        await this.repository.updateTransactionFinancialState(tx.id, {
          status: TransactionStatus.SUCCESS,
          paymentStatus: PaymentStatus.CAPTURED,
          recoveryStatus: TransactionRecoveryStatus.RECOVERED,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        });

        if (latestAttempt) {
          await this.repository.updateRecoveryAttemptStatus(latestAttempt.id, {
            status: RecoveryStatus.SUCCESS,
            reason: `Payment recovery confirmed via Razorpay Test Webhook (${paymentId}).`,
            amountRecovered: capturedAmountRupees,
          });
        }

        await this.repository.createAuditLog({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          action: 'PAYMENT_RECOVERY_CONFIRMED',
          details: {
            eventId,
            paymentId,
            orderId,
            amountRecovered: capturedAmountRupees,
            method: payment?.method,
          },
        });

        return {
          status: 'PROCESSED',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Payment recovery successfully confirmed for transaction ${tx.id} (amount: ₹${capturedAmountRupees}).`,
        };
      }

      case 'payment.failed': {
        const errorReason =
          payment?.error_description || payment?.error_reason || 'Payment failed on Razorpay gateway';

        await this.repository.updateTransactionFinancialState(tx.id, {
          status: TransactionStatus.FAILED,
          paymentStatus: PaymentStatus.FAILED,
          recoveryStatus: TransactionRecoveryStatus.NOT_RECOVERED,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        });

        if (latestAttempt) {
          await this.repository.updateRecoveryAttemptStatus(latestAttempt.id, {
            status: RecoveryStatus.FAILED,
            reason: `Razorpay Test payment failed: ${errorReason}`,
            amountRecovered: 0,
          });
        }

        await this.repository.createAuditLog({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          action: 'PAYMENT_RECOVERY_FAILED',
          details: {
            eventId,
            paymentId,
            orderId,
            errorCode: payment?.error_code,
            errorDescription: errorReason,
          },
        });

        return {
          status: 'PROCESSED',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Recorded payment failure event for transaction ${tx.id}.`,
        };
      }

      case 'payment.authorized': {
        await this.repository.updateTransactionFinancialState(tx.id, {
          paymentStatus: PaymentStatus.AUTHORIZED,
          recoveryStatus: TransactionRecoveryStatus.IN_PROGRESS,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        });

        await this.repository.createAuditLog({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          action: 'PAYMENT_AUTHORIZED_PENDING_CAPTURE',
          details: { eventId, paymentId, orderId },
        });

        return {
          status: 'PROCESSED',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Payment authorized for transaction ${tx.id}. Awaiting capture confirmation.`,
        };
      }

      default: {
        logger.info(`[RazorpayWebhookService] Unhandled event type: ${eventType}`);
        return {
          status: 'UNHANDLED_EVENT',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Webhook event '${eventType}' acknowledged with no action.`,
        };
      }
    }
  }
}
