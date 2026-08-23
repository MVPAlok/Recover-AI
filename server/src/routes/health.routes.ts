import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

const router = Router();

router.get('/', healthController.checkHealth);
router.get('/ready', healthController.checkReadiness);
router.get('/metrics', healthController.getMetrics);

export default router;
