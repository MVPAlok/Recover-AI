import { Router } from 'express';
import { DecisionController } from './decision.controller.js';

const router = Router();
const controller = new DecisionController();

// Batch decision evaluation
router.post('/run', controller.runBatch);

// Single transaction decision inspection (pure / side-effect free)
router.get('/:transactionId/intelligence', controller.getIntelligence);
router.get('/:transactionId', controller.getDecision);

// Single transaction decision evaluation & persistence (AIDecision + AuditLog)
router.post('/:transactionId/decide', controller.decideTransaction);

export default router;
