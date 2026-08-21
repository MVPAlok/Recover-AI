import { Router } from 'express';
import healthRoutes from './health.routes.js';
import { detectionRoutes } from '../modules/detection/index.js';
import { diagnosisRoutes } from '../modules/diagnosis/index.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/detection', detectionRoutes);
router.use('/diagnosis', diagnosisRoutes);

export default router;
