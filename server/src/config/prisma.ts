import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), override: true });

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  let connectionString = process.env.DATABASE_URL || '';

  // Ensure SSL parameters work reliably with node-postgres and Neon Cloud
  if (connectionString.includes('neon.tech')) {
    connectionString = connectionString.replace('&channel_binding=require', '').replace('channel_binding=require&', '');
  }

  const pool = new pg.Pool({
    connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/recoverai',
    ssl: connectionString?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.warn('[Postgres Pool Warning]:', err.message);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = global.prismaInstance || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prismaInstance = prisma;
}

export default prisma;
