import { z } from 'zod';
import { LLMDecisionRecommendation } from './decision.types.js';

export const decisionRecommendationSchema = z.object({
  recommendedAction: z.enum(['RETRY', 'REMIND', 'ESCALATE', 'WAIT', 'STOP']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10, 'Reasoning must be at least 10 characters long'),
  supportingFactors: z.array(z.string()).min(1, 'At least one supporting factor required'),
});

export const batchDecisionRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  unprocessedOnly: z.boolean().default(true),
});

export class DecisionValidator {
  /**
   * Validates raw JSON string or object from LLM reasoning output.
   * Throws Error if schema is invalid.
   */
  static validateLLMRecommendation(raw: unknown): LLMDecisionRecommendation {
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new Error(`LLM decision recommendation is not valid JSON: ${(err as Error).message}`);
      }
    }

    const result = decisionRecommendationSchema.safeParse(parsed);
    if (!result.success) {
      const errorMsg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid LLM decision recommendation schema: ${errorMsg}`);
    }

    return result.data as LLMDecisionRecommendation;
  }
}
