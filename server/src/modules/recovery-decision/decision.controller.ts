import { Request, Response } from 'express';
import { DecisionService } from './decision.service.js';
import { batchDecisionRequestSchema } from './decision-validator.js';
import { logger } from '../../utils/logger.js';

export class DecisionController {
  private service: DecisionService;

  constructor(service?: DecisionService) {
    this.service = service || new DecisionService();
  }

  /**
   * GET /api/recovery-decision/:transactionId
   * Pure inspection of decision policy without side effects (no database writes).
   */
  getDecision = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      if (!transactionId) {
        res.status(400).json({ success: false, error: 'Transaction ID is required' });
        return;
      }

      const result = await this.service.evaluateTransaction(transactionId, false, false);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      logger.error(`[DecisionController.getDecision] Error: ${err.message}`);
      const status = err.message?.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  };

  /**
   * POST /api/recovery-decision/:transactionId/decide
   * Evaluates recovery policy, persists AIDecision & AuditLog, and returns result.
   */
  decideTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      const includeLLMAdvisory = Boolean(req.body?.includeLLMAdvisory);

      if (!transactionId) {
        res.status(400).json({ success: false, error: 'Transaction ID is required' });
        return;
      }

      const result = await this.service.evaluateTransaction(transactionId, true, includeLLMAdvisory);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      logger.error(`[DecisionController.decideTransaction] Error: ${err.message}`);
      const status = err.message?.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  };

  /**
   * POST /api/recovery-decision/run
   * Executes batch decision evaluation on candidate failed transactions.
   */
  runBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = batchDecisionRequestSchema.safeParse(req.body || {});
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        });
        return;
      }

      const { limit, unprocessedOnly } = parseResult.data;
      const includeLLMAdvisory = Boolean(req.body?.includeLLMAdvisory);

      const summary = await this.service.runBatchDecisions(limit, unprocessedOnly, includeLLMAdvisory);
      res.status(200).json(summary);
    } catch (err: any) {
      logger.error(`[DecisionController.runBatch] Error: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  };

  /**
   * GET /api/recovery-decision/:transactionId/intelligence
   * Generates comparative multi-strategy intelligence report with EV and AI counterfactuals.
   */
  getIntelligence = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      if (!transactionId) {
        res.status(400).json({ success: false, error: 'Transaction ID is required' });
        return;
      }

      const { RecoveryIntelligenceService } = await import('./recovery-intelligence.service.js');
      const intelligenceService = new RecoveryIntelligenceService();
      const report = await intelligenceService.generateIntelligenceReport(transactionId);

      res.status(200).json({ success: true, data: report });
    } catch (err: any) {
      logger.error(`[DecisionController.getIntelligence] Error: ${err.message}`);
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  };
}

