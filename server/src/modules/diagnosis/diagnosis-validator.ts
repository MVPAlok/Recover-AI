import { RecoveryDecision } from '@prisma/client';
import { diagnosisResponseSchema, RawDiagnosisLLMOutput } from './diagnosis-schema.js';
import { DiagnosisContext, DiagnosisResult, RecommendedNextStep } from './diagnosis.types.js';
import { DIAGNOSIS_PROMPT_VERSION } from './diagnosis-prompts.js';

export class DiagnosisValidator {
  /**
   * Validates and normalizes raw LLM output against the domain contract and safety rules.
   */
  public static validate(
    rawOutput: unknown,
    context: DiagnosisContext,
    merchantId: string,
    modelName: string
  ): DiagnosisResult {
    // 1. Schema Validation
    const parsed: RawDiagnosisLLMOutput = diagnosisResponseSchema.parse(rawOutput);

    // 2. Safety Rule: Enforce retry limit safeguard
    let nextStep: RecommendedNextStep = parsed.recommendedNextStep;
    if (context.transaction.retryCount >= 3 && nextStep === 'EVALUATE_RETRY') {
      nextStep = 'NO_RECOVERY_RECOMMENDED';
    }

    // 3. Map to Prisma RecoveryDecision enum for preliminary tracking
    let preliminaryDecision: RecoveryDecision = RecoveryDecision.WAIT;
    switch (nextStep) {
      case 'EVALUATE_RETRY':
        preliminaryDecision = RecoveryDecision.RETRY;
        break;
      case 'EVALUATE_REMINDER':
        preliminaryDecision = RecoveryDecision.REMIND;
        break;
      case 'EVALUATE_ESCALATION':
        preliminaryDecision = RecoveryDecision.ESCALATE;
        break;
      case 'WAIT_FOR_RETRY_WINDOW':
      case 'NEEDS_MORE_INFORMATION':
        preliminaryDecision = RecoveryDecision.WAIT;
        break;
      case 'NO_RECOVERY_RECOMMENDED':
        preliminaryDecision = RecoveryDecision.STOP;
        break;
    }

    return {
      transactionId: context.transaction.id,
      merchantId,
      customerId: '', // Populated by caller
      diagnosisCode: parsed.diagnosisCode,
      failureCategory: parsed.failureCategory,
      confidence: Number(parsed.confidence.toFixed(2)),
      severity: parsed.severity,
      isLikelyTemporary: parsed.isLikelyTemporary,
      evidence: parsed.evidence,
      reasoning: parsed.reasoning,
      recommendedNextStep: nextStep,
      preliminaryRecoveryDecision: preliminaryDecision,
      diagnosedAt: new Date().toISOString(),
      modelName,
      promptVersion: DIAGNOSIS_PROMPT_VERSION,
    };
  }
}
