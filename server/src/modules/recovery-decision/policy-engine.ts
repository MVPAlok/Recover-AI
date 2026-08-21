import { RecoveryDecision } from '@prisma/client';
import { POLICY_CONFIG } from './policy-config.js';
import {
  BusinessPriority,
  DecisionInput,
  DecisionResult,
} from './decision.types.js';

export class PolicyEngine {
  /**
   * Evaluates decision input through authoritative hard safety rules,
   * business policy logic, economic prioritization, and optional LLM advisories.
   *
   * Pure function: operates without database or network dependencies.
   */
  static evaluate(input: DecisionInput, modelName = 'recovery-policy-v1'): DecisionResult {
    const { transaction, customer, detection, diagnosis, llmAdvisory } = input;

    const rulesApplied: string[] = [];
    const blockedActions: RecoveryDecision[] = [];
    let decision: RecoveryDecision = 'WAIT';
    let confidence: number = POLICY_CONFIG.CONFIDENCE.CONFLICT_OR_FALLBACK;
    let reason = '';
    let policyOverride: string | null = null;

    // 1. Calculate Economic Priority
    const businessPriority = this.calculateBusinessPriority(transaction.amount, customer.lifetimeSpend);

    // =========================================================================
    // STEP 1: AUTHORITATIVE HARD SAFETY RULES (Highest Priority - Never Overridden)
    // =========================================================================

    // Rule 1 — Maximum Retry Limit Exceeded
    if (transaction.retryCount >= POLICY_CONFIG.MAX_RETRY_LIMIT) {
      decision = 'STOP';
      confidence = POLICY_CONFIG.CONFIDENCE.HARD_GUARDRAIL;
      reason = `Transaction has reached or exceeded the maximum retry limit of ${POLICY_CONFIG.MAX_RETRY_LIMIT} attempts (current: ${transaction.retryCount}). Automatic retries halted for risk safety.`;
      rulesApplied.push(POLICY_CONFIG.RULES.MAX_RETRY_LIMIT_EXCEEDED);
      blockedActions.push('RETRY', 'REMIND', 'WAIT', 'ESCALATE');
    }
    // Rule 2 — Expired or Invalid Payment Instrument
    else if (
      diagnosis?.diagnosisCode === 'EXPIRED_PAYMENT_INSTRUMENT' ||
      transaction.failureCode === 'EXPIRED_CARD' ||
      diagnosis?.failureCategory === 'INSTRUMENT_EXPIRATION'
    ) {
      decision = 'STOP';
      confidence = POLICY_CONFIG.CONFIDENCE.HARD_GUARDRAIL;
      reason = 'Payment instrument is permanently expired or invalid. Automatic recovery retry cannot succeed.';
      rulesApplied.push(POLICY_CONFIG.RULES.EXPIRED_PAYMENT_INSTRUMENT);
      blockedActions.push('RETRY', 'WAIT');
    }
    // Rule 3 — Repeated Insufficient Funds
    else if (
      (diagnosis?.diagnosisCode === 'INSUFFICIENT_FUNDS' || transaction.failureCode === 'INSUFFICIENT_FUNDS') &&
      transaction.retryCount >= POLICY_CONFIG.INSUFFICIENT_FUNDS_RETRY_LIMIT
    ) {
      decision = 'STOP';
      confidence = POLICY_CONFIG.CONFIDENCE.HARD_GUARDRAIL;
      reason = `Repeated payment declines due to insufficient funds with ${transaction.retryCount} previous attempts. Halting automated retries to prevent customer friction.`;
      rulesApplied.push(POLICY_CONFIG.RULES.REPEATED_INSUFFICIENT_FUNDS);
      blockedActions.push('RETRY');
    }
    // Rule 4 — Very Low Recovery Probability
    else if (
      detection &&
      detection.recoveryProbability < POLICY_CONFIG.MIN_RECOVERY_PROBABILITY_THRESHOLD
    ) {
      decision = 'STOP';
      confidence = POLICY_CONFIG.CONFIDENCE.RULE_BASED_HIGH;
      reason = `Recovery probability (${(detection.recoveryProbability * 100).toFixed(1)}%) is below the minimum viable threshold (${(POLICY_CONFIG.MIN_RECOVERY_PROBABILITY_THRESHOLD * 100).toFixed(1)}%). Continued attempts are unsafe and inefficient.`;
      rulesApplied.push(POLICY_CONFIG.RULES.VERY_LOW_RECOVERY_PROBABILITY);
      blockedActions.push('RETRY');
    }

    // =========================================================================
    // STEP 2: BUSINESS POLICY RULES (Evaluated if no hard safety rule stopped action)
    // =========================================================================
    else {
      // Rule 5 — Unknown Failure with Low Confidence
      if (
        diagnosis?.diagnosisCode === 'UNKNOWN_PAYMENT_FAILURE' &&
        (diagnosis.confidence < POLICY_CONFIG.UNKNOWN_DIAGNOSIS_CONFIDENCE_THRESHOLD || !detection?.recoverable)
      ) {
        decision = 'ESCALATE';
        confidence = POLICY_CONFIG.CONFIDENCE.RULE_BASED_MODERATE;
        reason = 'Payment failed with unclassified error and insufficient diagnostic confidence. Escalated for operational review.';
        rulesApplied.push(POLICY_CONFIG.RULES.UNKNOWN_FAILURE_ESCALATION);
        blockedActions.push('RETRY');
      }
      // Rule 6 — Conflicting Signals (Detection says non-recoverable, Diagnosis says retry)
      else if (
        detection &&
        !detection.recoverable &&
        (diagnosis?.recommendedNextStep === 'EVALUATE_RETRY' || diagnosis?.isLikelyTemporary)
      ) {
        decision = 'WAIT';
        confidence = POLICY_CONFIG.CONFIDENCE.CONFLICT_OR_FALLBACK;
        reason = 'Conflicting analytical signals: Detection model assessed transaction as non-recoverable while Diagnosis indicated potential temporary failure. Holding in observation window.';
        rulesApplied.push(POLICY_CONFIG.RULES.CONFLICTING_SIGNALS_POLICY);
        blockedActions.push('RETRY');
      }
      // Rule 7 — Customer Authentication / Action Required
      else if (
        diagnosis?.diagnosisCode === 'CUSTOMER_AUTHENTICATION_FAILURE' ||
        diagnosis?.failureCategory === 'CUSTOMER_AUTHENTICATION' ||
        diagnosis?.recommendedNextStep === 'EVALUATE_REMINDER' ||
        transaction.failureCode === 'AUTHENTICATION_FAILURE'
      ) {
        decision = 'REMIND';
        confidence = POLICY_CONFIG.CONFIDENCE.RULE_BASED_HIGH;
        reason = 'Payment failure was caused by 3D-Secure / authentication drop-off. Customer reminder notification is the safest recovery action rather than blind retries.';
        rulesApplied.push(POLICY_CONFIG.RULES.CUSTOMER_AUTHENTICATION_REQUIRED);
        blockedActions.push('RETRY');
      }
      // Rule 8 — Temporary Infrastructure / Gateway Failure with High Probability
      else if (
        (diagnosis?.isLikelyTemporary ||
          diagnosis?.failureCategory === 'TEMPORARY_INFRASTRUCTURE' ||
          diagnosis?.diagnosisCode === 'TEMPORARY_BANK_FAILURE' ||
          diagnosis?.diagnosisCode === 'TEMPORARY_GATEWAY_FAILURE' ||
          diagnosis?.diagnosisCode === 'NETWORK_FAILURE' ||
          diagnosis?.recommendedNextStep === 'EVALUATE_RETRY') &&
        (detection ? detection.recoveryProbability >= POLICY_CONFIG.HIGH_RECOVERY_PROBABILITY_THRESHOLD : true) &&
        transaction.retryCount < POLICY_CONFIG.MAX_RETRY_LIMIT
      ) {
        decision = 'RETRY';
        const detProb = detection ? detection.recoveryProbability : 0.85;
        confidence = Math.min(0.96, Math.max(0.85, (detection?.confidenceScore ?? 0.88)));
        reason = `Temporary infrastructure/gateway failure with high recovery likelihood (${(detProb * 100).toFixed(0)}%) and retry limit available (${transaction.retryCount}/${POLICY_CONFIG.MAX_RETRY_LIMIT}). Scheduled for smart retry.`;
        rulesApplied.push(POLICY_CONFIG.RULES.TEMPORARY_FAILURE_RETRY_POLICY);
        blockedActions.push('STOP');
      }
      // Rule 9 — Transient Wait Window (Moderate probability or transient wait step)
      else if (
        diagnosis?.recommendedNextStep === 'WAIT_FOR_RETRY_WINDOW' ||
        (detection &&
          detection.recoveryProbability >= POLICY_CONFIG.MIN_RECOVERY_PROBABILITY_THRESHOLD &&
          detection.recoveryProbability < POLICY_CONFIG.HIGH_RECOVERY_PROBABILITY_THRESHOLD)
      ) {
        decision = 'WAIT';
        confidence = POLICY_CONFIG.CONFIDENCE.RULE_BASED_MODERATE;
        reason = 'Moderate recovery probability or transient timing constraint detected. Holding for delay window before re-attempting.';
        rulesApplied.push(POLICY_CONFIG.RULES.TRANSIENT_WAIT_WINDOW_POLICY);
      }
      // Rule 10 — Safe Fallback
      else {
        decision = 'WAIT';
        confidence = POLICY_CONFIG.CONFIDENCE.CONFLICT_OR_FALLBACK;
        reason = 'Signals require additional observation window before selecting definitive recovery action.';
        rulesApplied.push(POLICY_CONFIG.RULES.FALLBACK_WAIT_POLICY);
      }
    }

    // =========================================================================
    // STEP 3: LLM ADVISORY INTEGRATION & SAFETY OVERRIDE FILTER
    // =========================================================================
    if (llmAdvisory) {
      const isHardRuleActive = [
        POLICY_CONFIG.RULES.MAX_RETRY_LIMIT_EXCEEDED,
        POLICY_CONFIG.RULES.EXPIRED_PAYMENT_INSTRUMENT,
        POLICY_CONFIG.RULES.REPEATED_INSUFFICIENT_FUNDS,
        POLICY_CONFIG.RULES.VERY_LOW_RECOVERY_PROBABILITY,
      ].some((r) => rulesApplied.includes(r));

      if (isHardRuleActive && llmAdvisory.recommendedAction !== decision) {
        // Hard safety rule overrides LLM!
        policyOverride = rulesApplied[0];
        rulesApplied.push(POLICY_CONFIG.RULES.LLM_ADVISORY_OVERRIDDEN);
        reason = `[OVERRIDE: ${policyOverride}] LLM recommended '${llmAdvisory.recommendedAction}', but authoritative hard safety rule enforced '${decision}'. ${reason}`;
      } else if (!isHardRuleActive) {
        // LLM advisory is aligned or safe to incorporate
        rulesApplied.push(POLICY_CONFIG.RULES.LLM_ADVISORY_ACCEPTED);
      }
    }

    return {
      transactionId: transaction.id,
      merchantId: transaction.merchantId,
      customerId: transaction.customerId,
      decision,
      confidence: Number(confidence.toFixed(2)),
      reason,
      rulesApplied,
      blockedActions,
      businessPriority,
      detectionProbability: detection ? Number(detection.recoveryProbability.toFixed(3)) : 0.5,
      diagnosisConfidence: diagnosis ? Number(diagnosis.confidence.toFixed(2)) : 0.5,
      policyOverride,
      llmRecommendation: llmAdvisory ? llmAdvisory.recommendedAction : null,
      evaluatedAt: new Date().toISOString(),
      modelName,
      promptVersion: 'v1.0.0',
    };
  }

  /**
   * Computes economic priority level without allowing monetary amount to override safety rules.
   */
  private static calculateBusinessPriority(
    amount: number,
    lifetimeSpend: number
  ): BusinessPriority {
    if (
      amount >= POLICY_CONFIG.HIGH_VALUE_THRESHOLD ||
      lifetimeSpend >= POLICY_CONFIG.HIGH_VALUE_THRESHOLD * 2.5
    ) {
      return 'HIGH';
    }
    if (
      amount >= POLICY_CONFIG.MEDIUM_VALUE_THRESHOLD ||
      lifetimeSpend >= POLICY_CONFIG.MEDIUM_VALUE_THRESHOLD * 2
    ) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}
