import { ExecutionMode } from '../recovery-executor/execution.types.js';

export type RecoveryJobPipelineType = 'FULL_AUTONOMOUS_PIPELINE' | 'DIRECT_EXECUTION';

export interface RecoveryExecutionJobData {
  transactionId: string;
  decisionId?: string;
  executionMode?: ExecutionMode;
  pipelineType?: RecoveryJobPipelineType;
  correlationId?: string;
  requestId?: string;
  enqueuedAt: string;
}

export interface RecoveryJobResult {
  success: boolean;
  transactionId: string;
  status?: string;
  outcomeCode?: string;
  message?: string;
  correlationId?: string;
  stagesCompleted?: string[];
  error?: string;
}

