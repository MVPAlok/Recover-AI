import { LLMProvider } from './llm-provider.js';
import { MockLLMProvider } from './mock-llm-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { logger } from '../../../utils/logger.js';

export class LLMFactory {
  private static cachedProvider: LLMProvider | null = null;

  public static getProvider(forceNew = false): LLMProvider {
    if (this.cachedProvider && !forceNew) {
      return this.cachedProvider;
    }

    const providerType = process.env.LLM_PROVIDER?.toLowerCase();
    const rawKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
    const hasValidKey =
      rawKey.length > 10 &&
      !rawKey.includes('your_openai_api_key_here') &&
      !rawKey.includes('your_llm_api_key_here');

    if (providerType === 'openai' || (hasValidKey && providerType !== 'mock')) {
      if (!hasValidKey) {
        logger.warn(
          '[LLMFactory] OpenAI provider requested but no valid API key configured. Falling back to MockLLMProvider.'
        );
        this.cachedProvider = new MockLLMProvider();
      } else {
        logger.info(
          `[LLMFactory] Initializing OpenAI provider with model: ${process.env.LLM_MODEL || 'gpt-4o-mini'}`
        );
        this.cachedProvider = new OpenAIProvider();
      }
    } else {
      this.cachedProvider = new MockLLMProvider();
    }

    return this.cachedProvider;
  }

  public static setProvider(provider: LLMProvider): void {
    this.cachedProvider = provider;
  }
}
