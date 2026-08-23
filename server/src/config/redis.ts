import { Redis } from 'ioredis';
import { config } from './env.config.js';
import { logger } from '../utils/logger.js';

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
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
      });
    } else {
      redisConnection = new Redis({
        ...redisConfig,
        lazyConnect: true,
      });
    }

    redisConnection.on('error', (err) => {
      logger.warn(`[Redis] Connection warning/error: ${err.message}`);
    });

    redisConnection.on('connect', () => {
      logger.info('[Redis] Connected successfully.');
    });
  }

  return redisConnection;
}
