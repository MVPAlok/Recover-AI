import {
  CustomerHistoryFeatures,
  DetectionFeatures,
  FailureCategory,
  TransactionFeatures,
} from './detection.types.js';
import { FAILURE_CATEGORY_MAP } from './scoring-config.js';

export interface ExtractableTransaction {
  id?: string;
  amount: number | string | { toString(): string };
  currency?: string;
  paymentMethod?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  retryCount?: number;
  createdAt: Date | string;
}

export interface ExtractablePriorTransaction {
  id?: string;
  amount: number | string | { toString(): string };
  status: string;
  createdAt: Date | string;
}

export class FeatureExtractor {
  /**
   * Extracts detection features from a target transaction and prior customer history.
   *
   * @param currentTx The failed transaction being analyzed
   * @param priorTransactions Historical transactions of the customer prior to currentTx
   */
  public static extract(
    currentTx: ExtractableTransaction,
    priorTransactions: ExtractablePriorTransaction[]
  ): DetectionFeatures {
    const transactionFeatures = this.extractTransactionFeatures(currentTx);
    const historyFeatures = this.extractCustomerHistory(priorTransactions);
    const failureCategory = this.classifyFailureCode(currentTx.failureCode || null);

    return {
      ...transactionFeatures,
      ...historyFeatures,
      failureCategory,
    };
  }

  private static extractTransactionFeatures(tx: ExtractableTransaction): TransactionFeatures {
    const now = new Date();
    const txCreatedAt = new Date(tx.createdAt);
    const ageHours = Math.max(0, (now.getTime() - txCreatedAt.getTime()) / (1000 * 60 * 60));

    return {
      amount: Number(tx.amount),
      currency: tx.currency || 'INR',
      paymentMethod: tx.paymentMethod || null,
      failureCode: tx.failureCode || null,
      failureReason: tx.failureReason || null,
      retryCount: Math.max(0, tx.retryCount || 0),
      transactionAgeHours: Number(ageHours.toFixed(2)),
    };
  }

  private static extractCustomerHistory(
    priorTxs: ExtractablePriorTransaction[]
  ): CustomerHistoryFeatures {
    const totalTransactions = priorTxs.length;

    if (totalTransactions === 0) {
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        successRate: 0.5, // Neutral baseline for new customers
        failureRate: 0.0,
        consecutiveFailures: 0,
        averageTransactionAmount: 0,
        historicalSpend: 0,
        hasHistory: false,
      };
    }

    let successfulCount = 0;
    let failedCount = 0;
    let totalSpend = 0;
    let totalAllAmount = 0;

    for (const tx of priorTxs) {
      const amt = Number(tx.amount);
      totalAllAmount += amt;

      if (tx.status === 'SUCCESS') {
        successfulCount++;
        totalSpend += amt;
      } else if (tx.status === 'FAILED') {
        failedCount++;
      }
    }

    // Sort descending by date to calculate consecutive failures streak
    const sortedDesc = [...priorTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    let consecutiveFailures = 0;
    for (const tx of sortedDesc) {
      if (tx.status === 'FAILED') {
        consecutiveFailures++;
      } else {
        break; // Stop at first non-failed transaction
      }
    }

    return {
      totalTransactions,
      successfulTransactions: successfulCount,
      failedTransactions: failedCount,
      successRate: Number((successfulCount / totalTransactions).toFixed(4)),
      failureRate: Number((failedCount / totalTransactions).toFixed(4)),
      consecutiveFailures,
      averageTransactionAmount: Number((totalAllAmount / totalTransactions).toFixed(2)),
      historicalSpend: Number(totalSpend.toFixed(2)),
      hasHistory: true,
    };
  }

  public static classifyFailureCode(failureCode: string | null): FailureCategory {
    if (!failureCode) {
      return 'UNKNOWN';
    }
    return FAILURE_CATEGORY_MAP[failureCode] || 'UNKNOWN';
  }
}
