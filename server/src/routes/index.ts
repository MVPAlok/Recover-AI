import { Router } from 'express';
import healthRoutes from './health.routes.js';
import { detectionRoutes } from '../modules/detection/index.js';
import { diagnosisRoutes } from '../modules/diagnosis/index.js';
import { recoveryDecisionRoutes } from '../modules/recovery-decision/index.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/detection', detectionRoutes);
router.use('/diagnosis', diagnosisRoutes);
router.use('/recovery-decision', recoveryDecisionRoutes);

export default router;

