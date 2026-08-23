export type ServiceStatus =
  | 'healthy'
  | 'degraded'
  | 'unavailable'
  | 'not_configured'
  | 'test_mode'
  | 'unknown';

export type SystemOverallStatus = 'healthy' | 'degraded' | 'critical';

export interface BaseServiceHealth {
  status: ServiceStatus;
  latencyMs?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface PostgresHealth extends BaseServiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
}

export interface RedisHealth extends BaseServiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
}

export interface GeminiHealth extends BaseServiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable' | 'not_configured';
  model?: string;
  fallbackActive: boolean;
  fallbackRate: number; // percentage (0 - 100)
  avgLatencyMs?: number;
}

export interface RazorpayHealth extends BaseServiceHealth {
  status: 'healthy' | 'degraded' | 'not_configured' | 'test_mode';
  mode: 'test';
  keyPrefix?: string;
}

export interface WebhookWorkerHealth extends BaseServiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  lastProcessedAt?: string | null;
  lastEventId?: string | null;
  errorRate: number; // percentage (0 - 100)
  totalEvents24h: number;
}

export interface RecoveryWorkerHealth extends BaseServiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  queueDepth: number;
  activeJobs: number;
  waitingJobs: number;
  failedJobs: number;
  delayedJobs: number;
  concurrency: number;
}

export interface OperationalMetrics {
  lastWebhookSecondsAgo: number | null;
  queueDepth: number;
  failedJobs: number;
  aiFallbackRate: number;
  webhookErrorRate: number;
}

export interface SystemHealthResponse {
  success: boolean;
  status: SystemOverallStatus;
  environment: 'TEST_MODE' | 'PRODUCTION';
  timestamp: string;
  services: {
    postgresql: PostgresHealth;
    redis: RedisHealth;
    gemini: GeminiHealth;
    razorpay: RazorpayHealth;
    webhookWorker: WebhookWorkerHealth;
    recoveryWorker: RecoveryWorkerHealth;
  };
  metrics: OperationalMetrics;
}
