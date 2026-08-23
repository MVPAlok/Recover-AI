import {
  AIAgentType,
  PaymentStatus,
  Prisma,
  RecoveryDecision,
  RecoveryStatus,
  TransactionRecoveryStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { metricsService } from '../../services/metrics.service.js';
import { RecoveryExecutorMetrics } from './execution.types.js';

export class ExecutionRepository {
  /**
   * Retrieves a transaction with its customer, merchant, decisions, and attempts.
   */
  async getTransactionWithDetails(transactionId: string) {
    return prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        merchant: true,
        customer: true,
        aiDecisions: {
          orderBy: { createdAt: 'desc' },
        },
        recoveryAttempts: {
          orderBy: { attemptNumber: 'desc' },
        },
      },
    });
  }

  /**
   * Finds the latest Phase 5 Recovery Decision for a transaction.
   */
  async getLatestPhase5Decision(transactionId: string) {
    return prisma.aIDecision.findFirst({
      where: {
        transactionId,
        agentType: AIAgentType.RECOVERY_DECISION,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves candidate transactions with Phase 5 decisions ready for execution.
   */
  async getCandidateTransactionsForExecution(limit = 25) {
    const safeLimit = Math.min(100, Math.max(1, limit));

    return prisma.transaction.findMany({
      where: {
        status: 'FAILED',
        aiDecisions: {
          some: {
            agentType: AIAgentType.RECOVERY_DECISION,
          },
        },
      },
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: true,
        customer: true,
        aiDecisions: {
          where: {
            agentType: AIAgentType.RECOVERY_DECISION,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        recoveryAttempts: {
          orderBy: { attemptNumber: 'desc' },
        },
      },
    });
  }

  /**
   * Creates a new RecoveryAttempt record and updates Transaction state to IN_PROGRESS.
   */
  async createRecoveryAttempt(data: {
    merchantId: string;
    transactionId: string;
    aiDecisionId: string;
    attemptNumber: number;
    actionType: RecoveryDecision;
    status: RecoveryStatus;
    reason?: string | null;
    amountRecovered?: number;
    scheduledAt?: Date | null;
    executedAt?: Date | null;
  }) {
    // Financial Integrity: Execution itself does not recover revenue (amount = 0 until payment webhook confirms capture)
    const [attempt] = await prisma.$transaction([
      prisma.recoveryAttempt.create({
        data: {
          merchantId: data.merchantId,
          transactionId: data.transactionId,
          aiDecisionId: data.aiDecisionId,
          attemptNumber: data.attemptNumber,
          actionType: data.actionType,
          status: data.status,
          reason: data.reason || null,
          amountRecovered: 0, // Zero until verified payment capture
          scheduledAt: data.scheduledAt || null,
          executedAt: data.executedAt || null,
        },
      }),
      prisma.transaction.update({
        where: { id: data.transactionId },
        data: {
          recoveryStatus:
            data.actionType === 'STOP'
              ? TransactionRecoveryStatus.CANCELLED
              : TransactionRecoveryStatus.IN_PROGRESS,
        },
      }),
    ]);

    metricsService.recordExecution(
      data.status === RecoveryStatus.SUCCESS
        ? 'SUCCESS'
        : data.status === RecoveryStatus.FAILED
        ? 'FAILED'
        : 'PENDING'
    );

    return attempt;
  }

  /**
   * Updates an existing RecoveryAttempt with execution outcome details.
   */
  async updateRecoveryAttemptOutcome(
    attemptId: string,
    data: {
      status: RecoveryStatus;
      reason?: string | null;
      amountRecovered?: number;
      executedAt?: Date | null;
      scheduledAt?: Date | null;
    }
  ) {
    return prisma.recoveryAttempt.update({
      where: { id: attemptId },
      data: {
        status: data.status,
        reason: data.reason || null,
        amountRecovered: data.amountRecovered ?? 0,
        executedAt: data.executedAt || null,
        scheduledAt: data.scheduledAt || null,
      },
    });
  }

  /**
   * Atomically increments the retryCount on the transaction.
   */
  async incrementTransactionRetryCount(transactionId: string) {
    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        retryCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Creates an audit log record for an execution event.
   */
  async createAuditLog(params: {
    merchantId: string;
    transactionId: string;
    recoveryAttemptId?: string | null;
    action: string;
    actor?: string;
    details: Record<string, unknown>;
  }) {
    return prisma.auditLog.create({
      data: {
        merchantId: params.merchantId,
        transactionId: params.transactionId,
        recoveryAttemptId: params.recoveryAttemptId || null,
        entityType: 'RECOVERY_EXECUTION',
        entityId: params.recoveryAttemptId || params.transactionId,
        action: params.action,
        actor: params.actor || 'RecoverAI:RecoveryExecutor',
        details: params.details as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Aggregates execution metrics across all recovery attempts.
   */
  async getExecutionMetrics(): Promise<RecoveryExecutorMetrics> {
    const attempts = await prisma.recoveryAttempt.findMany({
      select: {
        actionType: true,
        status: true,
        amountRecovered: true,
      },
    });

    let successfulRecoveries = 0;
    let failedRecoveries = 0;
    let cancelledAttempts = 0;
    let pendingAttempts = 0;
    let totalAmountRecovered = 0;
    let retryAttemptsCount = 0;
    let successfulRetriesCount = 0;

    const amountByActionType: Record<RecoveryDecision, number> = {
      RETRY: 0,
      REMIND: 0,
      ESCALATE: 0,
      WAIT: 0,
      STOP: 0,
    };

    for (const attempt of attempts) {
      const amt = attempt.amountRecovered.toNumber();
      totalAmountRecovered += amt;
      amountByActionType[attempt.actionType] = (amountByActionType[attempt.actionType] || 0) + amt;

      if (attempt.actionType === 'RETRY') {
        retryAttemptsCount++;
        if (attempt.status === 'SUCCESS') {
          successfulRetriesCount++;
        }
      }

      switch (attempt.status) {
        case 'SUCCESS':
          successfulRecoveries++;
          break;
        case 'FAILED':
          failedRecoveries++;
          break;
        case 'CANCELLED':
          cancelledAttempts++;
          break;
        case 'PENDING':
          pendingAttempts++;
          break;
        default:
          break;
      }
    }

    const totalAttempts = attempts.length;
    const recoveryRate = totalAttempts > 0 ? successfulRecoveries / totalAttempts : 0;
    const retrySuccessRate =
      retryAttemptsCount > 0 ? successfulRetriesCount / retryAttemptsCount : 0;

    return {
      totalAttempts,
      successfulRecoveries,
      failedRecoveries,
      cancelledAttempts,
      pendingAttempts,
      totalAmountRecovered,
      recoveryRate: Math.round(recoveryRate * 1000) / 1000,
      retrySuccessRate: Math.round(retrySuccessRate * 1000) / 1000,
      amountByActionType,
    };
  }
}
