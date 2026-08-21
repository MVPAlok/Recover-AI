import { AIAgentType } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { DiagnosisContextBuilder } from './context-builder.js';
import { DiagnosisAgent } from './diagnosis-agent.js';
import { DiagnosisRepository } from './diagnosis.repository.js';
import { BatchDiagnosisSummary, DiagnosisResult } from './diagnosis.types.js';

export class DiagnosisService {
  private repository: DiagnosisRepository;
  private agent: DiagnosisAgent;

  constructor(repository?: DiagnosisRepository, agent?: DiagnosisAgent) {
    this.repository = repository || new DiagnosisRepository();
    this.agent = agent || new DiagnosisAgent();
  }

  /**
   * Diagnoses a single failed transaction.
   *
   * @param transactionId ID of the failed transaction
   * @param persist Whether to record an AIDecision in PostgreSQL (default: false)
   */
  async diagnoseTransaction(
    transactionId: string,
    persist = false
  ): Promise<DiagnosisResult> {
    logger.info(`[DiagnosisService] Diagnosing transaction: ${transactionId}`);

    const tx = await this.repository.getTransactionWithDetails(transactionId);
    if (!tx) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    if (tx.status !== 'FAILED') {
      throw new Error(
        `Transaction ${transactionId} has status '${tx.status}'. Diagnosis Agent only analyzes FAILED transactions.`
      );
    }

    // Load customer history prior to this transaction
    const priorHistory = await this.repository.getCustomerPriorTransactions(
      tx.customerId,
      tx.createdAt,
      tx.id
    );

    // Retrieve Detection decision if available
    const detectionDecision = tx.aiDecisions.find(
      (d) => d.agentType === AIAgentType.DETECTION
    );

    // Build context
    const context = DiagnosisContextBuilder.build(tx, priorHistory, detectionDecision);

    // Run agent reasoning
    const result = await this.agent.diagnose(context, tx.merchantId);
    result.customerId = tx.customerId;

    if (persist) {
      await this.repository.persistDiagnosisDecision(result);
      logger.info(
        `[DiagnosisService] Persisted DIAGNOSIS decision for transaction ${transactionId}`
      );
    }

    return result;
  }

  /**
   * Runs batch diagnosis on failed transactions.
   *
   * @param limit Maximum number of transactions to diagnose (max: 100)
   * @param unprocessedOnly If true, only analyzes transactions lacking a DIAGNOSIS decision
   */
  async runBatchDiagnosis(
    limit = 25,
    unprocessedOnly = true
  ): Promise<BatchDiagnosisSummary> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const startTime = Date.now();

    logger.info(
      `[DiagnosisService] Starting batch diagnosis (Limit: ${safeLimit}, UnprocessedOnly: ${unprocessedOnly})`
    );

    const transactions = await this.repository.getCandidateTransactionsForDiagnosis(
      safeLimit,
      unprocessedOnly
    );

    if (transactions.length === 0) {
      return {
        success: true,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        lowSeverity: 0,
        mediumSeverity: 0,
        highSeverity: 0,
        persistedDecisions: 0,
        durationMs: Date.now() - startTime,
        results: [],
        errors: [],
      };
    }

    // Batch load all customer history to eliminate N+1 queries
    const customerIds = Array.from(new Set(transactions.map((t) => t.customerId)));
    const historyMap = await this.repository.getBatchCustomerHistory(customerIds);

    const successfulResults: DiagnosisResult[] = [];
    const errors: Array<{ transactionId: string; error: string }> = [];

    let lowSeverity = 0;
    let mediumSeverity = 0;
    let highSeverity = 0;

    for (const tx of transactions) {
      try {
        const allCustHistory = historyMap.get(tx.customerId) || [];
        const txTime = new Date(tx.createdAt).getTime();

        const priorHistory = allCustHistory.filter(
          (h) => h.id !== tx.id && new Date(h.createdAt).getTime() < txTime
        );

        const detectionDecision = tx.aiDecisions[0] || null;

        const context = DiagnosisContextBuilder.build(tx, priorHistory, detectionDecision);
        const result = await this.agent.diagnose(context, tx.merchantId);
        result.customerId = tx.customerId;

        successfulResults.push(result);

        if (result.severity === 'LOW') lowSeverity++;
        else if (result.severity === 'MEDIUM') mediumSeverity++;
        else highSeverity++;
      } catch (err: any) {
        logger.error(
          `[DiagnosisService] Failed diagnosing transaction ${tx.id}: ${err.message}`
        );
        errors.push({
          transactionId: tx.id,
          error: err.message || 'Unknown diagnosis error',
        });
      }
    }

    // Batch persist successful decisions
    const persistResult = await this.repository.persistDiagnosisDecisionsBatch(
      successfulResults
    );
    const durationMs = Date.now() - startTime;

    logger.info(
      `[DiagnosisService] Batch diagnosis finished: ${successfulResults.length} succeeded, ${errors.length} failed, ${persistResult.count} persisted in ${durationMs}ms`
    );

    return {
      success: errors.length === 0,
      processed: transactions.length,
      successful: successfulResults.length,
      failed: errors.length,
      skipped: 0,
      lowSeverity,
      mediumSeverity,
      highSeverity,
      persistedDecisions: persistResult.count,
      durationMs,
      results: successfulResults.map((r) => ({
        transactionId: r.transactionId,
        diagnosisCode: r.diagnosisCode,
        failureCategory: r.failureCategory,
        confidence: r.confidence,
        severity: r.severity,
        recommendedNextStep: r.recommendedNextStep,
      })),
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
