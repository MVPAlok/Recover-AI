import { AIAgentType, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { DecisionResult } from './decision.types.js';

export class DecisionRepository {
  /**
   * Retrieves a single transaction with customer details and all prior AI decisions.
   */
  async getTransactionWithDetails(transactionId: string) {
    return prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        merchant: true,
        aiDecisions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Loads customer history strictly prior to the failed transaction.
   */
  async getCustomerPriorTransactions(
    customerId: string,
    beforeDate: Date,
    excludeTxId: string
  ) {
    return prisma.transaction.findMany({
      where: {
        customerId,
        id: { not: excludeTxId },
        createdAt: { lt: beforeDate },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves candidate FAILED transactions for decision processing.
   */
  async getCandidateTransactionsForDecision(limit = 25, unprocessedOnly = true) {
    const where: Prisma.TransactionWhereInput = {
      status: 'FAILED',
    };

    if (unprocessedOnly) {
      where.aiDecisions = {
        none: {
          agentType: AIAgentType.RECOVERY_DECISION,
        },
      };
    }

    return prisma.transaction.findMany({
      where,
      take: Math.min(100, Math.max(1, limit)),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        aiDecisions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Batch loads customer history for a set of customer IDs to eliminate N+1 latency.
   */
  async getBatchCustomerHistory(customerIds: string[]) {
    const records = await prisma.transaction.findMany({
      where: {
        customerId: { in: customerIds },
      },
      select: {
        id: true,
        customerId: true,
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const historyMap = new Map<string, typeof records>();
    for (const record of records) {
      const list = historyMap.get(record.customerId) || [];
      list.push(record);
      historyMap.set(record.customerId, list);
    }

    return historyMap;
  }

  /**
   * Persists a single Recovery Decision and its audit log entry in a transaction.
   */
  async persistRecoveryDecision(result: DecisionResult) {
    return prisma.$transaction(async (tx) => {
      const aiDecision = await tx.aIDecision.create({
        data: {
          merchantId: result.merchantId,
          transactionId: result.transactionId,
          agentType: AIAgentType.RECOVERY_DECISION,
          decision: result.decision,
          recoveryProbability: result.detectionProbability,
          confidenceScore: result.confidence,
          reasoning: result.reason,
          modelName: result.modelName,
          promptVersion: result.promptVersion || 'v1.0.0',
        },
      });

      const auditLog = await tx.auditLog.create({
        data: {
          merchantId: result.merchantId,
          transactionId: result.transactionId,
          entityType: 'AIDecision',
          entityId: aiDecision.id,
          action: 'RECOVERY_DECISION_CREATED',
          actor: 'RecoverAI:RecoveryDecisionEngine',
          details: {
            decision: result.decision,
            confidence: result.confidence,
            businessPriority: result.businessPriority,
            detectionProbability: result.detectionProbability,
            diagnosisConfidence: result.diagnosisConfidence,
            rulesApplied: result.rulesApplied,
            blockedActions: result.blockedActions,
            llmRecommendation: result.llmRecommendation,
            policyOverride: result.policyOverride,
            evaluatedAt: result.evaluatedAt,
          },
        },
      });

      return { aiDecision, auditLog };
    });
  }

  /**
   * Batch persists multiple Recovery Decisions and their audit logs using high-throughput createMany.
   */
  async persistRecoveryDecisionsBatch(results: DecisionResult[]) {
    if (results.length === 0) return { count: 0 };

    const decisionData = results.map((result) => ({
      merchantId: result.merchantId,
      transactionId: result.transactionId,
      agentType: AIAgentType.RECOVERY_DECISION,
      decision: result.decision,
      recoveryProbability: result.detectionProbability,
      confidenceScore: result.confidence,
      reasoning: result.reason,
      modelName: result.modelName,
      promptVersion: result.promptVersion || 'v1.0.0',
    }));

    const auditLogData = results.map((result) => ({
      merchantId: result.merchantId,
      transactionId: result.transactionId,
      entityType: 'AIDecision',
      entityId: result.transactionId,
      action: 'RECOVERY_DECISION_CREATED',
      actor: 'RecoverAI:RecoveryDecisionEngine',
      details: {
        decision: result.decision,
        confidence: result.confidence,
        businessPriority: result.businessPriority,
        detectionProbability: result.detectionProbability,
        diagnosisConfidence: result.diagnosisConfidence,
        rulesApplied: result.rulesApplied,
        blockedActions: result.blockedActions,
        llmRecommendation: result.llmRecommendation,
        policyOverride: result.policyOverride,
        evaluatedAt: result.evaluatedAt,
      },
    }));

    const [decisionRes] = await Promise.all([
      prisma.aIDecision.createMany({
        data: decisionData,
        skipDuplicates: true,
      }),
      prisma.auditLog.createMany({
        data: auditLogData,
      }),
    ]);

    return { count: decisionRes.count };
  }
}
