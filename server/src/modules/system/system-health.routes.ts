import { Router } from 'express';
import { systemHealthController } from './system-health.controller.js';

const router = Router();

router.get('/', systemHealthController.getHealth);
router.get('/health', systemHealthController.getHealth);
router.get('/financial-safety', systemHealthController.getFinancialSafety);
router.post('/financial-safety/reset-circuit-breaker', systemHealthController.resetCircuitBreaker);

export default router;
