import { Router } from 'express';
import { DetectionController } from './detection.controller.js';

const router = Router();
const controller = new DetectionController();

// POST /api/detection/run - Batch analyze failed transactions
router.post('/run', controller.runBatch);

// GET /api/detection/:transactionId - Single transaction analysis (read-only)
router.get('/:transactionId', controller.getSingle);

// POST /api/detection/:transactionId/analyze - Single transaction analysis + AIDecision persistence
router.post('/:transactionId/analyze', controller.analyzeAndPersist);

export default router;
