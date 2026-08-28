import { Router } from 'express';
import { RecoveryExecutorController } from './recovery-executor.controller.js';

const router = Router();
const controller = new RecoveryExecutorController();

router.get('/metrics', controller.getMetrics);
router.post('/run', controller.runBatchExecution);
router.post('/:transactionId/execute', controller.executeTransaction);
router.post('/:transactionId/enqueue', controller.enqueueTransaction);
router.post('/:transactionId/orchestrate', controller.orchestrateAutonomousPipeline);
router.post('/:transactionId/enqueue-pipeline', controller.enqueuePipeline);
router.get('/:transactionId', controller.getLatestExecution);

export default router;
