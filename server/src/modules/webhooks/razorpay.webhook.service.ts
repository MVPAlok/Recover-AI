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

    const payment = validation.payload.payload?.payment?.entity;
    const order = validation.payload.payload?.order?.entity;
    const orderId = payment?.order_id || order?.id;
    const paymentId = payment?.id;
    const transactionId =
      payment?.notes?.transactionId ||
      order?.notes?.transactionId ||
      (validation.payload.payload as any)?.payment_link?.entity?.notes?.transactionId;

    // 2. Persist event for idempotency
    const { event, isDuplicate } = await this.repository.recordWebhookEvent({
      eventId: validation.eventId,
      eventType: validation.eventType,
      payload: validation.payload as unknown as Record<string, unknown>,
      signatureVerified: true,
      transactionId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });

    if (isDuplicate && event.status === WebhookProcessingStatus.PROCESSED) {
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
          merchantId: (result as any).merchantId,
          transactionId: result.transactionId || transactionId,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        });
        metricsService.recordWebhook({ status: 'PROCESSED' });
      } else if (result.status === 'AMOUNT_MISMATCH') {
        await this.repository.updateWebhookEventStatus(validation.eventId, {
          status: WebhookProcessingStatus.FAILED,
          transactionId: result.transactionId || transactionId,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          errorMessage: result.message,
        });
        metricsService.recordWebhook({ status: 'AMOUNT_MISMATCH' });
      } else {
        await this.repository.updateWebhookEventStatus(validation.eventId, {
          status: WebhookProcessingStatus.PROCESSED,
          transactionId: result.transactionId || transactionId,
        });
        metricsService.recordWebhook({ status: 'PROCESSED' });
      }

      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.repository.updateWebhookEventStatus(validation.eventId, {
        status: WebhookProcessingStatus.FAILED,
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
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
          });

          await this.repository.createAuditLog({
            merchantId: tx.merchantId,
            transactionId: tx.id,
            recoveryAttemptId: latestAttempt?.id,
            action: 'FINANCIAL_AMOUNT_MISMATCH_BLOCKED',
            details: {
              expectedAmount: expectedAmountRupees,
              capturedAmount: capturedAmountRupees,
              razorpayPaymentId: paymentId,
              razorpayOrderId: orderId,
              eventId,
              guardrail: 'STRICT_RECONCILIATION_GATEWAY_CHECK',
            },
          });

          return {
            status: 'AMOUNT_MISMATCH',
            eventId,
            eventType,
            transactionId: tx.id,
            message: `Amount mismatch: expected ₹${expectedAmountRupees}, received ₹${capturedAmountRupees}. Flagged as REQUIRES_REVIEW.`,
          };
        }

        // Exact amount verified! Record authoritative Payment ledger entry
        await this.repository.recordReconciledPayment({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          amount: expectedAmountRupees,
          capturedAmount: capturedAmountRupees,
          currency: tx.currency,
        });

        // Update Transaction to SUCCESS + CAPTURED + RECOVERED
        await this.repository.updateTransactionFinancialState(tx.id, {
          status: TransactionStatus.SUCCESS,
          paymentStatus: PaymentStatus.CAPTURED,
          recoveryStatus: TransactionRecoveryStatus.RECOVERED,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
        });

        // Update RecoveryAttempt to SUCCESS
        if (latestAttempt) {
          await this.repository.updateRecoveryAttemptStatus(latestAttempt.id, {
            status: RecoveryStatus.SUCCESS,
            reason: `Payment captured & verified via Razorpay Test Mode (${paymentId}).`,
            amountRecovered: capturedAmountRupees,
            completedAt: new Date(),
          });
        }

        // Record Audit Trail
        await this.repository.createAuditLog({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          action: 'PAYMENT_RECOVERY_CONFIRMED',
          details: {
            amountRecovered: capturedAmountRupees,
            paymentStatus: 'CAPTURED',
            recoveryStatus: 'RECOVERED',
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
            paymentMethod: payment?.method || 'card',
            eventId,
          },
        });

        return {
          status: 'PROCESSED',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Payment ₹${capturedAmountRupees} captured & reconciled successfully.`,
        };
      }

      case 'payment.failed': {
        const failureReason =
          payment?.error_description || payment?.error_reason || 'Payment failed at gateway';
        const failureCode = payment?.error_code || 'GATEWAY_DECLINE';

        // Record failed attempt in Payment ledger
        await this.repository.recordFailedPayment({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          amount: tx.amount.toNumber(),
          currency: tx.currency,
          failureCode,
          failureReason,
        });

        await this.repository.updateTransactionFinancialState(tx.id, {
          paymentStatus: PaymentStatus.FAILED,
          recoveryStatus: TransactionRecoveryStatus.NOT_RECOVERED,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
        });

        if (latestAttempt) {
          await this.repository.updateRecoveryAttemptStatus(latestAttempt.id, {
            status: RecoveryStatus.FAILED,
            reason: `Payment failed at gateway: ${failureReason}`,
            amountRecovered: 0,
            failedAt: new Date(),
          });
        }

        await this.repository.createAuditLog({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          action: 'PAYMENT_RECOVERY_FAILED',
          details: {
            failureCode,
            failureReason,
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
            eventId,
          },
        });

        return {
          status: 'PROCESSED',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Payment failed processed: ${failureReason}`,
        };
      }

      default: {
        return {
          status: 'UNHANDLED_EVENT',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Unhandled event type ${eventType}`,
        };
      }
    }
  }
}
