import { Router } from 'express';
import healthRoutes from './health.routes.js';
import { detectionRoutes } from '../modules/detection/index.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/detection', detectionRoutes);

export default router;
