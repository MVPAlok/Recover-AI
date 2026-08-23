import { Request, Response, NextFunction } from 'express';
import { systemHealthService } from './system-health.service.js';

export class SystemHealthController {
  /**
   * Serves GET /api/system/health with full service breakdown and operational metrics.
   */
  public getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantId = req.headers['x-merchant-id'] as string | undefined;
      const health = await systemHealthService.getSystemHealth(merchantId);
      const statusCode = health.status === 'critical' ? 503 : 200;
      res.status(statusCode).json(health);
    } catch (error) {
      next(error);
    }
  };
}

export const systemHealthController = new SystemHealthController();
