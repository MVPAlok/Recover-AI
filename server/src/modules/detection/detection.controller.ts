import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { DetectionService } from './detection.service.js';

const batchDetectionSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(50),
  unprocessedOnly: z.boolean().optional().default(true),
});

const transactionIdParamSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
});

export class DetectionController {
  private service: DetectionService;

  constructor(service?: DetectionService) {
    this.service = service || new DetectionService();
  }

  /**
   * POST /api/detection/run
   * Triggers batch scoring on failed transactions.
   */
  runBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedBody = batchDetectionSchema.parse(req.body || {});
      const summary = await this.service.runBatchDetection(
        validatedBody.limit,
        validatedBody.unprocessedOnly
      );

      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/detection/:transactionId
   * Evaluates a single failed transaction without mutating database records.
   */
  getSingle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transactionId } = transactionIdParamSchema.parse(req.params);
      const result = await this.service.analyzeTransaction(transactionId, false);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/detection/:transactionId/analyze
   * Evaluates and explicitly persists the AIDecision record for a specific transaction.
   */
  analyzeAndPersist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transactionId } = transactionIdParamSchema.parse(req.params);
      const result = await this.service.analyzeTransaction(transactionId, true);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
