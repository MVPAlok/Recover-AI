import { Router } from 'express';
import healthRoutes from './health.routes.js';
import { detectionRoutes } from '../modules/detection/index.js';
import { diagnosisRoutes } from '../modules/diagnosis/index.js';
import { recoveryDecisionRoutes } from '../modules/recovery-decision/index.js';
import { recoveryExecutorRoutes } from '../modules/recovery-executor/index.js';
import { webhookRoutes } from '../modules/webhooks/index.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/detection', detectionRoutes);
router.use('/diagnosis', diagnosisRoutes);
router.use('/recovery-decision', recoveryDecisionRoutes);
router.use('/recovery-executor', recoveryExecutorRoutes);
router.use('/webhooks', webhookRoutes);

export default router;

