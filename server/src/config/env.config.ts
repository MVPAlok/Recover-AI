import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from root or local .env file
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  RECOVERY_EXECUTION_MODE: z.enum(['simulation', 'razorpay_test']).default('simulation'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_TOLERANCE_SECONDS: z.string().default('300').transform((val) => parseInt(val, 10)),
  REDIS_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

// Security Check: Fail closed immediately if any live Razorpay key or live mode is configured
if (parsedEnv.data.RAZORPAY_KEY_ID?.startsWith('rzp_live_')) {
  console.error('SECURITY ERROR: Live Razorpay credentials (rzp_live_...) are strictly prohibited in RecoverAI Phase 7.');
  process.exit(1);
}

export const config = parsedEnv.data;

