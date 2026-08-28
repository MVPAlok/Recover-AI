import { Request, Response } from 'express';
import { RecoveryExecutorService } from './recovery-executor.service.js';
import { logger } from '../../utils/logger.js';

export class RecoveryExecutorController {
  private service: RecoveryExecutorService;

  constructor(service?: RecoveryExecutorService) {
    this.service = service || new RecoveryExecutorService();
  }

  /**
   * POST /api/recovery-executor/:transactionId/execute
   * Safely executes an approved Phase 5 decision for a failed transaction.
   */
  executeTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      const { decisionId } = req.body || {};

      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required in URL parameter',
        });
        return;
      }

      const result = await this.service.executeDecision({
        transactionId,
        decisionId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[RecoveryExecutorController] Error in executeTransaction: ${message}`);
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  };

  /**
   * POST /api/recovery-executor/:transactionId/enqueue
   * Asynchronously enqueues an approved Phase 5 decision into the Redis queue.
   */
  enqueueTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      const { decisionId, executionMode } = req.body || {};

      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required in URL parameter',
        });
        return;
      }

      // Import dynamically to avoid top-level load errors if redis is offline
      const { enqueueRecoveryJob } = await import('../queue/recovery.queue.js');

      const jobId = await enqueueRecoveryJob({
        transactionId,
        decisionId,
        executionMode,
        enqueuedAt: new Date().toISOString(),
      });

      res.status(202).json({
        success: true,
        message: 'Recovery execution job enqueued successfully',
        data: {
          jobId,
          transactionId,
          status: 'QUEUED',
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[RecoveryExecutorController] Error in enqueueTransaction: ${message}`);
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  };

  /**
   * POST /api/recovery-executor/:transactionId/orchestrate
   * Synchronously runs the full 6-stage autonomous recovery pipeline with correlation tracing.
   */
  orchestrateAutonomousPipeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      const { correlationId, requestId, executionMode } = req.body || {};

      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required in URL parameter',
        });
        return;
      }

      const { RecoveryOrchestratorService } = await import('./orchestrator.service.js');
      const orchestrator = new RecoveryOrchestratorService();
      const result = await orchestrator.runAutonomousRecovery({
        transactionId,
        correlationId,
        requestId,
        executionMode,
      });

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[RecoveryExecutorController] Error in orchestrateAutonomousPipeline: ${message}`);
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  };

  /**
   * POST /api/recovery-executor/:transactionId/enqueue-pipeline
   * Asynchronously enqueues the full 6-stage autonomous recovery pipeline into BullMQ.
   */
  enqueuePipeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      const { executionMode, correlationId, requestId } = req.body || {};

      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required in URL parameter',
        });
        return;
      }

      const { enqueueRecoveryJob } = await import('../queue/recovery.queue.js');

      const jobId = await enqueueRecoveryJob({
        transactionId,
        pipelineType: 'FULL_AUTONOMOUS_PIPELINE',
        executionMode,
        correlationId,
        requestId,
        enqueuedAt: new Date().toISOString(),
      });

      res.status(202).json({
        success: true,
        message: 'Full autonomous recovery pipeline enqueued successfully',
        data: {
          jobId,
          transactionId,
          pipelineType: 'FULL_AUTONOMOUS_PIPELINE',
          status: 'QUEUED',
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[RecoveryExecutorController] Error in enqueuePipeline: ${message}`);
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  };

  /**
   * GET /api/recovery-executor/:transactionId
   * Inspects the latest execution/attempt result. Side-effect free.
   */
  getLatestExecution = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required in URL parameter',
        });
        return;
      }

      const execution = await this.service.getLatestExecution(transactionId);
      if (!execution) {
        res.status(404).json({
          success: false,
          error: `No recovery attempt found for transaction ${transactionId}`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: execution,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[RecoveryExecutorController] Error in getLatestExecution: ${message}`);
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  };

  /**
   * POST /api/recovery-executor/run
   * Executes batch decisions across eligible transactions.
   */
  runBatchExecution = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit } = req.body || {};
      const safeLimit = typeof limit === 'number' ? Math.min(100, Math.max(1, limit)) : 25;

      const summary = await this.service.runBatchExecution(safeLimit);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[RecoveryExecutorController] Error in runBatchExecution: ${message}`);
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  };

  /**
   * GET /api/recovery-executor/metrics
   * Retrieves aggregated execution metrics.
   */
  getMetrics = async (_req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await this.service.getMetrics();
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[RecoveryExecutorController] Error in getMetrics: ${message}`);
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  };
}
