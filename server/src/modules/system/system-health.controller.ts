import { Request, Response, NextFunction } from 'express';
import { systemHealthService } from './system-health.service.js';
import { FinancialSafetyService } from './financial-safety.service.js';

export class SystemHealthController {
  private safetyService = new FinancialSafetyService();

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

  /**
   * Serves GET /api/system/financial-safety
   * Exposes real-time circuit breaker states, merchant daily budget usage, and model drift telemetry.
   */
  public getFinancialSafety = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantId = (req.headers['x-merchant-id'] as string) || 'default_merchant';
      const circuitBreaker = this.safetyService.getCircuitBreakerStatus(merchantId);
      const driftMetrics = await this.safetyService.evaluateModelDrift(merchantId);

      res.status(200).json({
        success: true,
        data: {
          merchantId,
          circuitBreaker,
          driftMetrics,
          financialSafetyScore: circuitBreaker.state === 'CLOSED' && driftMetrics.driftStatus === 'NOMINAL' ? 98.5 : 74.0,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Serves POST /api/system/financial-safety/reset-circuit-breaker
   */
  public resetCircuitBreaker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantId = (req.headers['x-merchant-id'] as string) || req.body?.merchantId || 'default_merchant';
      this.safetyService.resetCircuitBreaker(merchantId);

      res.status(200).json({
        success: true,
        message: `Circuit breaker reset to CLOSED for merchant ${merchantId}`,
        state: 'CLOSED',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const systemHealthController = new SystemHealthController();
