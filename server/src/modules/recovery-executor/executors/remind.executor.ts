import { ProviderExecutionResult, ReminderExecutionInput } from '../execution.types.js';
import { RecoveryProvider } from '../providers/recovery-provider.js';

export class RemindExecutor {
  constructor(private provider: RecoveryProvider) {}

  async execute(input: ReminderExecutionInput): Promise<ProviderExecutionResult> {
    return this.provider.executeReminder(input);
  }
}
