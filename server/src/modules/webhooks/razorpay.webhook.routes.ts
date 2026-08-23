import { Router } from 'express';
import { RazorpayWebhookController } from './razorpay.webhook.controller.js';

const router = Router();
const controller = new RazorpayWebhookController();

// POST /api/webhooks/razorpay
router.post('/razorpay', controller.handleWebhook);

export const webhookRoutes = router;
