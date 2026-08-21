import { RecoveryDecision } from '@prisma/client';
import {
  DetectionFactor,
  DetectionFeatures,
  DetectionResult,
  RiskLevel,
  ScoringBreakdown,
} from './detection.types.js';
import { SCORING_CONFIG } from './scoring-config.js';

export class ScoringEngine {
  /**
   * Evaluates features and returns a deterministic, explainable DetectionResult.
   */
  public static evaluate(
    transactionId: string,
    merchantId: string,
    customerId: string,
    features: DetectionFeatures
  ): DetectionResult {
    const factors: DetectionFactor[] = [];
    const breakdown = this.calculateBreakdown(features, factors);

    let finalProbability = breakdown.finalProbability;

    // Apply safety guardrail for excessive retries
    if (features.retryCount >= SCORING_CONFIG.MAX_RETRY_LIMIT) {
      if (finalProbability > SCORING_CONFIG.MAX_RETRY_PROBABILITY_CAP) {
        finalProbability = SCORING_CONFIG.MAX_RETRY_PROBABILITY_CAP;
      }
    }

    finalProbability = Number(Math.max(0.02, Math.min(0.98, finalProbability)).toFixed(3));

    // Risk level semantics
    const riskLevel: RiskLevel =
      finalProbability >= SCORING_CONFIG.THRESHOLDS.HIGH_PROBABILITY
        ? 'LOW'
        : finalProbability >= SCORING_CONFIG.THRESHOLDS.MEDIUM_PROBABILITY
        ? 'MEDIUM'
        : 'HIGH';

    const recoverable = finalProbability >= SCORING_CONFIG.THRESHOLDS.RECOVERABLE_CUTOFF;

    // Preliminary recovery decision recommendation
    let recommendedDecision: RecoveryDecision = RecoveryDecision.WAIT;
    if (features.retryCount >= SCORING_CONFIG.MAX_RETRY_LIMIT || finalProbability < 0.40) {
      recommendedDecision = RecoveryDecision.STOP;
    } else if (finalProbability >= SCORING_CONFIG.THRESHOLDS.HIGH_PROBABILITY) {
      recommendedDecision = RecoveryDecision.RETRY;
    } else {
      recommendedDecision = RecoveryDecision.WAIT;
    }

    const confidenceScore = this.calculateConfidence(features);
    const reasoningSummary = this.buildReasoningSummary(finalProbability, riskLevel, factors);

    return {
      transactionId,
      merchantId,
      customerId,
      recoverable,
      recoveryProbability: finalProbability,
      confidenceScore,
      riskLevel,
      recommendedDecision,
      features,
      factors,
      reasoningSummary,
      scoredAt: new Date().toISOString(),
      modelName: SCORING_CONFIG.MODEL_NAME,
    };
  }

  private static calculateBreakdown(
    features: DetectionFeatures,
    factors: DetectionFactor[]
  ): ScoringBreakdown {
    const baseScore = SCORING_CONFIG.BASE_SCORE;

    // 1. Customer Reliability Component
    let customerReliabilityModifier = 0;
    if (features.hasHistory && features.totalTransactions > 0) {
      const historyCredibility = Math.min(
        1.0,
        features.totalTransactions / SCORING_CONFIG.MIN_TRANSACTIONS_FOR_FULL_RELIABILITY
      );
      customerReliabilityModifier =
        (features.successRate - 0.5) *
        SCORING_CONFIG.CUSTOMER_RELIABILITY_WEIGHT *
        historyCredibility;

      if (features.successRate >= 0.80) {
        factors.push({
          factor: 'CUSTOMER_HISTORY',
          impact: 'POSITIVE',
          description: `Customer has strong history with ${(features.successRate * 100).toFixed(0)}% success rate across ${features.totalTransactions} past transactions.`,
          scoreContribution: Number(customerReliabilityModifier.toFixed(3)),
        });
      } else if (features.successRate < 0.50) {
        factors.push({
          factor: 'CUSTOMER_HISTORY',
          impact: 'NEGATIVE',
          description: `Customer has poor payment history with ${(features.failureRate * 100).toFixed(0)}% failure rate.`,
          scoreContribution: Number(customerReliabilityModifier.toFixed(3)),
        });
      } else {
        factors.push({
          factor: 'CUSTOMER_HISTORY',
          impact: 'NEUTRAL',
          description: `Customer has moderate payment history (${(features.successRate * 100).toFixed(0)}% success rate).`,
          scoreContribution: Number(customerReliabilityModifier.toFixed(3)),
        });
      }
    } else {
      factors.push({
        factor: 'CUSTOMER_HISTORY',
        impact: 'NEUTRAL',
        description: 'New customer with no prior transaction history.',
        scoreContribution: 0,
      });
    }

    // 2. Failure Category Component
    const failureCategoryModifier =
      SCORING_CONFIG.CATEGORY_MODIFIERS[features.failureCategory] ?? -0.10;

    switch (features.failureCategory) {
      case 'TEMPORARY_INFRASTRUCTURE':
        factors.push({
          factor: 'FAILURE_TYPE',
          impact: 'POSITIVE',
          description: `Failure code '${features.failureCode || 'UNKNOWN'}' represents a temporary infrastructure or network timeout.`,
          scoreContribution: failureCategoryModifier,
        });
        break;
      case 'CUSTOMER_AUTHENTICATION':
        factors.push({
          factor: 'FAILURE_TYPE',
          impact: 'POSITIVE',
          description: `Authentication or OTP challenge failed (${features.failureCode}); recoverable with customer notification.`,
          scoreContribution: failureCategoryModifier,
        });
        break;
      case 'FINANCIAL_HARD':
        factors.push({
          factor: 'FAILURE_TYPE',
          impact: 'NEGATIVE',
          description: `Hard financial decline (${features.failureCode}: ${features.failureReason || 'Declined'}).`,
          scoreContribution: failureCategoryModifier,
        });
        break;
      case 'INSTRUMENT_EXPIRATION':
        factors.push({
          factor: 'FAILURE_TYPE',
          impact: 'NEGATIVE',
          description: 'Payment card is expired; standard retries will not succeed.',
          scoreContribution: failureCategoryModifier,
        });
        break;
      default:
        factors.push({
          factor: 'FAILURE_TYPE',
          impact: 'NEGATIVE',
          description: `Unrecognized or missing failure code: ${features.failureCode || 'None'}.`,
          scoreContribution: failureCategoryModifier,
        });
    }

    // 3. Retry Count Component
    let retryModifier = 0;
    if (features.retryCount === 0) {
      retryModifier = SCORING_CONFIG.RETRY_PENALTIES[0];
      factors.push({
        factor: 'RETRY_HISTORY',
        impact: 'POSITIVE',
        description: 'Fresh failure with 0 previous retry attempts.',
        scoreContribution: retryModifier,
      });
    } else if (features.retryCount === 1) {
      retryModifier = SCORING_CONFIG.RETRY_PENALTIES[1];
      factors.push({
        factor: 'RETRY_HISTORY',
        impact: 'NEUTRAL',
        description: 'Transaction has undergone 1 previous retry attempt.',
        scoreContribution: retryModifier,
      });
    } else if (features.retryCount === 2) {
      retryModifier = SCORING_CONFIG.RETRY_PENALTIES[2];
      factors.push({
        factor: 'RETRY_HISTORY',
        impact: 'NEGATIVE',
        description: 'Transaction has failed after 2 retry attempts.',
        scoreContribution: retryModifier,
      });
    } else {
      retryModifier = SCORING_CONFIG.RETRY_PENALTIES[3];
      factors.push({
        factor: 'RETRY_HISTORY',
        impact: 'NEGATIVE',
        description: `Retry threshold exceeded (${features.retryCount} retries); recovery opportunity severely degraded.`,
        scoreContribution: retryModifier,
      });
    }

    // 4. Consecutive Failures & Repeated Hard Decline Component
    let consecutiveFailureModifier = 0;
    if (features.consecutiveFailures >= 2) {
      consecutiveFailureModifier -= 0.08 * (features.consecutiveFailures - 1);
      factors.push({
        factor: 'FAILURE_STREAK',
        impact: 'NEGATIVE',
        description: `Customer is on a streak of ${features.consecutiveFailures} consecutive payment failures.`,
        scoreContribution: Number(consecutiveFailureModifier.toFixed(3)),
      });
    }

    if (
      features.failureCode === 'INSUFFICIENT_FUNDS' &&
      features.consecutiveFailures >= 1
    ) {
      consecutiveFailureModifier += SCORING_CONFIG.REPEATED_INSUFFICIENT_FUNDS_PENALTY;
      factors.push({
        factor: 'REPEAT_INSUFFICIENT_FUNDS',
        impact: 'NEGATIVE',
        description: 'Repeated insufficient funds failure indicates persisting liquidity shortfall.',
        scoreContribution: SCORING_CONFIG.REPEATED_INSUFFICIENT_FUNDS_PENALTY,
      });
    }

    // 5. Payment Method & Amount Context
    const paymentMethodModifier = 0.0;
    const amountContextModifier = 0.0;

    const rawScore =
      baseScore +
      customerReliabilityModifier +
      failureCategoryModifier +
      retryModifier +
      consecutiveFailureModifier +
      paymentMethodModifier +
      amountContextModifier;

    return {
      baseScore,
      customerReliabilityModifier: Number(customerReliabilityModifier.toFixed(3)),
      failureCategoryModifier: Number(failureCategoryModifier.toFixed(3)),
      retryModifier: Number(retryModifier.toFixed(3)),
      paymentMethodModifier,
      consecutiveFailureModifier: Number(consecutiveFailureModifier.toFixed(3)),
      amountContextModifier,
      rawScore: Number(rawScore.toFixed(3)),
      finalProbability: rawScore,
    };
  }

  private static calculateConfidence(features: DetectionFeatures): number {
    let confidence = 0.40;

    if (features.totalTransactions >= 3) {
      confidence += 0.25;
    } else if (features.totalTransactions >= 1) {
      confidence += 0.10;
    }

    if (features.failureCategory !== 'UNKNOWN' && features.failureCode) {
      confidence += 0.15;
    }

    if (features.paymentMethod) {
      const pmBonus =
        SCORING_CONFIG.PAYMENT_METHOD_CONFIDENCE[features.paymentMethod] ??
        SCORING_CONFIG.PAYMENT_METHOD_CONFIDENCE.DEFAULT;
      confidence += pmBonus;
    }

    if (features.retryCount !== undefined) {
      confidence += 0.10;
    }

    return Number(Math.max(0.30, Math.min(0.95, confidence)).toFixed(2));
  }

  private static buildReasoningSummary(
    probability: number,
    riskLevel: RiskLevel,
    factors: DetectionFactor[]
  ): string {
    const primaryPositive = factors.filter((f) => f.impact === 'POSITIVE');
    const primaryNegative = factors.filter((f) => f.impact === 'NEGATIVE');

    const parts: string[] = [
      `Recovery probability evaluated at ${(probability * 100).toFixed(1)}% (${riskLevel} risk).`,
    ];

    if (primaryPositive.length > 0) {
      parts.push(`Positive signals: ${primaryPositive.map((f) => f.description).join(' ')}`);
    }

    if (primaryNegative.length > 0) {
      parts.push(`Risk factors: ${primaryNegative.map((f) => f.description).join(' ')}`);
    }

    return parts.join(' ');
  }
}
