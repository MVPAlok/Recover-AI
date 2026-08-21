import { RecoveryAttempt } from '@prisma/client';
import { RecoveryExecutionResult } from './execution.types.js';

export class IdempotencyService {
  /**
   * Evaluates whether an existing recovery attempt satisfies idempotency for the requested decision.
   */
  public static checkExistingAttempt(
    decisionId: string,
    existingAttempts: RecoveryAttempt[]
  ): { isDuplicate: boolean; existingResult?: RecoveryExecutionResult } {
    // Find any attempt linked to this exact AI decision
    const matchingAttempt = existingAttempts.find(
      (attempt) => attempt.aiDecisionId === decisionId
    );

    if (!matchingAttempt) {
      return { isDuplicate: false };
    }

    // Attempt already exists for this decision
    const existingResult: RecoveryExecutionResult = {
      recoveryAttemptId: matchingAttempt.id,
      transactionId: matchingAttempt.transactionId,
      aiDecisionId: decisionId,
      action: matchingAttempt.actionType,
      status: matchingAttempt.status,
      outcomeCode:
        matchingAttempt.status === 'SUCCESS'
          ? matchingAttempt.amountRecovered.toNumber() > 0
            ? 'PAYMENT_RECOVERED'
            : matchingAttempt.actionType === 'REMIND'
            ? 'REMINDER_SIMULATED'
            : 'ESCALATION_CREATED'
          : matchingAttempt.status === 'PENDING'
          ? 'WAIT_SCHEDULED'
          : matchingAttempt.status === 'CANCELLED'
          ? 'RECOVERY_STOPPED_BY_POLICY'
          : 'RECOVERY_ATTEMPT_FAILED',
      amountRecovered: matchingAttempt.amountRecovered,
      message: `Idempotent response: Recovery attempt already recorded (status: ${matchingAttempt.status}).`,
      executedAt: matchingAttempt.executedAt || undefined,
      scheduledAt: matchingAttempt.scheduledAt || undefined,
      attemptNumber: matchingAttempt.attemptNumber,
      isIdempotent: true,
    };

    return {
      isDuplicate: true,
      existingResult,
    };
  }
}
