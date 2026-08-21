import { AIAgentType, PrismaClient, Transaction, TransactionStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { DetectionResult } from './detection.types.js';

export class DetectionRepository {
  private db: PrismaClient;

  constructor(customPrisma?: PrismaClient) {
    this.db = customPrisma || prisma;
  }

  /**
   * Retrieves a single transaction with customer details by ID.
   */
  async getTransactionWithCustomer(transactionId: string) {
    return this.db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        merchant: true,
        aiDecisions: {
          where: { agentType: AIAgentType.DETECTION },
        },
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
   * Retrieves failed transactions that do not currently have a DETECTION AIDecision.
   */
  async getUnprocessedFailedTransactions(limit: number) {
    return this.db.transaction.findMany({
      where: {
        status: TransactionStatus.FAILED,
        aiDecisions: {
          none: {
            agentType: AIAgentType.DETECTION,
          },
        },
      },
      include: {
        customer: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Retrieves failed transactions (with customer included) up to a maximum limit.
   */
  async getFailedTransactions(limit: number) {
    return this.db.transaction.findMany({
      where: {
        status: TransactionStatus.FAILED,
      },
      include: {
        customer: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Batch fetches all historical transactions for a group of customer IDs to avoid N+1 queries.
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

    // Group by customerId in memory
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
   * Persists a single AIDecision record.
   */
  async persistAIDecision(result: DetectionResult) {
    return this.db.aIDecision.create({
      data: {
        merchantId: result.merchantId,
        transactionId: result.transactionId,
        agentType: AIAgentType.DETECTION,
        decision: result.recommendedDecision,
        recoveryProbability: result.recoveryProbability,
        confidenceScore: result.confidenceScore,
        reasoning: result.reasoningSummary,
        modelName: result.modelName,
        promptVersion: null,
      },
    });
  }

  /**
   * Batch persists multiple AIDecision records within a transaction or createMany.
   */
  async persistAIDecisionsBatch(results: DetectionResult[]) {
    if (results.length === 0) return { count: 0 };

    return this.db.aIDecision.createMany({
      data: results.map((r) => ({
        merchantId: r.merchantId,
        transactionId: r.transactionId,
        agentType: AIAgentType.DETECTION,
        decision: r.recommendedDecision,
        recoveryProbability: r.recoveryProbability,
        confidenceScore: r.confidenceScore,
        reasoning: r.reasoningSummary,
        modelName: r.modelName,
        promptVersion: null,
      })),
      skipDuplicates: true,
    });
  }
}
