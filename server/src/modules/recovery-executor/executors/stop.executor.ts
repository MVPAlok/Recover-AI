import { ProviderExecutionResult, StopExecutionInput } from '../execution.types.js';
import { RecoveryProvider } from '../providers/recovery-provider.js';

export class StopExecutor {
  constructor(private provider: RecoveryProvider) {}

  async execute(input: StopExecutionInput): Promise<ProviderExecutionResult> {
    return this.provider.executeStop(input);
  }
}
