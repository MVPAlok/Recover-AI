import { logger } from '../../utils/logger.js';
import { RazorpayWebhookPayload } from '../../integrations/razorpay/razorpay.types.js';
import { RazorpayWebhookRepository } from './razorpay.webhook.repository.js';
import { RazorpayWebhookValidator, WebhookValidationResult } from './razorpay.webhook.validator.js';

export interface WebhookProcessingResult {
  status: 'PROCESSED' | 'DUPLICATE_IGNORED' | 'UNMATCHED_TRANSACTION' | 'AMOUNT_MISMATCH' | 'UNHANDLED_EVENT';
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
      return {
        status: 'DUPLICATE_IGNORED',
        eventId: validation.eventId,
        eventType: validation.eventType,
        message: `Duplicate webhook event ${validation.eventId} already processed.`,
      };
    }

    // 3. Process event according to eventType
    const result = await this.processEvent(validation);

    // 4. Mark event as processed
    await this.repository.markEventProcessed(validation.eventId);

    return result;
  }

  /**
   * Dispatches and processes business logic based on event type.
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

    // Update transaction with payment ID if present
    if (paymentId && tx.razorpayPaymentId !== paymentId) {
      await this.repository.updateTransactionRazorpayIds(tx.id, {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
      });
    }

    // 2. Handle specific webhook events
    switch (eventType) {
      case 'payment.captured': {
        const capturedAmountPaise = payment?.amount ?? 0;
        const capturedAmountRupees = capturedAmountPaise / 100;
        const expectedAmountRupees = tx.amount.toNumber();

        // Amount Mismatch Check
        if (Math.abs(capturedAmountRupees - expectedAmountRupees) > 0.01) {
          logger.warn(
            `[RazorpayWebhookService] Amount mismatch for tx ${tx.id}: captured ₹${capturedAmountRupees} != expected ₹${expectedAmountRupees}`
          );

          await this.repository.createAuditLog({
            merchantId: tx.merchantId,
            transactionId: tx.id,
            recoveryAttemptId: latestAttempt?.id,
            action: 'GATEWAY_AMOUNT_MISMATCH_WARNING',
            details: {
              eventId,
              capturedAmountRupees,
              expectedAmountRupees,
              paymentId,
            },
          });

          return {
            status: 'AMOUNT_MISMATCH',
            eventId,
            eventType,
            transactionId: tx.id,
            message: `Amount mismatch: captured ₹${capturedAmountRupees} does not match expected ₹${expectedAmountRupees}. Recovery not marked SUCCESS.`,
          };
        }

        // Valid Capture Confirmed
        if (latestAttempt) {
          await this.repository.updateRecoveryAttemptStatus(latestAttempt.id, {
            status: 'SUCCESS',
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

        if (latestAttempt) {
          await this.repository.updateRecoveryAttemptStatus(latestAttempt.id, {
            status: 'FAILED',
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
          message: `Recorded payment failure for transaction ${tx.id}: ${errorReason}`,
        };
      }

      case 'payment.authorized': {
        await this.repository.createAuditLog({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          action: 'PAYMENT_AUTHORIZED',
          details: {
            eventId,
            paymentId,
            orderId,
            amount: (payment?.amount ?? 0) / 100,
          },
        });

        return {
          status: 'PROCESSED',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Payment authorized event logged for transaction ${tx.id}.`,
        };
      }

      default: {
        logger.info(`[RazorpayWebhookService] Unhandled event type: ${eventType}`);
        await this.repository.createAuditLog({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: latestAttempt?.id,
          action: 'GATEWAY_EVENT_RECEIVED',
          details: {
            eventId,
            eventType,
          },
        });

        return {
          status: 'UNHANDLED_EVENT',
          eventId,
          eventType,
          transactionId: tx.id,
          message: `Webhook event '${eventType}' acknowledged and logged.`,
        };
      }
    }
  }
}
