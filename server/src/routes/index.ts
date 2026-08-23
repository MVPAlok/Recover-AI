import { Router } from 'express';
import healthRoutes from './health.routes.js';
import systemHealthRoutes from '../modules/system/system-health.routes.js';
import { healthController } from '../controllers/health.controller.js';
import { detectionRoutes } from '../modules/detection/index.js';
import { diagnosisRoutes } from '../modules/diagnosis/index.js';
import { recoveryDecisionRoutes } from '../modules/recovery-decision/index.js';
import { recoveryExecutorRoutes } from '../modules/recovery-executor/index.js';
import { webhookRoutes } from '../modules/webhooks/index.js';
import { dashboardRoutes } from '../modules/dashboard/index.js';

const router = Router();

// Core Observability Endpoints
router.use('/health', healthRoutes);
router.use('/system', systemHealthRoutes);
router.get('/ready', healthController.checkReadiness);
router.get('/metrics', healthController.getMetrics);

// Subsystem Lifecycle Modules
router.use('/detection', detectionRoutes);
router.use('/diagnosis', diagnosisRoutes);
router.use('/recovery-decision', recoveryDecisionRoutes);
router.use('/recovery-executor', recoveryExecutorRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/', dashboardRoutes);

export default router;
