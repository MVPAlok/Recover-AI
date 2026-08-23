import { Request, Response } from 'express';
import { logger } from '../../utils/logger.js';
import { RazorpayError, RazorpayWebhookSignatureError } from '../../integrations/razorpay/razorpay.errors.js';
import { RazorpayWebhookService } from './razorpay.webhook.service.js';

export class RazorpayWebhookController {
  constructor(private service: RazorpayWebhookService = new RazorpayWebhookService()) {}

  /**
   * Handles POST /api/webhooks/razorpay
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const headerEventId = req.headers['x-razorpay-event-id'] as string | undefined;
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));

    try {
      logger.info(
        `[RazorpayWebhookController] Incoming webhook (signature: ${signature ? 'provided' : 'missing'}, eventId: ${headerEventId || 'header-absent'})`
      );

      const result = await this.service.handleWebhook({
        rawBody,
        signature,
        headerEventId,
        bodyPayload: req.body,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof RazorpayWebhookSignatureError) {
        logger.warn(`[RazorpayWebhookController] Webhook signature rejection: ${err.message}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: err.message,
          },
        });
        return;
      }

      if (err instanceof RazorpayError) {
        logger.error(`[RazorpayWebhookController] Webhook error: ${err.message}`, err);
        res.status(err.statusCode || 400).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }

      logger.error(`[RazorpayWebhookController] Unexpected webhook processing failure: ${err.message}`, err);
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Internal error processing webhook.',
        },
      });
    }
  };
}
