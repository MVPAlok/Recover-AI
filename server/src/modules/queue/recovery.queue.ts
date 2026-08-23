import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../config/redis.js';
import { RecoveryExecutorService } from '../recovery-executor/recovery-executor.service.js';
import { RecoveryExecutionJobData, RecoveryJobResult } from './queue.types.js';
import { logger } from '../../utils/logger.js';

export const RECOVERY_QUEUE_NAME = 'recovery-execution-queue';

let recoveryQueue: Queue<RecoveryExecutionJobData, RecoveryJobResult> | undefined;
let recoveryWorker: Worker<RecoveryExecutionJobData, RecoveryJobResult> | undefined;
let executorService: RecoveryExecutorService | undefined;

/**
 * Gets or initializes the BullMQ Recovery Queue instance.
 */
export function getRecoveryQueue(): Queue<RecoveryExecutionJobData, RecoveryJobResult> {
  if (!recoveryQueue) {
    const connection = createRedisConnection();
    recoveryQueue = new Queue<RecoveryExecutionJobData, RecoveryJobResult>(RECOVERY_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return recoveryQueue;
}

/**
 * Initializes and starts the BullMQ Worker for background processing.
 */
export function startRecoveryWorker(): Worker<RecoveryExecutionJobData, RecoveryJobResult> {
  if (!recoveryWorker) {
    const connection = createRedisConnection();
    executorService = executorService || new RecoveryExecutorService();

    recoveryWorker = new Worker<RecoveryExecutionJobData, RecoveryJobResult>(
      RECOVERY_QUEUE_NAME,
      async (job: Job<RecoveryExecutionJobData, RecoveryJobResult>): Promise<RecoveryJobResult> => {
        logger.info(`[QueueWorker] Processing job ${job.id} for transaction ${job.data.transactionId}`);

        try {
          const result = await executorService!.executeDecision({
            transactionId: job.data.transactionId,
            decisionId: job.data.decisionId,
            executionMode: job.data.executionMode,
          });

          logger.info(`[QueueWorker] Job ${job.id} completed: ${result.action} -> ${result.status} (${result.outcomeCode})`);

          return {
            success: true,
            transactionId: result.transactionId,
            status: result.status,
            outcomeCode: result.outcomeCode,
            message: result.message,
          };
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`[QueueWorker] Job ${job.id} failed: ${errorMessage}`);
          throw err;
        }
      },
      { connection, concurrency: 5 }
    );

    recoveryWorker.on('completed', (job) => {
      logger.info(`[QueueWorker] Event 'completed': Job ${job.id} finished successfully.`);
    });

    recoveryWorker.on('failed', (job, err) => {
      logger.error(`[QueueWorker] Event 'failed': Job ${job?.id} failed with error ${err.message}`);
    });
  }

  return recoveryWorker;
}

/**
 * Helper utility to enqueue a recovery job into the queue.
 */
export async function enqueueRecoveryJob(data: RecoveryExecutionJobData): Promise<string> {
  const queue = getRecoveryQueue();
  const job = await queue.add(`execute-${data.transactionId}`, data);
  logger.info(`[QueueService] Enqueued job ${job.id} for transaction ${data.transactionId}`);
  return job.id || data.transactionId;
}
