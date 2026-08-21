import { z } from 'zod';
import { LLMProvider } from './llm-provider.js';

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  timeoutMs?: number;
}

export class OpenAIProvider implements LLMProvider {
  public readonly name = 'openai-provider';
  public readonly model: string;
  private apiKey: string;
  private baseURL: string;
  private timeoutMs: number;

  constructor(config: OpenAIProviderConfig = {}) {
    const key =
      config.apiKey !== undefined
        ? config.apiKey
        : process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';

    // Ignore dummy placeholder strings
    this.apiKey =
      key === 'your_openai_api_key_here' || key === 'your_llm_api_key_here' ? '' : key;
    this.model = config.model || process.env.LLM_MODEL || 'gpt-4o-mini';
    this.baseURL = config.baseURL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
    this.timeoutMs = config.timeoutMs || 15000;
  }

  async generateStructuredOutput<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API Key is missing. Set LLM_API_KEY or OPENAI_API_KEY in environment variables.'
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1, // Low temperature for deterministic financial diagnosis
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAI API request failed with status ${response.status}: ${errorText.slice(0, 200)}`
        );
      }

      const jsonResponse: any = await response.json();
      const content = jsonResponse.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('OpenAI returned an empty completion content');
      }

      const parsedJson = JSON.parse(content);
      return schema.parse(parsedJson);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
