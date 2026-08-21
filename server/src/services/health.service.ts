import { HealthResponse } from '../types/health.types.js';

export class HealthService {
  public getHealthStatus(): HealthResponse {
    return {
      success: true,
      service: 'recoverai-api',
      status: 'healthy',
    };
  }
}

export const healthService = new HealthService();
