import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service.js';
import { logger } from '../../utils/logger.js';
import { TransactionStatus, RecoveryDecision, RecoveryStatus } from '@prisma/client';

export class DashboardController {
  private service: DashboardService;

  constructor(service?: DashboardService) {
    this.service = service || new DashboardService();
  }

  private getMerchantId(req: Request): string | undefined {
    return (req.headers['x-merchant-id'] as string) || (req.query.merchantId as string) || undefined;
  }

  /**
   * GET /api/dashboard/merchants
   */
  getMerchants = async (_req: Request, res: Response): Promise<void> => {
    try {
      const merchants = await this.service.getMerchants();
      res.status(200).json({ success: true, data: merchants });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getMerchants: ${message}`);
      res.status(500).json({ success: false, error: { code: 'MERCHANT_FETCH_ERROR', message } });
    }
  };

  /**
   * GET /api/dashboard/overview
   */
  getOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = this.getMerchantId(req);
      const overview = await this.service.getOverview(merchantId);
      res.status(200).json({ success: true, data: overview });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getOverview: ${message}`);
      res.status(500).json({ success: false, error: { code: 'OVERVIEW_FETCH_ERROR', message } });
    }
  };

  /**
   * GET /api/dashboard/recovery-opportunities
   */
  getRecoveryOpportunities = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = this.getMerchantId(req);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const opportunities = await this.service.getRecoveryOpportunities(merchantId, limit);
      res.status(200).json({ success: true, data: opportunities });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getRecoveryOpportunities: ${message}`);
      res.status(500).json({ success: false, error: { code: 'OPPORTUNITIES_FETCH_ERROR', message } });
    }
  };

  /**
   * GET /api/transactions
   */
  getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = this.getMerchantId(req);
      const {
        page = '1',
        limit = '25',
        search,
        status,
        decision,
        risk,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await this.service.getTransactions(merchantId, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        search: search as string | undefined,
        status: status as TransactionStatus | undefined,
        decision: decision as RecoveryDecision | undefined,
        risk: risk as 'LOW' | 'MEDIUM' | 'HIGH' | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        sortBy: sortBy as 'createdAt' | 'amount' | 'status' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getTransactions: ${message}`);
      res.status(500).json({ success: false, error: { code: 'TRANSACTIONS_FETCH_ERROR', message } });
    }
  };

  /**
   * GET /api/transactions/:transactionId
   */
  getTransactionDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = this.getMerchantId(req);
      const { transactionId } = req.params;

      if (!transactionId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_PARAMS', message: 'Transaction ID is required' } });
        return;
      }

      const detail = await this.service.getTransactionDetail(merchantId, transactionId);
      res.status(200).json({ success: true, data: detail });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getTransactionDetail: ${message}`);
      res.status(404).json({ success: false, error: { code: 'TRANSACTION_NOT_FOUND', message } });
    }
  };

  /**
   * GET /api/recoveries
   */
  getRecoveries = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = this.getMerchantId(req);
      const { page = '1', limit = '25', status, actionType, search } = req.query;

      const result = await this.service.getRecoveries(merchantId, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        status: status as RecoveryStatus | undefined,
        actionType: actionType as RecoveryDecision | undefined,
        search: search as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getRecoveries: ${message}`);
      res.status(500).json({ success: false, error: { code: 'RECOVERIES_FETCH_ERROR', message } });
    }
  };

  /**
   * GET /api/recoveries/:id
   */
  getRecoveryDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = this.getMerchantId(req);
      const { id } = req.params;

      const detail = await this.service.getRecoveryDetail(merchantId, id);
      res.status(200).json({ success: true, data: detail });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getRecoveryDetail: ${message}`);
      res.status(404).json({ success: false, error: { code: 'RECOVERY_NOT_FOUND', message } });
    }
  };

  /**
   * GET /api/analytics/overview
   */
  getAnalyticsOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = this.getMerchantId(req);
      const analytics = await this.service.getAnalytics(merchantId);
      res.status(200).json({ success: true, data: analytics });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getAnalyticsOverview: ${message}`);
      res.status(500).json({ success: false, error: { code: 'ANALYTICS_FETCH_ERROR', message } });
    }
  };

  /**
   * GET /api/audit-log
   */
  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = this.getMerchantId(req);
      const { page = '1', limit = '50', entityType, action, transactionId } = req.query;

      const result = await this.service.getAuditLogs(merchantId, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        entityType: entityType as string | undefined,
        action: action as string | undefined,
        transactionId: transactionId as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getAuditLogs: ${message}`);
      res.status(500).json({ success: false, error: { code: 'AUDIT_LOG_FETCH_ERROR', message } });
    }
  };

  /**
   * GET /api/integrations/razorpay/status
   */
  getRazorpayStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      const status = await this.service.getRazorpayIntegrationStatus();
      res.status(200).json({ success: true, data: status });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[DashboardController] Error in getRazorpayStatus: ${message}`);
      res.status(500).json({ success: false, error: { code: 'GATEWAY_STATUS_ERROR', message } });
    }
  };
}
