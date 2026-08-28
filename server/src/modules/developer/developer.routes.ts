import { Router } from 'express';
import { developerController } from './developer.controller.js';

const router = Router();

// Webhook Testing & Emulator
router.post('/webhook-emulator/generate', developerController.generateTestWebhook);
router.post('/webhook-emulator/replay/:eventId', developerController.replayWebhook);

// API Keys
router.get('/api-keys', developerController.listApiKeys);
router.post('/api-keys', developerController.createApiKey);

// Outbound Webhooks (RecoverAI -> Merchant)
router.get('/webhooks/subscriptions', developerController.listSubscriptions);
router.post('/webhooks/subscriptions', developerController.registerSubscription);

// Compliance & Audit Export (CSV / JSON)
router.get('/audit/export', developerController.exportAuditReport);

export default router;
