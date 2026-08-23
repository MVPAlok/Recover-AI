import { AIAgentType, PrismaClient, TransactionStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { DiagnosisResult } from './diagnosis.types.js';

export class DiagnosisRepository {
  private db: PrismaClient;

  constructor(customPrisma?: PrismaClient) {
    this.db = customPrisma || prisma;
  }

  /**
   * Retrieves a single transaction with customer, merchant, and AI decisions.
   */
  async getTransactionWithDetails(transactionId: string) {
    return this.db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        merchant: true,
        aiDecisions: true,
      },
    });
  }

  /**
   * Fetches prior transactions for a customer prior to a given transaction date.
   */
  async getCustomerPriorTransactions(
    customerId: string,
    beforeDate: Date,
    excludeTransactionId?: string
  ) {
    return this.db.transaction.findMany({
      where: {
        customerId,
        createdAt: { lt: beforeDate },
        ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Retrieves failed transactions that have a DETECTION decision.
   * If unprocessedOnly is true, only returns those without a DIAGNOSIS decision.
   */
  async getCandidateTransactionsForDiagnosis(limit: number, unprocessedOnly = true) {
    return this.db.transaction.findMany({
      where: {
        status: TransactionStatus.FAILED,
        aiDecisions: {
          some: {
            agentType: AIAgentType.DETECTION,
          },
          ...(unprocessedOnly
            ? {
                none: {
                  agentType: AIAgentType.DIAGNOSIS,
                },
              }
            : {}),
        },
      },
      include: {
        customer: true,
        aiDecisions: {
          where: { agentType: AIAgentType.DETECTION },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Batch fetches all historical transactions for a list of customer IDs to avoid N+1 queries.
   */
  async getBatchCustomerHistory(customerIds: string[]) {
    const history = await this.db.transaction.findMany({
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    const historyMap = new Map<string, typeof history>();
    for (const item of history) {
      if (!historyMap.has(item.customerId)) {
        historyMap.set(item.customerId, []);
      }
      historyMap.get(item.customerId)!.push(item);
    }

    return historyMap;
  }

  /**
   * Persists a single DIAGNOSIS AIDecision record.
   */
  async persistDiagnosisDecision(result: DiagnosisResult) {
    const formattedReasoning = JSON.stringify({
      diagnosisCode: result.diagnosisCode,
      failureCategory: result.failureCategory,
      severity: result.severity,
      isLikelyTemporary: result.isLikelyTemporary,
      evidence: result.evidence,
      reasoning: result.reasoning,
      recommendedNextStep: result.recommendedNextStep,
    });

    return this.db.aIDecision.create({
      data: {
        merchantId: result.merchantId,
        transactionId: result.transactionId,
        agentType: AIAgentType.DIAGNOSIS,
        decision: result.preliminaryRecoveryDecision || null,
        recoveryProbability: null,
        confidenceScore: result.confidence,
        failureCategory: result.failureCategory,
        rootCause: result.diagnosisCode,
        riskLevel: result.severity,
        riskFactors: result.evidence as any,
        reasoning: formattedReasoning,
        modelName: result.modelName,
        promptVersion: result.promptVersion,
        isFallback: result.isFallback ?? false,
        latencyMs: result.latencyMs ?? null,
      },
    });
  }

  /**
   * Batch persists multiple DIAGNOSIS AIDecision records.
   */
  async persistDiagnosisDecisionsBatch(results: DiagnosisResult[]) {
    if (results.length === 0) return { count: 0 };

    return this.db.aIDecision.createMany({
      data: results.map((r) => ({
        merchantId: r.merchantId,
        transactionId: r.transactionId,
        agentType: AIAgentType.DIAGNOSIS,
        decision: r.preliminaryRecoveryDecision || null,
        recoveryProbability: null,
        confidenceScore: r.confidence,
        failureCategory: r.failureCategory,
        rootCause: r.diagnosisCode,
        riskLevel: r.severity,
        riskFactors: r.evidence as any,
        reasoning: JSON.stringify({
          diagnosisCode: r.diagnosisCode,
          failureCategory: r.failureCategory,
          severity: r.severity,
          isLikelyTemporary: r.isLikelyTemporary,
          evidence: r.evidence,
          reasoning: r.reasoning,
          recommendedNextStep: r.recommendedNextStep,
        }),
        modelName: r.modelName,
        promptVersion: r.promptVersion,
        isFallback: r.isFallback ?? false,
        latencyMs: r.latencyMs ?? null,
      })),
      skipDuplicates: true,
    });
  }
}
