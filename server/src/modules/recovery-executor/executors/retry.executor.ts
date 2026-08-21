import { ProviderExecutionResult, RetryExecutionInput } from '../execution.types.js';
import { RecoveryProvider } from '../providers/recovery-provider.js';
import { ExecutionPolicy } from '../execution-policy.js';

export class RetryExecutor {
  constructor(private provider: RecoveryProvider) {}

  async execute(input: RetryExecutionInput): Promise<ProviderExecutionResult> {
    const config = ExecutionPolicy.getConfig();

    // Guardrail: Safety check on retry count
    if (input.retryCount >= config.maxRetryLimit) {
      return {
        success: false,
        status: 'CANCELLED',
        outcomeCode: 'MAX_RETRY_LIMIT_EXCEEDED',
        amountRecovered: 0,
        message: `Retry limit of ${config.maxRetryLimit} exceeded (current: ${input.retryCount}). Execution blocked.`,
        executedAt: new Date(),
        metadata: {
          blockedReason: 'MAX_RETRY_LIMIT_EXCEEDED',
          retryCount: input.retryCount,
          maxRetryLimit: config.maxRetryLimit,
        },
      };
    }

    return this.provider.executeRetry(input);
  }
}
