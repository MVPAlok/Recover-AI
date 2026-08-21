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
}

export const healthController = new HealthController();
