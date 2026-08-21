import { LLMProvider } from './llm/llm-provider.js';
import { LLMFactory } from './llm/llm-factory.js';
import { DiagnosisContext, DiagnosisResult } from './diagnosis.types.js';
import {
  DIAGNOSIS_SYSTEM_PROMPT,
  buildDiagnosisUserPrompt,
} from './diagnosis-prompts.js';
import { diagnosisResponseSchema } from './diagnosis-schema.js';
import { DiagnosisValidator } from './diagnosis-validator.js';
import { logger } from '../../utils/logger.js';

export class DiagnosisAgent {
  private provider: LLMProvider;

  constructor(customProvider?: LLMProvider) {
    this.provider = customProvider || LLMFactory.getProvider();
  }

  /**
   * Executes AI failure diagnosis on the provided context.
   */
  async diagnose(
    context: DiagnosisContext,
    merchantId: string
  ): Promise<DiagnosisResult> {
    const transactionId = context.transaction.id;
    logger.info(
      `[DiagnosisAgent] Initiating diagnosis for transaction ${transactionId} using provider ${this.provider.name} (${this.provider.model})`
    );

    const userPrompt = buildDiagnosisUserPrompt(context);

    try {
      const rawOutput = await this.provider.generateStructuredOutput(
        DIAGNOSIS_SYSTEM_PROMPT,
        userPrompt,
        diagnosisResponseSchema
      );

      const result = DiagnosisValidator.validate(
        rawOutput,
        context,
        merchantId,
        this.provider.model
      );

      logger.info(
        `[DiagnosisAgent] Successfully diagnosed transaction ${transactionId}: ${result.diagnosisCode} (Category: ${result.failureCategory}, Severity: ${result.severity}, NextStep: ${result.recommendedNextStep})`
      );

      return result;
    } catch (error: any) {
      logger.error(
        `[DiagnosisAgent] Error during diagnosis for transaction ${transactionId}: ${error.message}`
      );
      throw error;
    }
  }
}
