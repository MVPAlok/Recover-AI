import {
  PaymentStatus,
  Prisma,
  PrismaClient,
  RazorpayWebhookEvent,
  RecoveryStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
  WebhookProcessingStatus,
} from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export class RazorpayWebhookRepository {
  constructor(private prisma: PrismaClient = defaultPrisma) {}

  /**
   * Persists incoming webhook event idempotently.
   * Returns { event, isDuplicate: boolean }.
   */
  async recordWebhookEvent(params: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    signatureVerified?: boolean;
    merchantId?: string;
    transactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    correlationId?: string;
  }): Promise<{ event: RazorpayWebhookEvent; isDuplicate: boolean }> {
    const {
      eventId,
      eventType,
      payload,
      signatureVerified = true,
      merchantId,
      transactionId,
      razorpayOrderId,
      razorpayPaymentId,
      correlationId,
    } = params;

    // Check if event already exists
    const existing = await this.prisma.razorpayWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      logger.warn(`[RazorpayWebhookRepo] Duplicate webhook event received (eventId: ${eventId})`);
      return { event: existing, isDuplicate: true };
    }

    try {
      const created = await this.prisma.razorpayWebhookEvent.create({
        data: {
          eventId,
          eventType,
          payload: payload as unknown as Prisma.InputJsonValue,
          status: WebhookProcessingStatus.RECEIVED,
          signatureVerified,
          merchantId,
          transactionId,
          razorpayOrderId,
          razorpayPaymentId,
          correlationId,
        },
      });
      return { event: created, isDuplicate: false };
    } catch (err: any) {
      if (err.code === 'P2002') {
        const raceExisting = await this.prisma.razorpayWebhookEvent.findUnique({
          where: { eventId },
        });
        return { event: raceExisting!, isDuplicate: true };
      }
      throw err;
    }
  }

  /**
   * Updates status, correlation, and processing result of a webhook event.
   */
  async updateWebhookEventStatus(
    eventId: string,
    params: {
      status: WebhookProcessingStatus;
      merchantId?: string;
      transactionId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      correlationId?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    await this.prisma.razorpayWebhookEvent.update({
      where: { eventId },
      data: {
        status: params.status,
        merchantId: params.merchantId,
        transactionId: params.transactionId,
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        correlationId: params.correlationId,
        errorMessage: params.errorMessage || null,
        processedAt: params.status === WebhookProcessingStatus.PROCESSED ? new Date() : undefined,
      },
    });
  }

  /**
   * Finds transaction by Razorpay Order ID, Payment ID, or direct transaction ID note.
   */
  async findTransactionForWebhook(params: {
    orderId?: string;
    paymentId?: string;
    transactionId?: string;
  }) {
    const { orderId, paymentId, transactionId } = params;

    if (transactionId) {
      const tx = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          recoveryAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          merchant: true,
        },
      });
      if (tx) return tx;
    }

    if (orderId) {
      const tx = await this.prisma.transaction.findFirst({
        where: { razorpayOrderId: orderId },
        include: {
          recoveryAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          merchant: true,
        },
      });
      if (tx) return tx;
    }

    if (paymentId) {
      const tx = await this.prisma.transaction.findFirst({
        where: { razorpayPaymentId: paymentId },
        include: {
          recoveryAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          merchant: true,
        },
      });
      if (tx) return tx;
    }

    return null;
  }

  /**
   * Records a reconciled payment in the Payment ledger (authoritative revenue source of truth).
   */
  async recordReconciledPayment(params: {
    merchantId: string;
    transactionId: string;
    recoveryAttemptId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    amount: number;
    currency?: string;
    capturedAmount: number;
    correlationId?: string;
  }) {
    const {
      merchantId,
      transactionId,
      recoveryAttemptId,
      razorpayOrderId,
      razorpayPaymentId,
      amount,
      currency = 'INR',
      capturedAmount,
      correlationId,
    } = params;

    return this.prisma.payment.create({
      data: {
        merchantId,
        transactionId,
        recoveryAttemptId,
        razorpayOrderId,
        razorpayPaymentId,
        amount: new Prisma.Decimal(amount),
        currency,
        status: PaymentStatus.CAPTURED,
        capturedAmount: new Prisma.Decimal(capturedAmount),
        verified: true,
        reconciled: true,
        correlationId,
      },
    });
  }

  /**
   * Records a failed payment in the Payment ledger.
   */
  async recordFailedPayment(params: {
    merchantId: string;
    transactionId: string;
    recoveryAttemptId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    amount: number;
    currency?: string;
    failureCode?: string;
    failureReason?: string;
    correlationId?: string;
  }) {
    const {
      merchantId,
      transactionId,
      recoveryAttemptId,
      razorpayOrderId,
      razorpayPaymentId,
      amount,
      currency = 'INR',
      failureCode,
      failureReason,
      correlationId,
    } = params;

    return this.prisma.payment.create({
      data: {
        merchantId,
        transactionId,
        recoveryAttemptId,
        razorpayOrderId,
        razorpayPaymentId,
        amount: new Prisma.Decimal(amount),
        currency,
        status: PaymentStatus.FAILED,
        capturedAmount: new Prisma.Decimal(0),
        verified: true,
        reconciled: false,
        failureCode,
        failureReason,
        correlationId,
      },
    });
  }

  /**
   * Updates transaction's financial and recovery state.
   */
  async updateTransactionFinancialState(
    transactionId: string,
    params: {
      status?: TransactionStatus;
      paymentStatus?: PaymentStatus;
      recoveryStatus?: TransactionRecoveryStatus;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      correlationId?: string;
    }
  ) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
        ...(params.recoveryStatus ? { recoveryStatus: params.recoveryStatus } : {}),
        ...(params.razorpayOrderId ? { razorpayOrderId: params.razorpayOrderId } : {}),
        ...(params.razorpayPaymentId ? { razorpayPaymentId: params.razorpayPaymentId } : {}),
        ...(params.correlationId ? { correlationId: params.correlationId } : {}),
      },
    });
  }

  /**
   * Updates recovery attempt outcome confirmed by webhook.
   */
  async updateRecoveryAttemptStatus(
    attemptId: string,
    params: {
      status: RecoveryStatus;
      reason?: string;
      amountRecovered?: number;
      completedAt?: Date;
      failedAt?: Date;
      cancelledAt?: Date;
    }
  ) {
    return this.prisma.recoveryAttempt.update({
      where: { id: attemptId },
      data: {
        status: params.status,
        reason: params.reason,
        amountRecovered:
          params.amountRecovered !== undefined
            ? new Prisma.Decimal(params.amountRecovered)
            : undefined,
        executedAt: new Date(),
        completedAt: params.completedAt,
        failedAt: params.failedAt,
        cancelledAt: params.cancelledAt,
      },
    });
  }

  /**
   * Records an immutable audit log for gateway webhook event lifecycle.
   */
  async createAuditLog(params: {
    merchantId: string;
    transactionId?: string;
    recoveryAttemptId?: string;
    action: string;
    actor?: string;
    actorType?: string;
    requestId?: string;
    correlationId?: string;
    details?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        merchantId: params.merchantId,
        transactionId: params.transactionId,
        recoveryAttemptId: params.recoveryAttemptId,
        entityType: 'RAZORPAY_WEBHOOK',
        entityId: params.transactionId || 'WEBHOOK_EVENT',
        action: params.action,
        actor: params.actor || 'RAZORPAY_GATEWAY',
        actorType: params.actorType || 'WEBHOOK',
        requestId: params.requestId,
        correlationId: params.correlationId,
        details: (params.details || {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
