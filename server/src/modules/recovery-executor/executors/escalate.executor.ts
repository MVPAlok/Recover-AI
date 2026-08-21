import { EscalationExecutionInput, ProviderExecutionResult } from '../execution.types.js';
import { RecoveryProvider } from '../providers/recovery-provider.js';

export class EscalateExecutor {
  constructor(private provider: RecoveryProvider) {}

  async execute(input: EscalationExecutionInput): Promise<ProviderExecutionResult> {
    return this.provider.executeEscalation(input);
  }
}
