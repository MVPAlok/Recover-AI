import { LLMProvider } from '../diagnosis/llm/llm-provider.js';
import { LLMFactory } from '../diagnosis/llm/llm-factory.js';
import { logger } from '../../utils/logger.js';
import { decisionRecommendationSchema } from './decision-validator.js';
import { DecisionInput, LLMDecisionRecommendation } from './decision.types.js';

export class DecisionReasoner {
  private provider: LLMProvider;

  constructor(provider?: LLMProvider) {
    this.provider = provider || LLMFactory.getProvider();
  }

  /**
   * Generates an advisory LLM decision recommendation based on multi-stage context.
   */
  async generateAdvisory(input: DecisionInput): Promise<LLMDecisionRecommendation | null> {
    try {
      const systemPrompt = `You are RecoverAI's Senior Payment Policy Analyst.
Your role is to analyze a failed payment transaction that has already passed through Detection Scoring and Failure Diagnosis, and recommend the single most appropriate recovery action.

Supported Recovery Actions:
- RETRY: Temporary infrastructure issue with high recovery probability and remaining retries.
- REMIND: Customer-actionable issue (e.g. 3D-Secure auth failure) where manual retry is useless but notifying customer will help.
- ESCALATE: Unclassified or high-risk failure with low diagnostic clarity requiring manual review.
- WAIT: Transient situation requiring delay before retry window or observing customer state.
- STOP: Hard limit reached (retries >= 3, expired instrument, repeated insufficient funds, low probability < 20%).

Note: Your recommendation is ADVISORY. Authoritative hard business safety rules will validate and may override your recommendation.`;

      const userPrompt = `Analyze the following failed payment case:

<TRANSACTION_CONTEXT>
- Transaction ID: ${input.transaction.id}
- Amount: ${input.transaction.amount} ${input.transaction.currency}
- Payment Method: ${input.transaction.paymentMethod || 'UNKNOWN'}
- Failure Code: ${input.transaction.failureCode || 'NONE'}
- Failure Reason: <UNTRUSTED_INPUT>${(input.transaction.failureReason || '').replace(/[<>]/g, '')}</UNTRUSTED_INPUT>
- Retry Count: ${input.transaction.retryCount}
</TRANSACTION_CONTEXT>

<CUSTOMER_CONTEXT>
- Total Transactions: ${input.customer.totalTransactions}
- Success Rate: ${(input.customer.successRate * 100).toFixed(1)}%
- Consecutive Failures: ${input.customer.consecutiveFailures}
- Lifetime Spend: ₹${input.customer.lifetimeSpend.toLocaleString()}
</CUSTOMER_CONTEXT>

<DETECTION_RESULT>
- Recovery Probability: ${input.detection ? (input.detection.recoveryProbability * 100).toFixed(1) + '%' : 'N/A'}
- Risk Level: ${input.detection?.riskLevel || 'UNKNOWN'}
- Recoverable: ${input.detection?.recoverable ?? 'N/A'}
</DETECTION_RESULT>

<DIAGNOSIS_RESULT>
- Diagnosis Code: ${input.diagnosis?.diagnosisCode || 'UNKNOWN'}
- Failure Category: ${input.diagnosis?.failureCategory || 'UNKNOWN'}
- Severity: ${input.diagnosis?.severity || 'UNKNOWN'}
- Likely Temporary: ${input.diagnosis?.isLikelyTemporary ?? 'UNKNOWN'}
- Diagnosis Confidence: ${input.diagnosis ? (input.diagnosis.confidence * 100).toFixed(0) + '%' : 'N/A'}
- Recommended Next Step: ${input.diagnosis?.recommendedNextStep || 'UNKNOWN'}
</DIAGNOSIS_RESULT>

Provide your structured recommendation adhering to the required JSON schema with recommendedAction, confidence, reasoning, and supportingFactors.`;

      const recommendation = await this.provider.generateStructuredOutput<LLMDecisionRecommendation>(
        systemPrompt,
        userPrompt,
        decisionRecommendationSchema
      );

      return recommendation;
    } catch (err: any) {
      logger.warn(`[DecisionReasoner] Advisory reasoning generation skipped/failed: ${err.message}`);
      return null;
    }
  }
}
