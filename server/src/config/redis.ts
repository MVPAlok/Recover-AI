import { Redis } from 'ioredis';
import { config } from './env.config.js';
import { logger } from '../utils/logger.js';

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: (times: number) => {
    if (process.env.ENABLE_REDIS !== 'true' || times > 2) {
      return null; // Stop retrying immediately if Redis is disabled or failed twice
    }
    return Math.min(times * 500, 2000);
  },
};

let redisConnection: Redis | undefined;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const redisUrl = config?.REDIS_URL || process.env.REDIS_URL;
    if (redisUrl) {
      redisConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (process.env.ENABLE_REDIS !== 'true' || times > 2) {
            return null;
          }
          return Math.min(times * 500, 2000);
        },
      });
    } else {
      redisConnection = new Redis(redisConfig);
    }

    redisConnection.on('error', (err) => {
      if (process.env.ENABLE_REDIS === 'true') {
        logger.warn(`[Redis] Connection warning: ${err.message}`);
      }
    });

    redisConnection.on('connect', () => {
      logger.info('[Redis] Connected successfully.');
    });
  }

  return redisConnection;
}
