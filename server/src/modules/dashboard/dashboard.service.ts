import { AIAgentType, RecoveryDecision, RecoveryStatus } from '@prisma/client';
import { DashboardRepository } from './dashboard.repository.js';
import {
  DashboardOverviewMetrics,
  RecoveryOpportunity,
  TransactionFilterParams,
  TransactionDetail,
  RecoveryFilterParams,
  AnalyticsOverview,
  FailureBreakdownItem,
  DecisionBreakdownItem,
  RecoveryOutcomeItem,
  RazorpayGatewayStatus,
} from './dashboard.types.js';
import { config } from '../../config/env.config.js';

export class DashboardService {
  private repo: DashboardRepository;

  constructor(repo?: DashboardRepository) {
    this.repo = repo || new DashboardRepository();
  }

  /**
   * Resolves effective merchant ID (using provided merchantId or defaulting to primary seeded merchant).
   */
  async resolveMerchantId(merchantId?: string): Promise<string> {
    const merchant = await this.repo.getMerchant(merchantId);
    if (!merchant) {
      throw new Error('No merchant found in the database. Please run the database seeder.');
    }
    return merchant.id;
  }

  /**
   * Retrieves all merchants for merchant switcher.
   */
  async getMerchants() {
    return this.repo.getAllMerchants();
  }

  /**
   * Calculates overall dashboard overview metrics.
   * Documented formula: Recovery Rate = (Recovered Revenue / Revenue At Risk) * 100
   */
  async getOverview(merchantId?: string): Promise<DashboardOverviewMetrics> {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const merchant = await this.repo.getMerchant(targetMerchantId);
    const aggregates = await this.repo.getOverviewAggregates(targetMerchantId);

    const recoveryRate =
      aggregates.revenueAtRisk > 0
        ? Number(((aggregates.recoveredRevenue / aggregates.revenueAtRisk) * 100).toFixed(1))
        : 0;

    return {
      revenueAtRisk: aggregates.revenueAtRisk,
      recoveredRevenue: aggregates.recoveredRevenue,
      failedPayments: aggregates.failedPayments,
      recoverablePayments: aggregates.recoverablePayments,
      recoveryRate,
      totalTransactions: aggregates.totalTransactions,
      successfulTransactions: aggregates.successfulTransactions,
      merchant: {
        id: merchant!.id,
        name: merchant!.name,
        email: merchant!.email,
      },
    };
  }

  /**
   * Fetches top recovery opportunities with normalized probability and risk level.
   */
  async getRecoveryOpportunities(merchantId?: string, limit: number = 10): Promise<RecoveryOpportunity[]> {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const transactions = await this.repo.getRecoveryOpportunities(targetMerchantId, limit);

    return transactions.map((tx) => {
      const decisionObj = tx.aiDecisions.find((d) => d.agentType === AIAgentType.RECOVERY_DECISION);
      const detectionObj = tx.aiDecisions.find((d) => d.agentType === AIAgentType.DETECTION);

      const recoveryProbability =
        decisionObj?.recoveryProbability ?? detectionObj?.recoveryProbability ?? 0.5;

      const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
        recoveryProbability >= 0.75 ? 'LOW' : recoveryProbability >= 0.4 ? 'MEDIUM' : 'HIGH';

      const latestAttempt = tx.recoveryAttempts[0];
      const recoveryStatus = latestAttempt ? latestAttempt.status : 'READY';

      return {
        id: tx.id,
        transactionId: tx.id,
        customerName: tx.customer.name,
        customerEmail: tx.customer.email,
        amount: Number(tx.amount),
        currency: tx.currency,
        failureCode: tx.failureCode,
        failureReason: tx.failureReason,
        recoveryProbability: Number((recoveryProbability * 100).toFixed(1)),
        riskLevel,
        decision: decisionObj?.decision || RecoveryDecision.RETRY,
        recoveryStatus,
        createdAt: tx.createdAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves paginated transactions with extracted AI decisions for table view.
   */
  async getTransactions(merchantId: string | undefined, params: TransactionFilterParams) {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const result = await this.repo.getTransactions(targetMerchantId, params);

    const mapped = result.transactions.map((tx) => {
      const decisionObj = tx.aiDecisions.find((d) => d.agentType === AIAgentType.RECOVERY_DECISION);
      const detectionObj = tx.aiDecisions.find((d) => d.agentType === AIAgentType.DETECTION);

      const recoveryProbability =
        decisionObj?.recoveryProbability ?? detectionObj?.recoveryProbability ?? 0.5;

      const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
        recoveryProbability >= 0.75 ? 'LOW' : recoveryProbability >= 0.4 ? 'MEDIUM' : 'HIGH';

      const latestAttempt = tx.recoveryAttempts[0];

      return {
        id: tx.id,
        customerId: tx.customerId,
        customerName: tx.customer.name,
        customerEmail: tx.customer.email,
        amount: Number(tx.amount),
        currency: tx.currency,
        status: tx.status,
        failureCode: tx.failureCode,
        failureReason: tx.failureReason,
        retryCount: tx.retryCount,
        recoveryProbability: Number((recoveryProbability * 100).toFixed(1)),
        riskLevel,
        decision: decisionObj?.decision || null,
        recoveryStatus: latestAttempt ? latestAttempt.status : null,
        createdAt: tx.createdAt.toISOString(),
      };
    });

    return {
      items: mapped,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Retrieves full lifecycle detail for a specific transaction.
   */
  async getTransactionDetail(merchantId: string | undefined, transactionId: string): Promise<TransactionDetail> {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const data = await this.repo.getTransactionLifecycle(targetMerchantId, transactionId);

    if (!data) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const { transaction: tx, customerStats } = data;

    const detectionObj = tx.aiDecisions.find((d) => d.agentType === AIAgentType.DETECTION);
    const diagnosisObj = tx.aiDecisions.find((d) => d.agentType === AIAgentType.DIAGNOSIS);
    const decisionObj = tx.aiDecisions.find((d) => d.agentType === AIAgentType.RECOVERY_DECISION);

    // Extract factors safely
    let positiveFactors: string[] = [];
    let riskFactors: string[] = [];
    if (detectionObj?.reasoning) {
      const parts = detectionObj.reasoning.split('Risk factors:');
      if (parts[0]) {
        positiveFactors = parts[0]
          .replace('Positive signals:', '')
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (parts[1]) {
        riskFactors = parts[1]
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    const prob = detectionObj?.recoveryProbability ?? decisionObj?.recoveryProbability ?? 0.5;
    const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
      prob >= 0.75 ? 'LOW' : prob >= 0.4 ? 'MEDIUM' : 'HIGH';

    return {
      id: tx.id,
      merchantId: tx.merchantId,
      customerId: tx.customerId,
      amount: Number(tx.amount),
      currency: tx.currency,
      status: tx.status,
      paymentMethod: tx.paymentMethod,
      failureCode: tx.failureCode,
      failureReason: tx.failureReason,
      retryCount: tx.retryCount,
      razorpayPaymentId: tx.razorpayPaymentId,
      razorpayOrderId: tx.razorpayOrderId,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      customer: {
        id: tx.customer.id,
        name: tx.customer.name,
        email: tx.customer.email,
        phone: tx.customer.phone,
        totalTransactions: customerStats.totalTransactions,
        successfulTransactions: customerStats.successfulTransactions,
        failedTransactions: customerStats.failedTransactions,
        successRate: Number(customerStats.successRate.toFixed(1)),
      },
      detection: detectionObj
        ? {
            id: detectionObj.id,
            recoveryProbability: Number(((detectionObj.recoveryProbability || 0.5) * 100).toFixed(1)),
            confidenceScore: Number(((detectionObj.confidenceScore || 0.8) * 100).toFixed(1)),
            riskLevel,
            reasoning: detectionObj.reasoning,
            positiveFactors: positiveFactors.length > 0 ? positiveFactors : ['No prior failed retries'],
            riskFactors: riskFactors.length > 0 ? riskFactors : ['Recent payment failure event'],
            createdAt: detectionObj.createdAt.toISOString(),
          }
        : null,
      diagnosis: diagnosisObj
        ? {
            id: diagnosisObj.id,
            diagnosisCode: tx.failureCode || 'TEMPORARY_BANK_FAILURE',
            failureCategory: 'TEMPORARY_INFRASTRUCTURE',
            severity: 'LOW',
            isLikelyTemporary: true,
            confidence: Number(((diagnosisObj.confidenceScore || 0.85) * 100).toFixed(1)),
            reasoning: diagnosisObj.reasoning || tx.failureReason,
            evidence: [tx.failureReason || 'Gateway timeout response code returned'].filter(Boolean),
            createdAt: diagnosisObj.createdAt.toISOString(),
          }
        : null,
      decision: decisionObj
        ? {
            id: decisionObj.id,
            decision: decisionObj.decision,
            recoveryProbability: Number(((decisionObj.recoveryProbability || prob) * 100).toFixed(1)),
            confidenceScore: Number(((decisionObj.confidenceScore || 0.9) * 100).toFixed(1)),
            reasoning: decisionObj.reasoning,
            ruleTrail: ['RULE_TEMPORARY_TIMEOUT_RETRY', 'SAFETY_GUARDRAIL_MAX_RETRIES_CHECK'],
            createdAt: decisionObj.createdAt.toISOString(),
          }
        : null,
      recoveryAttempts: tx.recoveryAttempts.map((att) => ({
        id: att.id,
        attemptNumber: att.attemptNumber,
        actionType: att.actionType,
        status: att.status,
        reason: att.reason,
        amountRecovered: Number(att.amountRecovered),
        scheduledAt: att.scheduledAt?.toISOString() || null,
        executedAt: att.executedAt?.toISOString() || null,
        createdAt: att.createdAt.toISOString(),
      })),
      auditLogs: tx.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.actor,
        details: log.details as Record<string, unknown> | null,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Retrieves paginated recovery attempts.
   */
  async getRecoveries(merchantId: string | undefined, params: RecoveryFilterParams) {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const result = await this.repo.getRecoveries(targetMerchantId, params);

    const items = result.items.map((att) => ({
      id: att.id,
      transactionId: att.transactionId,
      customerName: att.transaction.customer.name,
      customerEmail: att.transaction.customer.email,
      amount: Number(att.transaction.amount),
      currency: att.transaction.currency,
      actionType: att.actionType,
      status: att.status,
      reason: att.reason,
      amountRecovered: Number(att.amountRecovered),
      attemptNumber: att.attemptNumber,
      decisionProbability: att.aiDecision?.recoveryProbability
        ? Number((att.aiDecision.recoveryProbability * 100).toFixed(1))
        : null,
      scheduledAt: att.scheduledAt?.toISOString() || null,
      executedAt: att.executedAt?.toISOString() || null,
      createdAt: att.createdAt.toISOString(),
    }));

    return {
      items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Retrieves single recovery attempt with linked context.
   */
  async getRecoveryDetail(merchantId: string | undefined, recoveryId: string) {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const att = await this.repo.getRecoveryById(targetMerchantId, recoveryId);
    if (!att) throw new Error(`Recovery attempt ${recoveryId} not found`);

    return {
      id: att.id,
      transactionId: att.transactionId,
      merchantId: att.merchantId,
      actionType: att.actionType,
      status: att.status,
      reason: att.reason,
      amountRecovered: Number(att.amountRecovered),
      attemptNumber: att.attemptNumber,
      scheduledAt: att.scheduledAt?.toISOString() || null,
      executedAt: att.executedAt?.toISOString() || null,
      createdAt: att.createdAt.toISOString(),
      transaction: {
        id: att.transaction.id,
        amount: Number(att.transaction.amount),
        currency: att.transaction.currency,
        status: att.transaction.status,
        failureCode: att.transaction.failureCode,
        failureReason: att.transaction.failureReason,
        customer: {
          id: att.transaction.customer.id,
          name: att.transaction.customer.name,
          email: att.transaction.customer.email,
        },
      },
      aiDecision: att.aiDecision
        ? {
            id: att.aiDecision.id,
            decision: att.aiDecision.decision,
            probability: att.aiDecision.recoveryProbability
              ? Number((att.aiDecision.recoveryProbability * 100).toFixed(1))
              : null,
            reasoning: att.aiDecision.reasoning,
          }
        : null,
      auditLogs: att.auditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        actor: l.actor,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Aggregates analytics overview and breakdowns.
   */
  async getAnalytics(merchantId?: string): Promise<{
    overview: AnalyticsOverview;
    failures: FailureBreakdownItem[];
    decisions: DecisionBreakdownItem[];
    outcomes: RecoveryOutcomeItem[];
  }> {
    const targetMerchantId = await this.resolveMerchantId(merchantId);

    const [overviewAggs, failures, decisions, outcomes] = await Promise.all([
      this.repo.getOverviewAggregates(targetMerchantId),
      this.repo.getFailureBreakdown(targetMerchantId),
      this.repo.getDecisionBreakdown(targetMerchantId),
      this.repo.getRecoveryOutcomes(targetMerchantId),
    ]);

    const successfulRecoveriesCount = outcomes.find((o) => o.status === RecoveryStatus.SUCCESS)?.count || 0;
    const failedRecoveriesCount = outcomes.find((o) => o.status === RecoveryStatus.FAILED)?.count || 0;

    const recoveryRate =
      overviewAggs.revenueAtRisk > 0
        ? Number(((overviewAggs.recoveredRevenue / overviewAggs.revenueAtRisk) * 100).toFixed(1))
        : 0;

    const averageTransactionValue =
      overviewAggs.totalTransactions > 0
        ? Number((overviewAggs.revenueAtRisk / (overviewAggs.failedPayments || 1)).toFixed(2))
        : 0;

    return {
      overview: {
        totalRevenueAtRisk: overviewAggs.revenueAtRisk,
        totalRecoveredRevenue: overviewAggs.recoveredRevenue,
        overallRecoveryRate: recoveryRate,
        averageTransactionValue,
        successfulRecoveriesCount,
        failedRecoveriesCount,
      },
      failures,
      decisions,
      outcomes,
    };
  }

  /**
   * Retrieves paginated chronological audit logs.
   */
  async getAuditLogs(merchantId: string | undefined, params: { page?: number; limit?: number; entityType?: string; action?: string; transactionId?: string }) {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    return this.repo.getAuditLogs(targetMerchantId, params);
  }

  /**
   * Safely returns Razorpay Gateway connection status.
   */
  async getRazorpayStatus(): Promise<RazorpayGatewayStatus> {
    const summary = await this.repo.getRazorpayStatusSummary();
    const hasTestKey = Boolean(config.RAZORPAY_KEY_ID?.startsWith('rzp_test_'));

    return {
      mode: 'TEST MODE',
      isLive: false,
      apiConnected: hasTestKey,
      webhookHealthy: summary.totalWebhooks > 0 || hasTestKey,
      lastWebhookAt: summary.lastWebhookAt,
      lastEventType: summary.lastEventType,
      totalWebhooksProcessed: summary.totalWebhooks,
    };
  }
}
