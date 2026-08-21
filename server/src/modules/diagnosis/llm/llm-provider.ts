import { z } from 'zod';

export interface LLMProvider {
  readonly name: string;
  readonly model: string;

  /**
   * Generates a strongly typed structured output validated against a Zod schema.
   *
   * @param systemPrompt Instructions defining the model's role and rules
   * @param userPrompt The context payload and prompt instructions
   * @param schema Zod schema used to validate and parse the output
   */
  generateStructuredOutput<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T>;
}
