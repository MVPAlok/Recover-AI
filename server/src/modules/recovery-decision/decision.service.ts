import { AIAgentType } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { PolicyEngine } from './policy-engine.js';
import { DecisionRepository } from './decision.repository.js';
import { DecisionReasoner } from './decision-reasoner.js';
import {
  BatchDecisionSummary,
  DecisionCustomerInput,
  DecisionDetectionInput,
  DecisionDiagnosisInput,
  DecisionInput,
  DecisionResult,
  DecisionTransactionInput,
} from './decision.types.js';

export class DecisionService {
  private repository: DecisionRepository;
  private reasoner: DecisionReasoner;

  constructor(repository?: DecisionRepository, reasoner?: DecisionReasoner) {
    this.repository = repository || new DecisionRepository();
    this.reasoner = reasoner || new DecisionReasoner();
  }

  /**
   * Evaluates recovery policy for a single failed transaction.
   *
   * @param transactionId ID of the failed transaction
   * @param persist Whether to persist AIDecision and AuditLog records (default: false)
   * @param includeLLMAdvisory Whether to request optional LLM advisory recommendation (default: false)
   */
  async evaluateTransaction(
    transactionId: string,
    persist = false,
    includeLLMAdvisory = false
  ): Promise<DecisionResult> {
    logger.info(`[DecisionService] Evaluating recovery decision for transaction: ${transactionId}`);

    const tx = await this.repository.getTransactionWithDetails(transactionId);
    if (!tx) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    if (tx.status !== 'FAILED') {
      throw new Error(
        `Transaction ${transactionId} has status '${tx.status}'. Recovery Decision Engine only processes FAILED transactions.`
      );
    }

    // Load customer history prior to this transaction
    const priorHistory = await this.repository.getCustomerPriorTransactions(
      tx.customerId,
      tx.createdAt,
      tx.id
    );

    const customerInput = this.buildCustomerContext(priorHistory);
    const txInput = this.buildTransactionContext(tx);
    const detectionInput = this.extractDetectionContext(tx.aiDecisions);
    const diagnosisInput = this.extractDiagnosisContext(tx.aiDecisions);

    const decisionInput: DecisionInput = {
      transaction: txInput,
      customer: customerInput,
      detection: detectionInput,
      diagnosis: diagnosisInput,
    };

    if (includeLLMAdvisory) {
      decisionInput.llmAdvisory = await this.reasoner.generateAdvisory(decisionInput);
    }

    const result = PolicyEngine.evaluate(decisionInput);

    if (persist) {
      await this.repository.persistRecoveryDecision(result);
      logger.info(
        `[DecisionService] Persisted RECOVERY_DECISION (${result.decision}) and AuditLog for transaction ${transactionId}`
      );
    }

    return result;
  }

  /**
   * Evaluates and persists recovery decisions in batch for candidate failed transactions.
   *
   * @param limit Maximum number of transactions to evaluate (max: 100)
   * @param unprocessedOnly If true, only processes transactions lacking a RECOVERY_DECISION
   * @param includeLLMAdvisory If true, requests LLM advisory recommendations
   */
  async runBatchDecisions(
    limit = 25,
    unprocessedOnly = true,
    includeLLMAdvisory = false
  ): Promise<BatchDecisionSummary> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const startTime = Date.now();

    logger.info(
      `[DecisionService] Starting batch decision execution (Limit: ${safeLimit}, UnprocessedOnly: ${unprocessedOnly})`
    );

    const transactions = await this.repository.getCandidateTransactionsForDecision(
      safeLimit,
      unprocessedOnly
    );

    if (transactions.length === 0) {
      return {
        success: true,
        processed: 0,
        successful: 0,
        failed: 0,
        retry: 0,
        remind: 0,
        escalate: 0,
        wait: 0,
        stop: 0,
        policyOverrides: 0,
        persistedDecisions: 0,
        auditLogsCreated: 0,
        revenueAtRisk: 0,
        potentialRecoveryValue: 0,
        durationMs: Date.now() - startTime,
        results: [],
        errors: [],
      };
    }

    // Batch load customer histories
    const customerIds = Array.from(new Set(transactions.map((t) => t.customerId)));
    const historyMap = await this.repository.getBatchCustomerHistory(customerIds);

    const successfulResults: DecisionResult[] = [];
    const errors: Array<{ transactionId: string; error: string }> = [];

    let retryCount = 0;
    let remindCount = 0;
    let escalateCount = 0;
    let waitCount = 0;
    let stopCount = 0;
    let policyOverrides = 0;
    let revenueAtRisk = 0;
    let potentialRecoveryValue = 0;

    for (const tx of transactions) {
      try {
        const amountNum = Number(tx.amount);
        revenueAtRisk += amountNum;

        const allCustHistory = historyMap.get(tx.customerId) || [];
        const txTime = new Date(tx.createdAt).getTime();
        const priorHistory = allCustHistory.filter(
          (h) => h.id !== tx.id && new Date(h.createdAt).getTime() < txTime
        );

        const customerInput = this.buildCustomerContext(priorHistory);
        const txInput = this.buildTransactionContext(tx);
        const detectionInput = this.extractDetectionContext(tx.aiDecisions);
        const diagnosisInput = this.extractDiagnosisContext(tx.aiDecisions);

        const decisionInput: DecisionInput = {
          transaction: txInput,
          customer: customerInput,
          detection: detectionInput,
          diagnosis: diagnosisInput,
        };

        if (includeLLMAdvisory) {
          decisionInput.llmAdvisory = await this.reasoner.generateAdvisory(decisionInput);
        }

        const result = PolicyEngine.evaluate(decisionInput);
        successfulResults.push(result);

        if (result.policyOverride) policyOverrides++;

        switch (result.decision) {
          case 'RETRY':
            retryCount++;
            potentialRecoveryValue += amountNum * (result.detectionProbability || 0.85);
            break;
          case 'REMIND':
            remindCount++;
            potentialRecoveryValue += amountNum * 0.5; // Estimated partial reminder conversion
            break;
          case 'ESCALATE':
            escalateCount++;
            break;
          case 'WAIT':
            waitCount++;
            break;
          case 'STOP':
            stopCount++;
            break;
        }
      } catch (err: any) {
        logger.error(`[DecisionService] Failed decision evaluation for tx ${tx.id}: ${err.message}`);
        errors.push({
          transactionId: tx.id,
          error: err.message || 'Unknown error during decision evaluation',
        });
      }
    }

    // Persist all successful results and audit logs in a single batch transaction
    const persistResult = await this.repository.persistRecoveryDecisionsBatch(successfulResults);
    const durationMs = Date.now() - startTime;

    logger.info(
      `[DecisionService] Batch decision finished: ${successfulResults.length} decisions evaluated, ${persistResult.count} saved in ${durationMs}ms`
    );

    return {
      success: errors.length === 0,
      processed: transactions.length,
      successful: successfulResults.length,
      failed: errors.length,
      retry: retryCount,
      remind: remindCount,
      escalate: escalateCount,
      wait: waitCount,
      stop: stopCount,
      policyOverrides,
      persistedDecisions: persistResult.count,
      auditLogsCreated: persistResult.count,
      revenueAtRisk: Math.round(revenueAtRisk * 100) / 100,
      potentialRecoveryValue: Math.round(potentialRecoveryValue * 100) / 100,
      durationMs,
      results: successfulResults.map((r) => ({
        transactionId: r.transactionId,
        decision: r.decision,
        confidence: r.confidence,
        businessPriority: r.businessPriority,
        reason: r.reason,
      })),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private buildTransactionContext(tx: any): DecisionTransactionInput {
    return {
      id: tx.id,
      merchantId: tx.merchantId,
      customerId: tx.customerId,
      amount: Number(tx.amount),
      currency: tx.currency || 'INR',
      paymentMethod: tx.paymentMethod,
      failureCode: tx.failureCode,
      failureReason: tx.failureReason,
      retryCount: tx.retryCount || 0,
      createdAt: tx.createdAt,
      razorpayPaymentId: tx.razorpayPaymentId,
      razorpayOrderId: tx.razorpayOrderId,
    };
  }

  private buildCustomerContext(priorHistory: Array<{ amount: any; status: string }>): DecisionCustomerInput {
    if (priorHistory.length === 0) {
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        successRate: 0.5,
        failureRate: 0.5,
        consecutiveFailures: 0,
        lifetimeSpend: 0,
        averageTransactionAmount: 0,
        hasHistory: false,
      };
    }

    const total = priorHistory.length;
    const successful = priorHistory.filter((t) => t.status === 'SUCCESS').length;
    const failed = priorHistory.filter((t) => t.status === 'FAILED').length;
    const successRate = total > 0 ? successful / total : 0.5;
    const failureRate = 1 - successRate;

    let consecutiveFailures = 0;
    for (const h of priorHistory) {
      if (h.status === 'FAILED') consecutiveFailures++;
      else break;
    }

    const totalSpend = priorHistory
      .filter((t) => t.status === 'SUCCESS')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const averageAmount = successful > 0 ? totalSpend / successful : 0;

    return {
      totalTransactions: total,
      successfulTransactions: successful,
      failedTransactions: failed,
      successRate,
      failureRate,
      consecutiveFailures,
      lifetimeSpend: totalSpend,
      averageTransactionAmount: averageAmount,
      hasHistory: true,
    };
  }

  private extractDetectionContext(aiDecisions: any[]): DecisionDetectionInput | null {
    const decision = aiDecisions.find((d) => d.agentType === AIAgentType.DETECTION);
    if (!decision) return null;

    const prob = decision.recoveryProbability ?? 0.5;
    return {
      recoveryProbability: prob,
      riskLevel: prob >= 0.75 ? 'LOW' : prob >= 0.45 ? 'MEDIUM' : 'HIGH',
      recoverable: prob >= 0.45,
      confidenceScore: decision.confidenceScore ?? 0.85,
      reasoningSummary: decision.reasoning || '',
    };
  }

  private extractDiagnosisContext(aiDecisions: any[]): DecisionDiagnosisInput | null {
    const decision = aiDecisions.find((d) => d.agentType === AIAgentType.DIAGNOSIS);
    if (!decision) return null;

    const code = decision.reasoning?.includes('TEMPORARY_BANK_FAILURE')
      ? 'TEMPORARY_BANK_FAILURE'
      : decision.reasoning?.includes('TEMPORARY_GATEWAY_FAILURE')
      ? 'TEMPORARY_GATEWAY_FAILURE'
      : decision.reasoning?.includes('CUSTOMER_AUTHENTICATION_FAILURE')
      ? 'CUSTOMER_AUTHENTICATION_FAILURE'
      : decision.reasoning?.includes('INSUFFICIENT_FUNDS')
      ? 'INSUFFICIENT_FUNDS'
      : decision.reasoning?.includes('EXPIRED_PAYMENT_INSTRUMENT')
      ? 'EXPIRED_PAYMENT_INSTRUMENT'
      : decision.reasoning?.includes('CARD_DECLINED')
      ? 'CARD_DECLINED'
      : 'UNKNOWN_PAYMENT_FAILURE';

    return {
      diagnosisCode: code,
      failureCategory: code.startsWith('TEMPORARY') ? 'TEMPORARY_INFRASTRUCTURE' : 'UNKNOWN',
      severity: 'LOW',
      isLikelyTemporary: code.startsWith('TEMPORARY'),
      confidence: decision.confidenceScore ?? 0.85,
      recommendedNextStep: decision.decision === 'RETRY' ? 'EVALUATE_RETRY' : 'NO_RECOVERY_RECOMMENDED',
      reasoning: decision.reasoning || '',
    };
  }
}
