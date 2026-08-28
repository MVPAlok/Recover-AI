import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../config/redis.js';
import { RecoveryExecutorService } from '../recovery-executor/recovery-executor.service.js';
import { RecoveryOrchestratorService } from '../recovery-executor/orchestrator.service.js';
import { RecoveryExecutionJobData, RecoveryJobResult } from './queue.types.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';

export const RECOVERY_QUEUE_NAME = 'recovery-execution-queue';

let recoveryQueue: Queue<RecoveryExecutionJobData, RecoveryJobResult> | undefined;
let recoveryWorker: Worker<RecoveryExecutionJobData, RecoveryJobResult> | undefined;
let executorService: RecoveryExecutorService | undefined;
let orchestratorService: RecoveryOrchestratorService | undefined;

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
    orchestratorService = orchestratorService || new RecoveryOrchestratorService();

    recoveryWorker = new Worker<RecoveryExecutionJobData, RecoveryJobResult>(
      RECOVERY_QUEUE_NAME,
      async (job: Job<RecoveryExecutionJobData, RecoveryJobResult>): Promise<RecoveryJobResult> => {
        const { transactionId, decisionId, executionMode, pipelineType, correlationId, requestId } = job.data;
        logger.info(
          `[QueueWorker] Processing job ${job.id} (Type: ${pipelineType || 'DIRECT_EXECUTION'}) for transaction ${transactionId}`
        );

        try {
          if (pipelineType === 'FULL_AUTONOMOUS_PIPELINE') {
            const pipelineResult = await orchestratorService!.runAutonomousRecovery({
              transactionId,
              correlationId,
              requestId,
              executionMode,
            });

            logger.info(
              `[QueueWorker] Autonomous pipeline job ${job.id} completed: ${pipelineResult.status} (${pipelineResult.message})`
            );

            return {
              success: pipelineResult.success,
              transactionId,
              status: pipelineResult.status,
              outcomeCode: pipelineResult.executionResult?.outcomeCode || pipelineResult.status,
              message: pipelineResult.message,
              correlationId: pipelineResult.correlationId,
              stagesCompleted: pipelineResult.stagesCompleted,
            };
          }

          // Direct Execution
          const result = await executorService!.executeDecision({
            transactionId,
            decisionId,
            executionMode,
          });

          logger.info(
            `[QueueWorker] Direct execution job ${job.id} completed: ${result.action} -> ${result.status} (${result.outcomeCode})`
          );

          return {
            success: true,
            transactionId: result.transactionId,
            status: result.status,
            outcomeCode: result.outcomeCode,
            message: result.message,
          };
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`[QueueWorker] Job ${job.id} failed (Attempt ${job.attemptsMade}/${job.opts.attempts}): ${errorMessage}`);

          // Dead-Letter audit logging on final failed attempt
          if (job.attemptsMade >= (job.opts.attempts || 3)) {
            logger.error(`[QueueWorker] Job ${job.id} reached DEAD_LETTER status after max attempts.`);
            try {
              const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
              if (tx) {
                await prisma.auditLog.create({
                  data: {
                    merchantId: tx.merchantId,
                    transactionId: tx.id,
                    entityType: 'QUEUE_DEAD_LETTER',
                    entityId: job.id || transactionId,
                    action: 'RECOVERY_JOB_DEAD_LETTER_FAILURE',
                    actor: 'BullMQ Queue Worker',
                    actorType: 'SYSTEM_WORKER',
                    correlationId: correlationId || null,
                    requestId: requestId || null,
                    details: {
                      jobId: job.id,
                      attemptsMade: job.attemptsMade,
                      error: errorMessage,
                    },
                  },
                });
              }
            } catch (auditErr) {
              logger.warn(`[QueueWorker] Could not record dead-letter audit log: ${auditErr}`);
            }
          }

          throw err;
        }
      },
      { connection, concurrency: 5 }
    );

    recoveryWorker.on('completed', (job) => {
      logger.info(`[QueueWorker] Event 'completed': Job ${job.id} finished successfully.`);
    });

    recoveryWorker.on('failed', (job, err) => {
      logger.error(`[QueueWorker] Event 'failed': Job ${job?.id} failed with error: ${err.message}`);
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
