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
    if (process.env.ENABLE_REDIS !== 'true' || times > 5) {
      return null;
    }
    return Math.min(times * 500, 2000);
  },
};

export function createRedisConnection(): Redis {
  const redisUrl = config?.REDIS_URL || process.env.REDIS_URL;
  let client: Redis;

  if (redisUrl) {
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      retryStrategy: (times: number) => {
        if (process.env.ENABLE_REDIS !== 'true' || times > 5) {
          return null;
        }
        return Math.min(times * 500, 2000);
      },
    });
  } else {
    client = new Redis(redisConfig);
  }

  client.on('error', (err) => {
    if (process.env.ENABLE_REDIS === 'true') {
      logger.warn(`[Redis] Connection warning: ${err.message}`);
    }
  });

  client.on('connect', () => {
    logger.info('[Redis] Connected successfully.');
  });

  return client;
}

let redisConnection: Redis | undefined;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = createRedisConnection();
  }
  return redisConnection;
}

