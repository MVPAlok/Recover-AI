import { AIDecision } from '@prisma/client';
import {
  DiagnosisContext,
  SanitizedCustomerContext,
  SanitizedDetectionContext,
  SanitizedTransactionContext,
} from './diagnosis.types.js';

export interface DiagnosableTransaction {
  id: string;
  amount: number | string | { toString(): string };
  currency?: string;
  paymentMethod?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  retryCount?: number;
  createdAt: Date | string;
}

export interface DiagnosablePriorHistoryItem {
  id?: string;
  amount: number | string | { toString(): string };
  status: string;
  createdAt: Date | string;
}

export class DiagnosisContextBuilder {
  /**
   * Constructs a sanitized, secure DiagnosisContext for the LLM agent.
   */
  public static build(
    tx: DiagnosableTransaction,
    priorHistory: DiagnosablePriorHistoryItem[],
    detectionDecision?: Pick<
      AIDecision,
      'recoveryProbability' | 'confidenceScore' | 'reasoning' | 'decision'
    > | null
  ): DiagnosisContext {
    const transaction = this.sanitizeTransaction(tx);
    const customerHistory = this.sanitizeCustomerHistory(priorHistory);
    const detection = this.sanitizeDetection(detectionDecision);

    return {
      transaction,
      customerHistory,
      detection,
    };
  }

  private static sanitizeTransaction(tx: DiagnosableTransaction): SanitizedTransactionContext {
    return {
      id: tx.id,
      amount: Number(tx.amount),
      currency: tx.currency || 'INR',
      paymentMethod: tx.paymentMethod || null,
      failureCode: tx.failureCode || null,
      failureReason: tx.failureReason || null,
      retryCount: Math.max(0, tx.retryCount || 0),
      createdAt: new Date(tx.createdAt).toISOString(),
    };
  }

  private static sanitizeCustomerHistory(
    priorTxs: DiagnosablePriorHistoryItem[]
  ): SanitizedCustomerContext {
    const totalTransactions = priorTxs.length;

    if (totalTransactions === 0) {
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        successRate: 0.5,
        consecutiveFailures: 0,
        averageTransactionAmount: 0,
        lifetimeSpend: 0,
        hasHistory: false,
      };
    }

    let successfulCount = 0;
    let failedCount = 0;
    let totalSpend = 0;
    let totalAllAmount = 0;

    for (const item of priorTxs) {
      const amt = Number(item.amount);
      totalAllAmount += amt;
      if (item.status === 'SUCCESS') {
        successfulCount++;
        totalSpend += amt;
      } else if (item.status === 'FAILED') {
        failedCount++;
      }
    }

    // Sort descending by date to compute consecutive failure streak
    const sortedDesc = [...priorTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    let consecutiveFailures = 0;
    for (const item of sortedDesc) {
      if (item.status === 'FAILED') {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    return {
      totalTransactions,
      successfulTransactions: successfulCount,
      failedTransactions: failedCount,
      successRate: Number((successfulCount / totalTransactions).toFixed(4)),
      consecutiveFailures,
      averageTransactionAmount: Number((totalAllAmount / totalTransactions).toFixed(2)),
      lifetimeSpend: Number(totalSpend.toFixed(2)),
      hasHistory: true,
    };
  }

  private static sanitizeDetection(
    decision?: Pick<
      AIDecision,
      'recoveryProbability' | 'confidenceScore' | 'reasoning' | 'decision'
    > | null
  ): SanitizedDetectionContext | null {
    if (!decision || decision.recoveryProbability === null || decision.recoveryProbability === undefined) {
      return null;
    }

    const prob = Number(decision.recoveryProbability);
    const riskLevel = prob >= 0.75 ? 'LOW' : prob >= 0.45 ? 'MEDIUM' : 'HIGH';
    const recoverable = prob >= 0.45;

    // Parse simple bullet factors from reasoning if formatted
    const rawReasoning = decision.reasoning || '';
    const factors: string[] = [];
    if (rawReasoning.includes('Positive signals:')) {
      const posMatch = rawReasoning.match(/Positive signals:\s*([^.]+\.)/);
      if (posMatch) factors.push(posMatch[1].trim());
    }
    if (rawReasoning.includes('Risk factors:')) {
      const negMatch = rawReasoning.match(/Risk factors:\s*([^.]+\.)/);
      if (negMatch) factors.push(negMatch[1].trim());
    }
    if (factors.length === 0 && rawReasoning) {
      factors.push(rawReasoning.slice(0, 150));
    }

    return {
      recoveryProbability: prob,
      riskLevel,
      recoverable,
      factors,
      reasoningSummary: rawReasoning,
    };
  }
}
