import { AIAgentType, AIDecision, Transaction } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { ExecutionRepository } from './execution.repository.js';
import { ExecutionPolicy } from './execution-policy.js';
import { ExecutionValidator } from './execution-validator.js';
import { IdempotencyService } from './idempotency.service.js';
import { OutcomeService } from './outcome.service.js';
import { RecoveryProvider } from './providers/recovery-provider.js';
import { SimulationRecoveryProvider } from './providers/simulation-provider.js';
import { RetryExecutor } from './executors/retry.executor.js';
import { RemindExecutor } from './executors/remind.executor.js';
import { EscalateExecutor } from './executors/escalate.executor.js';
import { WaitExecutor } from './executors/wait.executor.js';
import { StopExecutor } from './executors/stop.executor.js';
import {
  BatchExecutionSummary,
  ProviderExecutionResult,
  RecoveryExecutionResult,
  RecoveryExecutorMetrics,
} from './execution.types.js';

export class RecoveryExecutorService {
  private repository: ExecutionRepository;
  private provider: RecoveryProvider;
  private retryExecutor: RetryExecutor;
  private remindExecutor: RemindExecutor;
  private escalateExecutor: EscalateExecutor;
  private waitExecutor: WaitExecutor;
  private stopExecutor: StopExecutor;

  constructor(repository?: ExecutionRepository, provider?: RecoveryProvider) {
    this.repository = repository || new ExecutionRepository();
    this.provider = provider || new SimulationRecoveryProvider();
    this.retryExecutor = new RetryExecutor(this.provider);
    this.remindExecutor = new RemindExecutor(this.provider);
    this.escalateExecutor = new EscalateExecutor(this.provider);
    this.waitExecutor = new WaitExecutor(this.provider);
    this.stopExecutor = new StopExecutor(this.provider);
  }

  /**
   * Safely executes an approved Phase 5 decision for a single transaction.
   *
   * @param transactionId ID of the transaction
   * @param decisionId Optional specific Phase 5 AIDecision ID
   * @param executionMode Optional execution mode override (must be 'simulation' in Phase 6)
   */
  async executeDecision(params: {
    transactionId: string;
    decisionId?: string;
    executionMode?: string;
  }): Promise<RecoveryExecutionResult> {
    const { transactionId, decisionId, executionMode } = params;
    const mode = executionMode || ExecutionPolicy.getConfig().mode;

    logger.info(
      `[RecoveryExecutor] Executing decision for transaction ${transactionId} (mode: ${mode})`
    );

    // 1. Fetch transaction with full context
    const tx = await this.repository.getTransactionWithDetails(transactionId);
    if (!tx) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    // 2. Resolve target Phase 5 decision
    let decision: AIDecision | null = null;
    if (decisionId) {
      decision =
        tx.aiDecisions.find(
          (d) => d.id === decisionId && d.agentType === AIAgentType.RECOVERY_DECISION
        ) || null;
      if (!decision) {
        throw new Error(
          `Phase 5 Decision ${decisionId} does not exist or does not belong to transaction ${transactionId}`
        );
      }
    } else {
      decision =
        tx.aiDecisions.find((d) => d.agentType === AIAgentType.RECOVERY_DECISION) || null;
    }

    const nextAttemptNumber =
      (tx.recoveryAttempts.length > 0
        ? Math.max(...tx.recoveryAttempts.map((a) => a.attemptNumber))
        : 0) + 1;

    // 3. Pre-execution guardrails and validation
    const validation = ExecutionValidator.validateExecution({
      transaction: tx,
      merchant: tx.merchant,
      decision,
      executionMode: mode,
    });

    if (!validation.isValid) {
      logger.warn(
        `[RecoveryExecutor] Execution blocked for transaction ${transactionId}: ${validation.reason}`
      );

      // Audit blocked event
      await this.repository.createAuditLog({
        merchantId: tx.merchantId,
        transactionId: tx.id,
        action: 'RECOVERY_EXECUTION_BLOCKED',
        details: {
          decisionId: decision?.id || null,
          reason: validation.reason,
          outcomeCode: validation.outcomeCode,
          mode,
        },
      });

      // If decision exists, create a CANCELLED attempt to record the block
      if (decision) {
        const blockedAttempt = await this.repository.createRecoveryAttempt({
          merchantId: tx.merchantId,
          transactionId: tx.id,
          aiDecisionId: decision.id,
          attemptNumber: nextAttemptNumber,
          actionType: decision.decision,
          status: 'CANCELLED',
          reason: validation.reason,
          amountRecovered: 0,
        });

        return OutcomeService.buildBlockedResult({
          recoveryAttemptId: blockedAttempt.id,
          transactionId: tx.id,
          aiDecisionId: decision.id,
          action: decision.decision,
          reason: validation.reason,
          outcomeCode: validation.outcomeCode,
          attemptNumber: nextAttemptNumber,
        });
      }

      throw new Error(`Execution blocked: ${validation.reason}`);
    }

    // At this point, decision is guaranteed to be non-null and valid
    const targetDecision = decision!;

    // 4. Idempotency Check
    const idempotency = IdempotencyService.checkExistingAttempt(
      targetDecision.id,
      tx.recoveryAttempts
    );

    if (idempotency.isDuplicate && idempotency.existingResult) {
      logger.info(
        `[RecoveryExecutor] Idempotent hit: Decision ${targetDecision.id} already executed (status: ${idempotency.existingResult.status})`
      );
      return idempotency.existingResult;
    }

    // 5. Create initial RecoveryAttempt in PENDING state
    const attemptRecord = await this.repository.createRecoveryAttempt({
      merchantId: tx.merchantId,
      transactionId: tx.id,
      aiDecisionId: targetDecision.id,
      attemptNumber: nextAttemptNumber,
      actionType: targetDecision.decision,
      status: 'PENDING',
      reason: 'Execution initiated',
      amountRecovered: 0,
    });

    // 6. Audit Execution Start
    await this.repository.createAuditLog({
      merchantId: tx.merchantId,
      transactionId: tx.id,
      recoveryAttemptId: attemptRecord.id,
      action: 'RECOVERY_EXECUTION_STARTED',
      details: {
        decisionId: targetDecision.id,
        action: targetDecision.decision,
        mode,
        attemptNumber: nextAttemptNumber,
      },
    });

    // 7. Execute action via corresponding ActionExecutor
    let providerResult: ProviderExecutionResult;

    const baseInput = {
      transactionId: tx.id,
      merchantId: tx.merchantId,
      customerId: tx.customerId,
      aiDecisionId: targetDecision.id,
      amount: tx.amount.toNumber(),
      currency: tx.currency,
      retryCount: tx.retryCount,
    };

    switch (targetDecision.decision) {
      case 'RETRY':
        providerResult = await this.retryExecutor.execute({
          ...baseInput,
          action: 'RETRY',
          paymentMethod: tx.paymentMethod,
          recoveryProbability: targetDecision.recoveryProbability ?? undefined,
        });
        break;

      case 'REMIND':
        providerResult = await this.remindExecutor.execute({
          ...baseInput,
          action: 'REMIND',
          customerEmail: tx.customer?.email,
          customerPhone: tx.customer?.phone,
          customerName: tx.customer?.name,
        });
        break;

      case 'ESCALATE':
        providerResult = await this.escalateExecutor.execute({
          ...baseInput,
          action: 'ESCALATE',
          reason: targetDecision.reasoning,
          failureReason: tx.failureReason,
        });
        break;

      case 'WAIT':
        providerResult = await this.waitExecutor.execute({
          ...baseInput,
          action: 'WAIT',
          waitMinutes: ExecutionPolicy.getConfig().defaultWaitMinutes,
        });
        break;

      case 'STOP':
        providerResult = await this.stopExecutor.execute({
          ...baseInput,
          action: 'STOP',
          reason: targetDecision.reasoning,
        });
        break;

      default:
        throw new Error(`Unhandled recovery action: ${targetDecision.decision}`);
    }

    // 8. Update RecoveryAttempt with provider result
    await this.repository.updateRecoveryAttemptOutcome(attemptRecord.id, {
      status: providerResult.status,
      reason: providerResult.message,
      amountRecovered:
        targetDecision.decision === 'RETRY' && providerResult.status === 'SUCCESS'
          ? providerResult.amountRecovered
          : 0,
      executedAt: providerResult.executedAt,
      scheduledAt: providerResult.scheduledAt,
    });

    // 9. Increment retryCount ONLY for actual RETRY executions (success or failed attempt)
    if (
      targetDecision.decision === 'RETRY' &&
      (providerResult.status === 'SUCCESS' || providerResult.status === 'FAILED')
    ) {
      await this.repository.incrementTransactionRetryCount(tx.id);
      logger.info(
        `[RecoveryExecutor] Incremented retryCount for transaction ${tx.id} (new count: ${tx.retryCount + 1})`
      );
    }

    // 10. Audit Execution Completion
    await this.repository.createAuditLog({
      merchantId: tx.merchantId,
      transactionId: tx.id,
      recoveryAttemptId: attemptRecord.id,
      action: 'RECOVERY_EXECUTION_COMPLETED',
      details: {
        decisionId: targetDecision.id,
        action: targetDecision.decision,
        mode,
        outcome: providerResult.outcomeCode,
        status: providerResult.status,
        amountRecovered:
          targetDecision.decision === 'RETRY' && providerResult.status === 'SUCCESS'
            ? providerResult.amountRecovered
            : 0,
      },
    });

    const executionResult = OutcomeService.buildExecutionResult({
      recoveryAttemptId: attemptRecord.id,
      transactionId: tx.id,
      aiDecisionId: targetDecision.id,
      action: targetDecision.decision,
      providerResult,
      attemptNumber: nextAttemptNumber,
    });

    logger.info(
      `[RecoveryExecutor] Completed execution for transaction ${tx.id}: ${executionResult.action} -> ${executionResult.status} (${executionResult.outcomeCode})`
    );

    return executionResult;
  }

  /**
   * Executes approved Phase 5 decisions in batch across candidate failed transactions.
   *
   * @param limit Maximum number of transactions to execute (max: 100)
   */
  async runBatchExecution(limit = 25): Promise<BatchExecutionSummary> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const startTime = Date.now();

    logger.info(`[RecoveryExecutor] Running batch execution for up to ${safeLimit} transactions`);

    const candidates = await this.repository.getCandidateTransactionsForExecution(safeLimit);

    let executed = 0;
    let succeeded = 0;
    let failed = 0;
    let cancelled = 0;
    let pending = 0;
    let totalAmountRecovered = 0;

    const results: RecoveryExecutionResult[] = [];
    const errors: Array<{ transactionId?: string; decisionId?: string; error: string }> = [];

    for (const tx of candidates) {
      const decision = tx.aiDecisions[0];
      if (!decision) continue;

      try {
        const result = await this.executeDecision({
          transactionId: tx.id,
          decisionId: decision.id,
        });

        results.push(result);
        executed++;

        if (result.status === 'SUCCESS') {
          succeeded++;
          const amt =
            typeof result.amountRecovered === 'number'
              ? result.amountRecovered
              : result.amountRecovered.toNumber();
          totalAmountRecovered += amt;
        } else if (result.status === 'FAILED') {
          failed++;
        } else if (result.status === 'CANCELLED') {
          cancelled++;
        } else if (result.status === 'PENDING') {
          pending++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          `[RecoveryExecutor] Batch execution failed for transaction ${tx.id}: ${message}`
        );
        errors.push({
          transactionId: tx.id,
          decisionId: decision.id,
          error: message,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      success: errors.length === 0,
      processed: candidates.length,
      executed,
      succeeded,
      failed,
      cancelled,
      pending,
      amountRecovered: totalAmountRecovered,
      durationMs,
      results,
      errors,
    };
  }

  /**
   * Side-effect free inspection of the latest recovery attempt for a transaction.
   */
  async getLatestExecution(transactionId: string): Promise<RecoveryExecutionResult | null> {
    const tx = await this.repository.getTransactionWithDetails(transactionId);
    if (!tx || tx.recoveryAttempts.length === 0) {
      return null;
    }

    const latestAttempt = tx.recoveryAttempts[0];
    return {
      recoveryAttemptId: latestAttempt.id,
      transactionId: latestAttempt.transactionId,
      aiDecisionId: latestAttempt.aiDecisionId || '',
      action: latestAttempt.actionType,
      status: latestAttempt.status,
      outcomeCode:
        latestAttempt.status === 'SUCCESS'
          ? latestAttempt.amountRecovered.toNumber() > 0
            ? 'PAYMENT_RECOVERED'
            : 'REMINDER_SIMULATED'
          : latestAttempt.status === 'PENDING'
          ? 'WAIT_SCHEDULED'
          : latestAttempt.status === 'CANCELLED'
          ? 'RECOVERY_STOPPED_BY_POLICY'
          : 'RECOVERY_ATTEMPT_FAILED',
      amountRecovered: latestAttempt.amountRecovered,
      message: latestAttempt.reason || 'Existing attempt record',
      executedAt: latestAttempt.executedAt || undefined,
      scheduledAt: latestAttempt.scheduledAt || undefined,
      attemptNumber: latestAttempt.attemptNumber,
      isIdempotent: false,
    };
  }

  /**
   * Retrieves aggregated execution metrics.
   */
  async getMetrics(): Promise<RecoveryExecutorMetrics> {
    return this.repository.getExecutionMetrics();
  }
}
