import { Router } from 'express';
import { systemHealthController } from './system-health.controller.js';

const router = Router();

router.get('/', systemHealthController.getHealth);
router.get('/health', systemHealthController.getHealth);

export default router;
