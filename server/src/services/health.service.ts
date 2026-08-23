import { prisma } from '../config/prisma.js';
import { getRedisConnection } from '../config/redis.js';
import { metricsService } from './metrics.service.js';

export interface ReadinessCheck {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface SystemReadinessResponse {
  success: boolean;
  status: 'READY' | 'NOT_READY' | 'DEGRADED';
  environment: string;
  timestamp: string;
  checks: {
    postgres: ReadinessCheck;
    redis: ReadinessCheck;
    geminiAi: ReadinessCheck;
    razorpayTest: ReadinessCheck;
  };
}

export class HealthService {
  private startTime = Date.now();

  public getHealthStatus() {
    return {
      success: true,
      service: 'recoverai-api',
      status: 'healthy',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  public async getReadinessStatus(): Promise<SystemReadinessResponse> {
    const checks: SystemReadinessResponse['checks'] = {
      postgres: { status: 'DOWN' },
      redis: { status: 'DOWN' },
      geminiAi: { status: 'DOWN' },
      razorpayTest: { status: 'DOWN' },
    };

    // 1. Check PostgreSQL Database
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = {
        status: 'UP',
        latencyMs: Date.now() - dbStart,
        message: 'Neon PostgreSQL connected & responsive',
      };
    } catch (err: any) {
      checks.postgres = {
        status: 'DOWN',
        latencyMs: Date.now() - dbStart,
        message: `PostgreSQL connection failed: ${err.message}`,
      };
    }

    // 2. Check Redis
    const redisStart = Date.now();
    try {
      if (process.env.ENABLE_REDIS === 'true') {
        const redis = getRedisConnection();
        const pong = await redis.ping();
        checks.redis = {
          status: pong === 'PONG' ? 'UP' : 'DEGRADED',
          latencyMs: Date.now() - redisStart,
          message: 'Upstash Redis queue operational',
        };
      } else {
        checks.redis = {
          status: 'UP',
          message: 'Redis queue is disabled via ENABLE_REDIS=false (in-memory mode)',
        };
      }
    } catch (err: any) {
      checks.redis = {
        status: 'DEGRADED',
        latencyMs: Date.now() - redisStart,
        message: `Redis unavailable (${err.message}). In-memory execution active.`,
      };
    }

    // 3. Check Gemini AI Configuration
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    const model = process.env.LLM_MODEL || 'gemini-3.5-flash-lite';
    if (apiKey && apiKey.startsWith('AIzaSy')) {
      checks.geminiAi = {
        status: 'UP',
        message: 'Google Gemini LLM configured with structured JSON schema',
        details: { model, provider: 'openai-compatible (gemini)' },
      };
    } else {
      checks.geminiAi = {
        status: 'DEGRADED',
        message: 'No active Gemini key found. Deterministic fallback active.',
        details: { fallbackActive: true },
      };
    }

    // 4. Check Razorpay Test Sandbox
    const rzpKey = process.env.RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
    if (rzpKey && rzpKey.startsWith('rzp_test_') && rzpSecret) {
      checks.razorpayTest = {
        status: 'UP',
        message: 'Razorpay Test Sandbox credentials configured',
        details: { mode: 'TEST_MODE', keyPrefix: rzpKey.slice(0, 8) },
      };
    } else {
      checks.razorpayTest = {
        status: 'DEGRADED',
        message: 'Razorpay Test credentials missing or invalid prefix',
      };
    }

    const isReady = checks.postgres.status === 'UP';
    const isDegraded =
      checks.redis.status === 'DEGRADED' ||
      checks.geminiAi.status === 'DEGRADED' ||
      checks.razorpayTest.status === 'DEGRADED';

    return {
      success: isReady,
      status: !isReady ? 'NOT_READY' : isDegraded ? 'DEGRADED' : 'READY',
      environment: 'TEST_MODE',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  public getMetrics() {
    return metricsService.getSnapshot();
  }
}

export const healthService = new HealthService();
