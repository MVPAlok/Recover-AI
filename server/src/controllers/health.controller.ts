import { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service.js';

export class HealthController {
  public checkHealth = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const health = healthService.getHealthStatus();
      res.status(200).json(health);
    } catch (error) {
      next(error);
    }
  };

  public checkReadiness = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const readiness = await healthService.getReadinessStatus();
      const statusCode = readiness.status === 'NOT_READY' ? 503 : 200;
      res.status(statusCode).json(readiness);
    } catch (error) {
      next(error);
    }
  };

  public getMetrics = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const metrics = healthService.getMetrics();
      res.status(200).json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  };
}

export const healthController = new HealthController();
