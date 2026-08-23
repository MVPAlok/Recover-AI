import { ExecutionMode } from '../recovery-executor/execution.types.js';

export interface RecoveryExecutionJobData {
  transactionId: string;
  decisionId?: string;
  executionMode?: ExecutionMode;
  enqueuedAt: string;
}

export interface RecoveryJobResult {
  success: boolean;
  transactionId: string;
  status?: string;
  outcomeCode?: string;
  message?: string;
  error?: string;
}
