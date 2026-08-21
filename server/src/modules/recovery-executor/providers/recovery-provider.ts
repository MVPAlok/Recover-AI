import {
  EscalationExecutionInput,
  ProviderExecutionResult,
  ReminderExecutionInput,
  RetryExecutionInput,
  StopExecutionInput,
  WaitExecutionInput,
} from '../execution.types.js';

export interface RecoveryProvider {
  readonly providerName: string;

  executeRetry(input: RetryExecutionInput): Promise<ProviderExecutionResult>;
  executeReminder(input: ReminderExecutionInput): Promise<ProviderExecutionResult>;
  executeEscalation(input: EscalationExecutionInput): Promise<ProviderExecutionResult>;
  executeWait(input: WaitExecutionInput): Promise<ProviderExecutionResult>;
  executeStop(input: StopExecutionInput): Promise<ProviderExecutionResult>;
}
