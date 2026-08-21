import { Router } from 'express';
import { DiagnosisController } from './diagnosis.controller.js';

const router = Router();
const controller = new DiagnosisController();

// POST /api/diagnosis/run - Batch diagnosis on candidate transactions
router.post('/run', controller.runBatch);

// GET /api/diagnosis/:transactionId - Single transaction diagnosis (read-only)
router.get('/:transactionId', controller.getSingle);

// POST /api/diagnosis/:transactionId/analyze - Single transaction diagnosis + AIDecision persistence
router.post('/:transactionId/analyze', controller.analyzeAndPersist);

export default router;
