import { logger } from '../../utils/logger.js';
import { DetectionRepository } from './detection.repository.js';
import { BatchDetectionSummary, DetectionResult } from './detection.types.js';
import { FeatureExtractor } from './feature-extractor.js';
import { ScoringEngine } from './scoring-engine.js';

export class DetectionService {
  private repository: DetectionRepository;

  constructor(repository?: DetectionRepository) {
    this.repository = repository || new DetectionRepository();
  }

  /**
   * Analyzes a single transaction by ID.
   *
   * @param transactionId The ID of the transaction to analyze
   * @param persist Whether to persist the AIDecision record to the database
   */
  async analyzeTransaction(
    transactionId: string,
    persist = false
  ): Promise<DetectionResult> {
    logger.info(`[DetectionService] Analyzing transaction: ${transactionId}`);

    const tx = await this.repository.getTransactionWithCustomer(transactionId);
    if (!tx) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    if (tx.status !== 'FAILED') {
      throw new Error(
        `Transaction ${transactionId} has status '${tx.status}'. Detection engine only evaluates FAILED transactions.`
      );
    }

    // Load customer's prior transaction history
    const priorTransactions = await this.repository.getCustomerPriorTransactions(
      tx.customerId,
      tx.createdAt,
      tx.id
    );

    // Extract features
    const features = FeatureExtractor.extract(tx, priorTransactions);

    // Compute score and factors
    const result = ScoringEngine.evaluate(
      tx.id,
      tx.merchantId,
      tx.customerId,
      features
    );

    if (persist) {
      await this.repository.persistAIDecision(result);
      logger.info(
        `[DetectionService] Persisted AIDecision for transaction ${transactionId} (Decision: ${result.recommendedDecision}, Probability: ${result.recoveryProbability})`
      );
    }

    return result;
  }

  /**
   * Runs batch detection scoring over failed transactions.
   *
   * @param limit Maximum number of transactions to evaluate (default: 50, max: 500)
   * @param unprocessedOnly If true, only evaluates transactions without an existing DETECTION AIDecision
   */
  async runBatchDetection(
    limit = 50,
    unprocessedOnly = true
  ): Promise<BatchDetectionSummary> {
    const startTime = Date.now();
    logger.info(
      `[DetectionService] Starting batch detection (Limit: ${limit}, UnprocessedOnly: ${unprocessedOnly})`
    );

    const transactions = unprocessedOnly
      ? await this.repository.getUnprocessedFailedTransactions(limit)
      : await this.repository.getFailedTransactions(limit);

    if (transactions.length === 0) {
      return {
        success: true,
        processed: 0,
        recoverable: 0,
        notRecoverable: 0,
        lowRisk: 0,
        mediumRisk: 0,
        highRisk: 0,
        persistedDecisions: 0,
        durationMs: Date.now() - startTime,
        results: [],
      };
    }

    // Collect all customer IDs to fetch history in a single batch query (No N+1 queries)
    const customerIds = Array.from(new Set(transactions.map((t) => t.customerId)));
    const historyMap = await this.repository.getBatchCustomerHistory(customerIds);

    const results: DetectionResult[] = [];
    let recoverableCount = 0;
    let notRecoverableCount = 0;
    let lowRiskCount = 0;
    let mediumRiskCount = 0;
    let highRiskCount = 0;

    for (const tx of transactions) {
      const allCustomerHistory = historyMap.get(tx.customerId) || [];
      const txCreatedAtTime = new Date(tx.createdAt).getTime();

      // Filter history prior to this transaction
      const priorHistory = allCustomerHistory.filter(
        (h) => h.id !== tx.id && new Date(h.createdAt).getTime() < txCreatedAtTime
      );

      const features = FeatureExtractor.extract(tx, priorHistory);
      const result = ScoringEngine.evaluate(
        tx.id,
        tx.merchantId,
        tx.customerId,
        features
      );

      results.push(result);

      if (result.recoverable) {
        recoverableCount++;
      } else {
        notRecoverableCount++;
      }

      if (result.riskLevel === 'LOW') {
        lowRiskCount++;
      } else if (result.riskLevel === 'MEDIUM') {
        mediumRiskCount++;
      } else {
        highRiskCount++;
      }
    }

    // Batch persist all decisions
    const persistResult = await this.repository.persistAIDecisionsBatch(results);
    const durationMs = Date.now() - startTime;

    logger.info(
      `[DetectionService] Batch detection completed: ${results.length} processed, ${recoverableCount} recoverable, ${persistResult.count} AIDecisions persisted in ${durationMs}ms`
    );

    return {
      success: true,
      processed: results.length,
      recoverable: recoverableCount,
      notRecoverable: notRecoverableCount,
      lowRisk: lowRiskCount,
      mediumRisk: mediumRiskCount,
      highRisk: highRiskCount,
      persistedDecisions: persistResult.count,
      durationMs,
      results: results.map((r) => ({
        transactionId: r.transactionId,
        recoveryProbability: r.recoveryProbability,
        riskLevel: r.riskLevel,
        recoverable: r.recoverable,
        decision: r.recommendedDecision,
      })),
    };
  }
}
