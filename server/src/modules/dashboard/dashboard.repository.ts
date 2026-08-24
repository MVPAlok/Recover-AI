import {
  AIAgentType,
  PaymentStatus,
  PrismaClient,
  RecoveryDecision,
  RecoveryStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
  WebhookProcessingStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { RecoveryFilterParams, TransactionFilterParams } from './dashboard.types.js';

export class DashboardRepository {
  private db: PrismaClient;

  constructor(customPrisma?: PrismaClient) {
    this.db = customPrisma || prisma;
  }

  /**
   * Retrieves default primary merchant or looks up by ID with safe fallback.
   */
  async getMerchant(merchantId?: string) {
    if (merchantId) {
      const found = await this.db.merchant.findUnique({ where: { id: merchantId } });
      if (found) return found;
    }
    return this.db.merchant.findFirst({ orderBy: { createdAt: 'asc' } });
  }

  /**
   * Creates a new merchant workspace and auto-seeds initial sandbox transactions.
   */
  async createMerchantWithSeedData(data: { name: string; email: string; currency?: string }) {
    const rawEmail = data.email.trim().toLowerCase();
    // Check if email exists; if so, append random suffix for uniqueness in sandbox
    const existing = await this.db.merchant.findUnique({ where: { email: rawEmail } });
    const uniqueEmail = existing
      ? `${rawEmail.split('@')[0]}_${Math.floor(Math.random() * 10000)}@${rawEmail.split('@')[1] || 'example.test'}`
      : rawEmail;

    const merchant = await this.db.merchant.create({
      data: {
        name: data.name.trim() || 'Custom Merchant Sandbox',
        email: uniqueEmail,
        role: 'OWNER',
      },
    });

    // Create or find User and link MerchantMembership with OWNER role
    try {
      let user = await this.db.user.findUnique({ where: { email: uniqueEmail } });
      if (!user) {
        user = await this.db.user.create({
          data: {
            email: uniqueEmail,
            name: data.name.trim() || 'Merchant Owner',
          },
        });
      }
      await this.db.merchantMembership.create({
        data: {
          merchantId: merchant.id,
          userId: user.id,
          role: 'OWNER',
        },
      });
    } catch (err) {
      // Non-blocking for sandbox seed
    }

    const now = new Date();
    const currency = data.currency || 'INR';

    // Seed 1 default customer
    const customer = await this.db.customer.create({
      data: {
        merchantId: merchant.id,
        email: `customer_${Math.floor(Math.random() * 1000)}@example.test`,
        name: 'Demo Customer',
        phone: '+919876543210',
      },
    });

    // 1. Seed Recovered Transaction
    const tx1 = await this.db.transaction.create({
      data: {
        merchantId: merchant.id,
        customerId: customer.id,
        amount: 2499,
        currency,
        status: TransactionStatus.SUCCESS,
        recoveryStatus: TransactionRecoveryStatus.RECOVERED,
        failureCode: 'GATEWAY_TIMEOUT',
        failureReason: 'Temporary bank server timeout',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    });

    const aiDec1 = await this.db.aIDecision.create({
      data: {
        merchantId: merchant.id,
        transactionId: tx1.id,
        stage: 'POLICY',
        agentType: AIAgentType.RECOVERY_POLICY,
        decision: RecoveryDecision.RETRY,
        confidence: 0.94,
        reasoning: 'Transient gateway timeout with 94% recovery likelihood. RETRY recommended.',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        rootCause: 'TEMPORARY_GATEWAY_FAILURE',
        riskLevel: 'LOW',
        modelName: 'gemini-3.5-flash-lite',
      },
    });

    const attempt1 = await this.db.recoveryAttempt.create({
      data: {
        merchantId: merchant.id,
        transactionId: tx1.id,
        attemptNumber: 1,
        status: RecoveryStatus.SUCCESS,
        action: RecoveryDecision.RETRY,
        amountRecovered: 2499,
        razorpayOrderId: `order_sandbox_${Math.floor(Math.random() * 100000)}`,
        razorpayPaymentId: `pay_sandbox_${Math.floor(Math.random() * 100000)}`,
        executedAt: new Date(now.getTime() - 90 * 60 * 1000),
      },
    });

    await this.db.payment.create({
      data: {
        merchantId: merchant.id,
        transactionId: tx1.id,
        recoveryAttemptId: attempt1.id,
        amount: 2499,
        currency,
        status: PaymentStatus.CAPTURED,
        capturedAmount: 2499,
        verified: true,
        reconciled: true,
        razorpayOrderId: attempt1.razorpayOrderId,
        razorpayPaymentId: attempt1.razorpayPaymentId,
        settledAt: new Date(now.getTime() - 85 * 60 * 1000),
      },
    });

    // 2. Seed In-Progress Reminder Opportunity
    const tx2 = await this.db.transaction.create({
      data: {
        merchantId: merchant.id,
        customerId: customer.id,
        amount: 4850,
        currency,
        status: TransactionStatus.FAILED,
        recoveryStatus: TransactionRecoveryStatus.IN_PROGRESS,
        failureCode: 'AUTHENTICATION_FAILURE',
        failureReason: 'Customer abandoned OTP 3DS challenge',
        createdAt: new Date(now.getTime() - 45 * 60 * 1000),
      },
    });

    await this.db.aIDecision.create({
      data: {
        merchantId: merchant.id,
        transactionId: tx2.id,
        stage: 'POLICY',
        agentType: AIAgentType.RECOVERY_POLICY,
        decision: RecoveryDecision.REMIND,
        confidence: 0.82,
        reasoning: 'Customer abandoned 3DS OTP verification. Dispatched payment link reminder.',
        failureCategory: 'CUSTOMER_AUTHENTICATION',
        rootCause: 'CUSTOMER_AUTH_FAILED',
        riskLevel: 'LOW',
        modelName: 'gemini-3.5-flash-lite',
      },
    });

    // 3. Seed Stopped Fraud/Expired Card Transaction
    const tx3 = await this.db.transaction.create({
      data: {
        merchantId: merchant.id,
        customerId: customer.id,
        amount: 12000,
        currency,
        status: TransactionStatus.FAILED,
        recoveryStatus: TransactionRecoveryStatus.CANCELLED,
        failureCode: 'EXPIRED_CARD',
        failureReason: 'Payment card has expired',
        createdAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
    });

    await this.db.aIDecision.create({
      data: {
        merchantId: merchant.id,
        transactionId: tx3.id,
        stage: 'POLICY',
        agentType: AIAgentType.RECOVERY_POLICY,
        decision: RecoveryDecision.STOP,
        confidence: 0.99,
        reasoning: 'Hard card expiration. Retries stopped by Authoritative Policy Guardrail.',
        failureCategory: 'INSTRUMENT_EXPIRATION',
        rootCause: 'CARD_EXPIRED',
        riskLevel: 'HIGH',
        modelName: 'gemini-3.5-flash-lite',
      },
    });

    return merchant;
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
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Aggregates overview metrics for a merchant with strict financial formulas.
   */
  async getOverviewAggregates(merchantId: string) {
    const [
      totalTransactions,
      failedTransactionsCount,
      successfulTransactionsCount,
      failedTransactionsSum,
      recoveredSumResult,
      recoverableDecisionsCount,
      totalExecutionAttempts,
      successfulExecutionsCount,
    ] = await Promise.all([
      this.db.transaction.count({ where: { merchantId } }),
      this.db.transaction.count({ where: { merchantId, status: TransactionStatus.FAILED } }),
      this.db.transaction.count({ where: { merchantId, status: TransactionStatus.SUCCESS } }),
      this.db.transaction.aggregate({
        where: { merchantId, status: TransactionStatus.FAILED },
        _sum: { amount: true },
      }),
      // Strict Financial Source of Truth: Sum capturedAmount from verified and reconciled payments
      this.db.payment.aggregate({
        where: {
          merchantId,
          verified: true,
          reconciled: true,
          status: PaymentStatus.CAPTURED,
        },
        _sum: { capturedAmount: true },
      }),
      this.db.aIDecision.count({
        where: {
          merchantId,
          agentType: AIAgentType.RECOVERY_DECISION,
          decision: { in: [RecoveryDecision.RETRY, RecoveryDecision.REMIND] },
        },
      }),
      this.db.recoveryAttempt.count({ where: { merchantId } }),
      this.db.recoveryAttempt.count({
        where: { merchantId, status: RecoveryStatus.SUCCESS },
      }),
    ]);

    const revenueAtRisk = Number(failedTransactionsSum._sum.amount || 0);
    const recoveredRevenue = Number(recoveredSumResult._sum.capturedAmount || 0);
    const recoveryRate =
      revenueAtRisk > 0 ? Number(((recoveredRevenue / revenueAtRisk) * 100).toFixed(2)) : 0;
    const executionSuccessRate =
      totalExecutionAttempts > 0
        ? Number(((successfulExecutionsCount / totalExecutionAttempts) * 100).toFixed(2))
        : 0;

    return {
      totalTransactions,
      failedPayments: failedTransactionsCount,
      successfulTransactions: successfulTransactionsCount,
      revenueAtRisk,
      recoveredRevenue,
      recoveryRate,
      executionSuccessRate,
      recoverablePayments: recoverableDecisionsCount,
      environment: 'TEST_MODE',
      gatewayProvider: 'Razorpay Test Sandbox',
    };
  }

  /**
   * Retrieves high-potential recovery opportunities.
   */
  async getRecoveryOpportunities(merchantId: string, limit = 10) {
    return this.db.transaction.findMany({
      where: {
        merchantId,
        status: TransactionStatus.FAILED,
        recoveryStatus: { in: [TransactionRecoveryStatus.NOT_STARTED, TransactionRecoveryStatus.IN_PROGRESS] },
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
  async getTransactions(merchantId: string, params: TransactionFilterParams & { paymentStatus?: string; recoveryStatus?: string; needsAttention?: boolean }) {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      paymentStatus,
      recoveryStatus,
      needsAttention,
      decision,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;
    const whereClause: any = { merchantId };

    if (status) {
      whereClause.status = status;
    }

    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
    }

    if (recoveryStatus) {
      whereClause.recoveryStatus = recoveryStatus;
    }

    if (needsAttention) {
      whereClause.OR = [
        { recoveryStatus: TransactionRecoveryStatus.REQUIRES_REVIEW },
        {
          AND: [
            { status: TransactionStatus.FAILED },
            { retryCount: { gte: 3 } },
            { recoveryStatus: { not: TransactionRecoveryStatus.RECOVERED } },
          ],
        },
      ];
    }

    if (decision) {
      whereClause.aiDecisions = {
        some: {
          agentType: AIAgentType.RECOVERY_DECISION,
          decision: decision as RecoveryDecision,
        },
      };
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

    const [total, items] = await Promise.all([
      this.db.transaction.count({ where: whereClause }),
      this.db.transaction.findMany({
        where: whereClause,
        include: {
          customer: true,
          aiDecisions: {
            where: { agentType: AIAgentType.RECOVERY_DECISION },
            orderBy: { createdAt: 'desc' },
            take: 1,
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

    return {
      total,
      items,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves single transaction by ID with full lifecycle context under strict tenant boundary.
   */
  async getTransactionDetail(merchantId: string | undefined, id: string) {
    const transaction = await this.db.transaction.findFirst({
      where: merchantId ? { id, merchantId } : { id },
      include: {
        customer: true,
        merchant: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        aiDecisions: {
          orderBy: { createdAt: 'asc' },
        },
        recoveryAttempts: {
          orderBy: { attemptNumber: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!transaction) return null;

    // Customer historical stats scoped strictly to the same merchant
    const [customerTotal, customerSuccess, customerFailed] = await Promise.all([
      this.db.transaction.count({
        where: { customerId: transaction.customerId, merchantId: transaction.merchantId },
      }),
      this.db.transaction.count({
        where: {
          customerId: transaction.customerId,
          merchantId: transaction.merchantId,
          status: TransactionStatus.SUCCESS,
        },
      }),
      this.db.transaction.count({
        where: {
          customerId: transaction.customerId,
          merchantId: transaction.merchantId,
          status: TransactionStatus.FAILED,
        },
      }),
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
  async getRecoveries(merchantId: string, params: RecoveryFilterParams & { needsAttention?: boolean }) {
    const { page = 1, limit = 25, status, actionType, search, needsAttention } = params;
    const skip = (page - 1) * limit;

    const whereClause: any = { merchantId };

    if (status) whereClause.status = status;
    if (actionType) whereClause.actionType = actionType;

    if (needsAttention) {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      whereClause.status = RecoveryStatus.PENDING;
      whereClause.createdAt = { lte: thirtyMinsAgo };
    }

    if (search) {
      whereClause.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { transactionId: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
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
   * Retrieves single recovery attempt by ID under strict tenant boundary.
   */
  async getRecoveryById(merchantId: string | undefined, id: string) {
    return this.db.recoveryAttempt.findFirst({
      where: merchantId ? { id, merchantId } : { id },
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

    return decisions
      .filter((d) => d.decision !== null)
      .map((d) => ({
        decision: d.decision as RecoveryDecision,
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
  async getAuditLogs(
    merchantId: string,
    params: {
      page?: number;
      limit?: number;
      entityType?: string;
      action?: string;
      transactionId?: string;
    }
  ) {
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
   * Retrieves Razorpay webhook status summary with health stats.
   */
  async getRazorpayStatusSummary() {
    const [totalWebhooks, processedCount, failedCount, lastWebhook] = await Promise.all([
      this.db.razorpayWebhookEvent.count(),
      this.db.razorpayWebhookEvent.count({
        where: { status: WebhookProcessingStatus.PROCESSED },
      }),
      this.db.razorpayWebhookEvent.count({
        where: { status: WebhookProcessingStatus.FAILED },
      }),
      this.db.razorpayWebhookEvent.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const successRate =
      totalWebhooks > 0 ? Number(((processedCount / totalWebhooks) * 100).toFixed(2)) : 100;

    return {
      totalWebhooks,
      processedCount,
      failedCount,
      successRate,
      lastWebhookAt: lastWebhook?.createdAt ? lastWebhook.createdAt.toISOString() : null,
      lastEventType: lastWebhook?.eventType || null,
      lastStatus: lastWebhook?.status || null,
    };
  }
}
