import { AIAgentType, AIDecision, Merchant, Transaction } from '@prisma/client';
import { ExecutionPolicy } from './execution-policy.js';
import { ExecutionOutcomeCode } from './execution.types.js';

export interface ValidationSuccess {
  isValid: true;
}

export interface ValidationFailure {
  isValid: false;
  reason: string;
  outcomeCode: ExecutionOutcomeCode;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export class ExecutionValidator {
  /**
   * Validates pre-execution requirements and safety guardrails.
   */
  public static validateExecution(params: {
    transaction: Transaction | null;
    merchant: Merchant | null;
    decision: AIDecision | null;
    executionMode?: string;
  }): ValidationResult {
    const { transaction, merchant, decision, executionMode } = params;
    const config = ExecutionPolicy.getConfig();

    // 1. Validate Execution Mode
    const mode = executionMode || config.mode;
    if (mode !== 'simulation' && mode !== 'razorpay_test') {
      return {
        isValid: false,
        reason: `Unsupported execution mode '${mode}'. System is configured to fail closed.`,
        outcomeCode: 'UNSUPPORTED_MODE_ERROR',
      };
    }

    // 2. Validate Merchant
    if (!merchant) {
      return {
        isValid: false,
        reason: 'Merchant associated with the transaction not found.',
        outcomeCode: 'GUARDRAIL_VIOLATION',
      };
    }

    // 3. Validate Transaction
    if (!transaction) {
      return {
        isValid: false,
        reason: 'Transaction not found.',
        outcomeCode: 'GUARDRAIL_VIOLATION',
      };
    }

    if (transaction.status !== 'FAILED') {
      return {
        isValid: false,
        reason: `Transaction ${transaction.id} has status '${transaction.status}'. Only 'FAILED' transactions can undergo recovery execution.`,
        outcomeCode: 'GUARDRAIL_VIOLATION',
      };
    }

    // 4. Validate Phase 5 Decision
    if (!decision) {
      return {
        isValid: false,
        reason: `No Phase 5 Recovery Decision found for transaction ${transaction.id}.`,
        outcomeCode: 'GUARDRAIL_VIOLATION',
      };
    }

    if (decision.agentType !== AIAgentType.RECOVERY_DECISION) {
      return {
        isValid: false,
        reason: `AI Decision ${decision.id} is of type '${decision.agentType}', expected 'RECOVERY_DECISION'.`,
        outcomeCode: 'GUARDRAIL_VIOLATION',
      };
    }

    if (decision.transactionId !== transaction.id) {
      return {
        isValid: false,
        reason: `AI Decision ${decision.id} does not belong to transaction ${transaction.id}.`,
        outcomeCode: 'GUARDRAIL_VIOLATION',
      };
    }

    // 5. Validate Decision Freshness
    const ageMinutes = (Date.now() - new Date(decision.createdAt).getTime()) / (60 * 1000);
    if (ageMinutes > config.decisionMaxAgeMinutes) {
      return {
        isValid: false,
        reason: `Phase 5 Decision ${decision.id} is stale (${ageMinutes.toFixed(1)} mins old, max allowed: ${config.decisionMaxAgeMinutes} mins). Re-run Phase 5 before execution.`,
        outcomeCode: 'STALE_DECISION_BLOCKED',
      };
    }

    // 6. Validate Retry Limit if action is RETRY
    if (decision.decision === 'RETRY' && transaction.retryCount >= config.maxRetryLimit) {
      return {
        isValid: false,
        reason: `Transaction retry count (${transaction.retryCount}) reached or exceeded maximum limit of ${config.maxRetryLimit}.`,
        outcomeCode: 'MAX_RETRY_LIMIT_EXCEEDED',
      };
    }

    return { isValid: true };
  }
}
