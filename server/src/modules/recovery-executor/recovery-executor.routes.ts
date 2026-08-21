import { Router } from 'express';
import { RecoveryExecutorController } from './recovery-executor.controller.js';

const router = Router();
const controller = new RecoveryExecutorController();

router.get('/metrics', controller.getMetrics);
router.post('/run', controller.runBatchExecution);
router.post('/:transactionId/execute', controller.executeTransaction);
router.get('/:transactionId', controller.getLatestExecution);

export default router;
