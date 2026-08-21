import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { DiagnosisService } from './diagnosis.service.js';

const batchDiagnosisSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(25),
  unprocessedOnly: z.boolean().optional().default(true),
});

const transactionIdParamSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
});

export class DiagnosisController {
  private service: DiagnosisService;

  constructor(service?: DiagnosisService) {
    this.service = service || new DiagnosisService();
  }

  /**
   * GET /api/diagnosis/:transactionId
   * Evaluates diagnosis on a single transaction without creating side-effects.
   */
  getSingle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transactionId } = transactionIdParamSchema.parse(req.params);
      const result = await this.service.diagnoseTransaction(transactionId, false);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/diagnosis/:transactionId/analyze
   * Evaluates diagnosis and persists an AIDecision record to PostgreSQL.
   */
  analyzeAndPersist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transactionId } = transactionIdParamSchema.parse(req.params);
      const result = await this.service.diagnoseTransaction(transactionId, true);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/diagnosis/run
   * Executes batch AI diagnosis on candidate failed transactions.
   */
  runBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedBody = batchDiagnosisSchema.parse(req.body || {});
      const summary = await this.service.runBatchDiagnosis(
        validatedBody.limit,
        validatedBody.unprocessedOnly
      );

      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  };
}
