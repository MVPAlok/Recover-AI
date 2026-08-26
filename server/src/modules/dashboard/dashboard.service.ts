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
   * Resolves effective merchant ID (validates merchant context or throws authorization error).
   */
  async resolveMerchantId(merchantId?: string): Promise<string> {
    if (!merchantId) {
      throw new Error('Merchant tenant identification header (x-merchant-id) is required.');
    }
    const merchant = await this.repo.getMerchant(merchantId);
    if (!merchant) {
      throw new Error(`Merchant tenant ${merchantId} not found.`);
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
   * Creates a new merchant workspace with auto-seeded transactions.
   */
  async createMerchant(data: { name: string; email: string; currency?: string }) {
    return this.repo.createMerchantWithSeedData(data);
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
  async getRecoveryOpportunities(
    merchantId?: string,
    limit = 10
  ): Promise<RecoveryOpportunity[]> {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const transactions = await this.repo.getRecoveryOpportunities(targetMerchantId, limit);

    return transactions.map((tx: any) => {
      const decisionObj = tx.aiDecisions.find(
        (d: any) => d.agentType === AIAgentType.RECOVERY_DECISION
      );
      const detectionObj = tx.aiDecisions.find((d: any) => d.agentType === AIAgentType.DETECTION);

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
  async getTransactions(
    merchantId: string | undefined,
    params: TransactionFilterParams & { paymentStatus?: string; recoveryStatus?: string; needsAttention?: boolean }
  ) {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const result = await this.repo.getTransactions(targetMerchantId, params);

    const mapped = result.items.map((tx: any) => {
      const decisionObj = tx.aiDecisions?.find(
        (d: any) => d.agentType === AIAgentType.RECOVERY_DECISION
      );
      const detectionObj = tx.aiDecisions?.find((d: any) => d.agentType === AIAgentType.DETECTION);

      const recoveryProbability =
        decisionObj?.recoveryProbability ?? detectionObj?.recoveryProbability ?? 0.5;

      const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
        recoveryProbability >= 0.75 ? 'LOW' : recoveryProbability >= 0.4 ? 'MEDIUM' : 'HIGH';

      const latestAttempt = tx.recoveryAttempts?.[0];

      return {
        id: tx.id,
        customerId: tx.customerId,
        customerName: tx.customer?.name || 'Customer',
        customerEmail: tx.customer?.email || '',
        amount: Number(tx.amount),
        currency: tx.currency,
        status: tx.status,
        paymentStatus: tx.paymentStatus,
        recoveryStatus: tx.recoveryStatus,
        failureCode: tx.failureCode,
        failureReason: tx.failureReason,
        retryCount: tx.retryCount,
        recoveryProbability: Number((recoveryProbability * 100).toFixed(1)),
        riskLevel,
        decision: decisionObj?.decision || null,
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
  async getTransactionDetail(
    merchantId: string | undefined,
    transactionId: string
  ): Promise<TransactionDetail> {
    const data = await this.repo.getTransactionDetail(merchantId, transactionId);

    if (!data) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const { transaction: tx, customerStats } = data;

    const detectionObj = tx.aiDecisions.find((d: any) => d.agentType === AIAgentType.DETECTION);
    const diagnosisObj = tx.aiDecisions.find((d: any) => d.agentType === AIAgentType.DIAGNOSIS);
    const decisionObj = tx.aiDecisions.find(
      (d: any) => d.agentType === AIAgentType.RECOVERY_DECISION
    );

    // Extract factors safely
    let positiveFactors: string[] = [];
    let riskFactors: string[] = [];
    if (detectionObj?.reasoning) {
      const parts = detectionObj.reasoning.split('Risk factors:');
      if (parts[0]) {
        positiveFactors = parts[0]
          .replace('Positive signals:', '')
          .split(';')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      if (parts[1]) {
        riskFactors = parts[1]
          .split(';')
          .map((s: string) => s.trim())
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
      paymentStatus: tx.paymentStatus,
      recoveryStatus: tx.recoveryStatus,
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
            recoveryProbability: Number((prob * 100).toFixed(1)),
            confidenceScore: Number(((detectionObj.confidenceScore || 0.8) * 100).toFixed(1)),
            riskLevel,
            reasoning: detectionObj.reasoning,
            positiveFactors,
            riskFactors,
            createdAt: detectionObj.createdAt.toISOString(),
          }
        : null,
      diagnosis: diagnosisObj
        ? {
            id: diagnosisObj.id,
            diagnosisCode: 'TEMPORARY_GATEWAY_TIMEOUT',
            failureCategory: 'TEMPORARY_INFRASTRUCTURE',
            severity: 'LOW',
            isLikelyTemporary: true,
            confidence: Number(((diagnosisObj.confidenceScore || 0.85) * 100).toFixed(1)),
            reasoning: diagnosisObj.reasoning || tx.failureReason,
            evidence: [tx.failureReason || 'Gateway timeout response code returned'].filter(Boolean),
            modelName: diagnosisObj.modelName || 'gemini-3.5-flash-lite',
            isFallback: diagnosisObj.isFallback ?? false,
            latencyMs: diagnosisObj.latencyMs ?? null,
            createdAt: diagnosisObj.createdAt.toISOString(),
          }
        : null,
      decision: decisionObj
        ? {
            id: decisionObj.id,
            decision: decisionObj.decision || RecoveryDecision.RETRY,
            recoveryProbability: Number(
              ((decisionObj.recoveryProbability || prob) * 100).toFixed(1)
            ),
            confidenceScore: Number(((decisionObj.confidenceScore || 0.9) * 100).toFixed(1)),
            reasoning: decisionObj.reasoning,
            ruleTrail: ['RULE_TEMPORARY_TIMEOUT_RETRY', 'SAFETY_GUARDRAIL_MAX_RETRIES_CHECK'],
            createdAt: decisionObj.createdAt.toISOString(),
          }
        : null,
      recoveryAttempts: (tx.recoveryAttempts || []).map((att: any) => ({
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
      payments: (tx.payments || []).map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        capturedAmount: p.capturedAmount !== null && p.capturedAmount !== undefined ? Number(p.capturedAmount) : null,
        verified: p.verified,
        reconciled: p.reconciled,
        razorpayOrderId: p.razorpayOrderId,
        razorpayPaymentId: p.razorpayPaymentId,
        failureCode: p.failureCode,
        failureReason: p.failureReason,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      auditLogs: (tx.auditLogs || []).map((log: any) => ({
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

    const mapped = result.items.map((attempt: any) => ({
      id: attempt.id,
      transactionId: attempt.transactionId,
      customerName: attempt.transaction.customer.name,
      customerEmail: attempt.transaction.customer.email,
      amount: Number(attempt.transaction.amount),
      currency: attempt.transaction.currency,
      actionType: attempt.actionType,
      status: attempt.status,
      reason: attempt.reason,
      amountRecovered: Number(attempt.amountRecovered),
      executedAt: attempt.executedAt?.toISOString() || null,
      createdAt: attempt.createdAt.toISOString(),
    }));

    return {
      items: mapped,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Retrieves single recovery attempt details by ID.
   */
  async getRecoveryDetail(merchantId: string | undefined, recoveryId: string) {
    const recovery = await this.repo.getRecoveryById(merchantId, recoveryId);

    if (!recovery) {
      throw new Error(`Recovery attempt ${recoveryId} not found`);
    }

    return {
      id: recovery.id,
      merchantId: recovery.merchantId,
      transactionId: recovery.transactionId,
      attemptNumber: recovery.attemptNumber,
      actionType: recovery.actionType,
      status: recovery.status,
      reason: recovery.reason,
      amountRecovered: Number(recovery.amountRecovered),
      scheduledAt: recovery.scheduledAt?.toISOString() || null,
      executedAt: recovery.executedAt?.toISOString() || null,
      createdAt: recovery.createdAt.toISOString(),
      transaction: {
        id: recovery.transaction.id,
        amount: Number(recovery.transaction.amount),
        currency: recovery.transaction.currency,
        status: recovery.transaction.status,
        customer: recovery.transaction.customer,
      },
      aiDecision: recovery.aiDecision
        ? {
            id: recovery.aiDecision.id,
            decision: recovery.aiDecision.decision,
            confidenceScore: recovery.aiDecision.confidenceScore,
            reasoning: recovery.aiDecision.reasoning,
          }
        : null,
      auditLogs: recovery.auditLogs.map((l: any) => ({
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

    const [aggregates, failures, decisions, outcomes] = await Promise.all([
      this.repo.getOverviewAggregates(targetMerchantId),
      this.repo.getFailureBreakdown(targetMerchantId),
      this.repo.getDecisionBreakdown(targetMerchantId),
      this.repo.getRecoveryOutcomes(targetMerchantId),
    ]);

    const totalFailed = failures.reduce((sum, f) => sum + f.count, 0);
    const averageTxValue = totalFailed > 0 ? aggregates.revenueAtRisk / totalFailed : 0;

    const successfulRecoveriesCount =
      outcomes.find((o) => o.status === RecoveryStatus.SUCCESS)?.count || 0;
    const failedRecoveriesCount =
      outcomes.find((o) => o.status === RecoveryStatus.FAILED)?.count || 0;

    return {
      overview: {
        totalRevenueAtRisk: aggregates.revenueAtRisk,
        totalRecoveredRevenue: aggregates.recoveredRevenue,
        overallRecoveryRate: aggregates.recoveryRate,
        averageTransactionValue: Number(averageTxValue.toFixed(2)),
        successfulRecoveriesCount,
        failedRecoveriesCount,
      },
      failures,
      decisions,
      outcomes,
    };
  }

  /**
   * Retrieves paginated audit logs for a merchant.
   */
  async getAuditLogs(
    merchantId: string | undefined,
    params: {
      page?: number;
      limit?: number;
      entityType?: string;
      action?: string;
      transactionId?: string;
    }
  ) {
    const targetMerchantId = await this.resolveMerchantId(merchantId);
    const result = await this.repo.getAuditLogs(targetMerchantId, params);

    const mapped = result.logs.map((log: any) => ({
      id: log.id,
      merchantId: log.merchantId,
      transactionId: log.transactionId,
      recoveryAttemptId: log.recoveryAttemptId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      actor: log.actor,
      details: log.details as Record<string, unknown> | null,
      createdAt: log.createdAt.toISOString(),
      transaction: log.transaction
        ? {
            id: log.transaction.id,
            amount: Number(log.transaction.amount),
            status: log.transaction.status,
          }
        : null,
    }));

    return {
      items: mapped,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Retrieves Razorpay Test Mode integration & webhook status.
   */
  async getRazorpayIntegrationStatus(): Promise<RazorpayGatewayStatus> {
    const summary = await this.repo.getRazorpayStatusSummary();

    return {
      mode: 'TEST MODE',
      keyConfigured: Boolean(config.RAZORPAY_KEY_ID),
      webhookSecretConfigured: Boolean(config.RAZORPAY_WEBHOOK_SECRET),
      totalWebhooksProcessed: summary.totalWebhooks,
      lastWebhookAt: summary.lastWebhookAt,
      lastEventType: summary.lastEventType,
    };
  }
}
