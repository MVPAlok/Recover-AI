import { Prisma, PrismaClient, RazorpayWebhookEvent, RecoveryStatus } from '@prisma/client';
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
  }): Promise<{ event: RazorpayWebhookEvent; isDuplicate: boolean }> {
    const { eventId, eventType, payload } = params;

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
          processed: false,
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
   * Marks a webhook event as processed.
   */
  async markEventProcessed(eventId: string): Promise<void> {
    await this.prisma.razorpayWebhookEvent.update({
      where: { eventId },
      data: {
        processed: true,
        processedAt: new Date(),
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
   * Updates transaction's razorpay identifiers.
   */
  async updateTransactionRazorpayIds(
    transactionId: string,
    ids: { razorpayOrderId?: string; razorpayPaymentId?: string }
  ) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...(ids.razorpayOrderId ? { razorpayOrderId: ids.razorpayOrderId } : {}),
        ...(ids.razorpayPaymentId ? { razorpayPaymentId: ids.razorpayPaymentId } : {}),
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
    }
  ) {
    return this.prisma.recoveryAttempt.update({
      where: { id: attemptId },
      data: {
        status: params.status,
        reason: params.reason,
        amountRecovered: params.amountRecovered !== undefined ? new Prisma.Decimal(params.amountRecovered) : undefined,
        executedAt: new Date(),
      },
    });
  }

  /**
   * Records an audit log for gateway webhook event lifecycle.
   */
  async createAuditLog(params: {
    merchantId: string;
    transactionId?: string;
    recoveryAttemptId?: string;
    action: string;
    actor?: string;
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
        details: (params.details || {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
