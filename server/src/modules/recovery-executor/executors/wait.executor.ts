import { ProviderExecutionResult, WaitExecutionInput } from '../execution.types.js';
import { RecoveryProvider } from '../providers/recovery-provider.js';

export class WaitExecutor {
  constructor(private provider: RecoveryProvider) {}

  async execute(input: WaitExecutionInput): Promise<ProviderExecutionResult> {
    return this.provider.executeWait(input);
  }
}
