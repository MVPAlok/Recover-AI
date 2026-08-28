import { Request, Response } from 'express';
import { DeveloperService } from './developer.service.js';
import { logger } from '../../utils/logger.js';

export class DeveloperController {
  private service = new DeveloperService();

  /**
   * POST /api/developer/webhook-emulator/generate
   */
  generateTestWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventType, transactionId, amount, currency, failureCode, failureReason } = req.body || {};
      const result = this.service.generateTestWebhook({
        eventType,
        transactionId,
        amount,
        currency,
        failureCode,
        failureReason,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      logger.error(`[DeveloperController.generateTestWebhook] Error: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  };

  /**
   * POST /api/developer/webhook-emulator/replay/:eventId
   */
  replayWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        res.status(400).json({ success: false, error: 'Event ID parameter is required' });
        return;
      }

      const result = await this.service.replayWebhook(eventId);
      res.status(200).json(result);
    } catch (err: any) {
      logger.error(`[DeveloperController.replayWebhook] Error: ${err.message}`);
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  };

  /**
   * GET /api/developer/api-keys
   */
  listApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = (req.headers['x-merchant-id'] as string) || 'default_merchant';
      const keys = this.service.listApiKeys(merchantId);
      res.status(200).json({ success: true, data: keys });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  /**
   * POST /api/developer/api-keys
   */
  createApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = (req.headers['x-merchant-id'] as string) || 'default_merchant';
      const { name = 'Developer Secret Key' } = req.body || {};
      const key = await this.service.createApiKey(merchantId, name);
      res.status(201).json({ success: true, data: key });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  /**
   * GET /api/developer/webhooks/subscriptions
   */
  listSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = (req.headers['x-merchant-id'] as string) || 'default_merchant';
      const subs = this.service.listWebhookSubscriptions(merchantId);
      res.status(200).json({ success: true, data: subs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  /**
   * POST /api/developer/webhooks/subscriptions
   */
  registerSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = (req.headers['x-merchant-id'] as string) || 'default_merchant';
      const { url, events = [] } = req.body || {};

      if (!url) {
        res.status(400).json({ success: false, error: 'Destination URL is required' });
        return;
      }

      const sub = this.service.registerWebhookSubscription({ merchantId, url, events });
      res.status(201).json({ success: true, data: sub });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  /**
   * GET /api/developer/audit/export
   */
  exportAuditReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = (req.headers['x-merchant-id'] as string) || 'default_merchant';
      const format = (req.query.format as string) === 'json' ? 'json' : 'csv';
      const limit = req.query.limit ? Number(req.query.limit) : 500;

      const report = await this.service.exportAuditReport({ merchantId, format, limit });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=recoverai_audit_${merchantId}.csv`);
        res.status(200).send(report.data);
      } else {
        res.status(200).json({ success: true, rowCount: report.rowCount, data: JSON.parse(report.data) });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

export const developerController = new DeveloperController();
