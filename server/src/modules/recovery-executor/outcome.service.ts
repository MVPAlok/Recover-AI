import { RecoveryDecision, RecoveryStatus } from '@prisma/client';
import { ExecutionOutcomeCode, ProviderExecutionResult, RecoveryExecutionResult } from './execution.types.js';

export class OutcomeService {
  /**
   * Constructs the final strongly-typed RecoveryExecutionResult.
   */
  public static buildExecutionResult(params: {
    recoveryAttemptId: string;
    transactionId: string;
    aiDecisionId: string;
    action: RecoveryDecision;
    providerResult: ProviderExecutionResult;
    attemptNumber: number;
  }): RecoveryExecutionResult {
    const { recoveryAttemptId, transactionId, aiDecisionId, action, providerResult, attemptNumber } = params;

    // Strict revenue separation rule:
    // Only successful RETRY actions can claim amountRecovered > 0.
    const finalAmountRecovered =
      action === 'RETRY' && providerResult.status === 'SUCCESS'
        ? providerResult.amountRecovered
        : 0;

    return {
      recoveryAttemptId,
      transactionId,
      aiDecisionId,
      action,
      status: providerResult.status,
      outcomeCode: providerResult.outcomeCode,
      amountRecovered: finalAmountRecovered,
      message: providerResult.message,
      executedAt: providerResult.executedAt,
      scheduledAt: providerResult.scheduledAt,
      attemptNumber,
      isIdempotent: false,
      metadata: providerResult.metadata,
    };
  }

  /**
   * Constructs a blocked/cancelled execution result when guardrails fail.
   */
  public static buildBlockedResult(params: {
    recoveryAttemptId: string;
    transactionId: string;
    aiDecisionId: string;
    action: RecoveryDecision;
    reason: string;
    outcomeCode: ExecutionOutcomeCode;
    attemptNumber: number;
  }): RecoveryExecutionResult {
    const { recoveryAttemptId, transactionId, aiDecisionId, action, reason, outcomeCode, attemptNumber } = params;

    return {
      recoveryAttemptId,
      transactionId,
      aiDecisionId,
      action,
      status: 'CANCELLED',
      outcomeCode,
      amountRecovered: 0,
      message: reason,
      executedAt: new Date(),
      attemptNumber,
      isIdempotent: false,
    };
  }
}
