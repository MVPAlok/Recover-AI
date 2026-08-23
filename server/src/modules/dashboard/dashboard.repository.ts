import { AIAgentType, PrismaClient, RecoveryDecision, RecoveryStatus, TransactionStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { TransactionFilterParams, RecoveryFilterParams } from './dashboard.types.js';

export class DashboardRepository {
  private db: PrismaClient;

  constructor(customPrisma?: PrismaClient) {
    this.db = customPrisma || prisma;
  }

  /**
   * Retrieves default primary merchant or looks up by ID.
   */
  async getMerchant(merchantId?: string) {
    if (merchantId) {
      return this.db.merchant.findUnique({ where: { id: merchantId } });
    }
    return this.db.merchant.findFirst({ orderBy: { createdAt: 'asc' } });
  }

  /**
   * Lists all available merchants (for merchant switcher).
   */
  async getAllMerchants() {
    return this.db.merchant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Aggregates overview metrics for a merchant.
   */
  async getOverviewAggregates(merchantId: string) {
    const [
      totalTransactions,
      failedTransactionsCount,
      successfulTransactionsCount,
      failedTransactionsSum,
      recoveredSumResult,
      recoverableDecisionsCount,
    ] = await Promise.all([
      this.db.transaction.count({ where: { merchantId } }),
      this.db.transaction.count({ where: { merchantId, status: TransactionStatus.FAILED } }),
      this.db.transaction.count({ where: { merchantId, status: TransactionStatus.SUCCESS } }),
      this.db.transaction.aggregate({
        where: { merchantId, status: TransactionStatus.FAILED },
        _sum: { amount: true },
      }),
      this.db.recoveryAttempt.aggregate({
        where: { merchantId, status: RecoveryStatus.SUCCESS },
        _sum: { amountRecovered: true },
      }),
      this.db.aIDecision.count({
        where: {
          merchantId,
          agentType: AIAgentType.RECOVERY_DECISION,
          decision: { in: [RecoveryDecision.RETRY, RecoveryDecision.REMIND] },
        },
      }),
    ]);

    const revenueAtRisk = Number(failedTransactionsSum._sum.amount || 0);
    const recoveredRevenue = Number(recoveredSumResult._sum.amountRecovered || 0);

    return {
      totalTransactions,
      failedPayments: failedTransactionsCount,
      successfulTransactions: successfulTransactionsCount,
      revenueAtRisk,
      recoveredRevenue,
      recoverablePayments: recoverableDecisionsCount,
    };
  }

  /**
   * Retrieves high-potential recovery opportunities.
   */
  async getRecoveryOpportunities(merchantId: string, limit: number = 10) {
    return this.db.transaction.findMany({
      where: {
        merchantId,
        status: TransactionStatus.FAILED,
      },
      include: {
        customer: true,
        aiDecisions: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        recoveryAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Retrieves paginated transactions with dynamic filters.
   */
  async getTransactions(merchantId: string, params: TransactionFilterParams) {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      decision,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const whereClause: any = { merchantId };

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { failureCode: { contains: search, mode: 'insensitive' } },
        { failureReason: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    if (decision) {
      whereClause.aiDecisions = {
        some: {
          agentType: AIAgentType.RECOVERY_DECISION,
          decision,
        },
      };
    }

    const [total, transactions] = await Promise.all([
      this.db.transaction.count({ where: whereClause }),
      this.db.transaction.findMany({
        where: whereClause,
        include: {
          customer: true,
          aiDecisions: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          recoveryAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return { total, transactions, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Retrieves full transaction lifecycle by ID.
   */
  async getTransactionLifecycle(merchantId: string, transactionId: string) {
    const transaction = await this.db.transaction.findFirst({
      where: { id: transactionId, merchantId },
      include: {
        customer: true,
        aiDecisions: {
          orderBy: { createdAt: 'asc' },
        },
        recoveryAttempts: {
          orderBy: { createdAt: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!transaction) return null;

    // Aggregate customer historical stats
    const [customerTotal, customerSuccess, customerFailed] = await Promise.all([
      this.db.transaction.count({ where: { customerId: transaction.customerId } }),
      this.db.transaction.count({ where: { customerId: transaction.customerId, status: TransactionStatus.SUCCESS } }),
      this.db.transaction.count({ where: { customerId: transaction.customerId, status: TransactionStatus.FAILED } }),
    ]);

    return {
      transaction,
      customerStats: {
        totalTransactions: customerTotal,
        successfulTransactions: customerSuccess,
        failedTransactions: customerFailed,
        successRate: customerTotal > 0 ? (customerSuccess / customerTotal) * 100 : 0,
      },
    };
  }

  /**
   * Retrieves paginated recovery attempts.
   */
  async getRecoveries(merchantId: string, params: RecoveryFilterParams) {
    const { page = 1, limit = 25, status, actionType, search } = params;
    const skip = (page - 1) * limit;

    const whereClause: any = { merchantId };

    if (status) whereClause.status = status;
    if (actionType) whereClause.actionType = actionType;
    if (search) {
      whereClause.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { transactionId: { contains: search, mode: 'insensitive' } },
        { transaction: { customer: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.recoveryAttempt.count({ where: whereClause }),
      this.db.recoveryAttempt.findMany({
        where: whereClause,
        include: {
          transaction: {
            include: { customer: true },
          },
          aiDecision: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, items, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Retrieves single recovery attempt by ID.
   */
  async getRecoveryById(merchantId: string, id: string) {
    return this.db.recoveryAttempt.findFirst({
      where: { id, merchantId },
      include: {
        transaction: {
          include: { customer: true },
        },
        aiDecision: true,
        auditLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Aggregates failure breakdowns for analytics.
   */
  async getFailureBreakdown(merchantId: string) {
    const failures = await this.db.transaction.groupBy({
      by: ['failureCode'],
      where: {
        merchantId,
        status: TransactionStatus.FAILED,
        failureCode: { not: null },
      },
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const totalFailed = failures.reduce((sum, f) => sum + f._count.id, 0);

    return failures.map((f) => ({
      failureCode: f.failureCode || 'UNKNOWN',
      count: f._count.id,
      amount: Number(f._sum.amount || 0),
      percentage: totalFailed > 0 ? (f._count.id / totalFailed) * 100 : 0,
    }));
  }

  /**
   * Aggregates decision distributions for analytics.
   */
  async getDecisionBreakdown(merchantId: string) {
    const decisions = await this.db.aIDecision.groupBy({
      by: ['decision'],
      where: {
        merchantId,
        agentType: AIAgentType.RECOVERY_DECISION,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const totalDecisions = decisions.reduce((sum, d) => sum + d._count.id, 0);

    return decisions.map((d) => ({
      decision: d.decision,
      count: d._count.id,
      percentage: totalDecisions > 0 ? (d._count.id / totalDecisions) * 100 : 0,
    }));
  }

  /**
   * Aggregates recovery outcomes.
   */
  async getRecoveryOutcomes(merchantId: string) {
    const outcomes = await this.db.recoveryAttempt.groupBy({
      by: ['status'],
      where: { merchantId },
      _count: { id: true },
      _sum: { amountRecovered: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return outcomes.map((o) => ({
      status: o.status,
      count: o._count.id,
      amountRecovered: Number(o._sum.amountRecovered || 0),
    }));
  }

  /**
   * Retrieves paginated audit logs.
   */
  async getAuditLogs(merchantId: string, params: { page?: number; limit?: number; entityType?: string; action?: string; transactionId?: string }) {
    const { page = 1, limit = 50, entityType, action, transactionId } = params;
    const skip = (page - 1) * limit;

    const whereClause: any = { merchantId };
    if (entityType) whereClause.entityType = entityType;
    if (action) whereClause.action = { contains: action, mode: 'insensitive' };
    if (transactionId) whereClause.transactionId = transactionId;

    const [total, logs] = await Promise.all([
      this.db.auditLog.count({ where: whereClause }),
      this.db.auditLog.findMany({
        where: whereClause,
        include: {
          transaction: {
            select: { id: true, amount: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, logs, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Retrieves Razorpay webhook status summary.
   */
  async getRazorpayStatusSummary() {
    const [totalWebhooks, lastWebhook] = await Promise.all([
      this.db.razorpayWebhookEvent.count(),
      this.db.razorpayWebhookEvent.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalWebhooks,
      lastWebhookAt: lastWebhook?.createdAt ? lastWebhook.createdAt.toISOString() : null,
      lastEventType: lastWebhook?.eventType || null,
    };
  }
}
