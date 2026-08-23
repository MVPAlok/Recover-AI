import { Prisma, RecoveryDecision, RecoveryStatus } from '@prisma/client';

export type ExecutionMode = 'simulation' | 'razorpay_test' | 'razorpay_live';

export type ExecutionOutcomeCode =
  | 'PAYMENT_RECOVERED'
  | 'RECOVERY_ATTEMPT_FAILED'
  | 'REMINDER_SIMULATED'
  | 'ESCALATION_CREATED'
  | 'WAIT_SCHEDULED'
  | 'RECOVERY_STOPPED_BY_POLICY'
  | 'MAX_RETRY_LIMIT_EXCEEDED'
  | 'STALE_DECISION_BLOCKED'
  | 'IDEMPOTENT_DUPLICATE_BLOCKED'
  | 'UNSUPPORTED_MODE_ERROR'
  | 'GUARDRAIL_VIOLATION';

export interface BaseExecutionInput {
  transactionId: string;
  merchantId: string;
  customerId: string;
  aiDecisionId: string;
  action: RecoveryDecision;
  amount: number;
  currency: string;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

export interface RetryExecutionInput extends BaseExecutionInput {
  action: 'RETRY';
  paymentMethod?: string | null;
  recoveryProbability?: number | null;
}

export interface ReminderExecutionInput extends BaseExecutionInput {
  action: 'REMIND';
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
}

export interface EscalationExecutionInput extends BaseExecutionInput {
  action: 'ESCALATE';
  reason?: string | null;
  failureReason?: string | null;
}

export interface WaitExecutionInput extends BaseExecutionInput {
  action: 'WAIT';
  waitMinutes?: number;
}

export interface StopExecutionInput extends BaseExecutionInput {
  action: 'STOP';
  reason?: string | null;
}

export type ProviderExecutionInput =
  | RetryExecutionInput
  | ReminderExecutionInput
  | EscalationExecutionInput
  | WaitExecutionInput
  | StopExecutionInput;

export interface ProviderExecutionResult {
  success: boolean;
  status: RecoveryStatus;
  outcomeCode: ExecutionOutcomeCode;
  amountRecovered: number;
  message: string;
  executedAt?: Date;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface RecoveryExecutionResult {
  recoveryAttemptId: string;
  transactionId: string;
  aiDecisionId: string;
  action: RecoveryDecision;
  status: RecoveryStatus;
  outcomeCode: ExecutionOutcomeCode;
  amountRecovered: number | Prisma.Decimal;
  message: string;
  executedAt?: Date | string;
  scheduledAt?: Date | string;
  attemptNumber: number;
  isIdempotent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BatchExecutionSummary {
  success: boolean;
  processed: number;
  executed: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  pending: number;
  amountRecovered: number;
  durationMs: number;
  results: RecoveryExecutionResult[];
  errors: Array<{
    transactionId?: string;
    decisionId?: string;
    error: string;
  }>;
}

export interface RecoveryExecutorMetrics {
  totalAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  cancelledAttempts: number;
  pendingAttempts: number;
  totalAmountRecovered: number;
  recoveryRate: number;
  retrySuccessRate: number;
  amountByActionType: Record<RecoveryDecision, number>;
}
