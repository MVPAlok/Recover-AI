import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const connectionString = process.env.DATABASE_URL;

async function runAuditAndSync() {
  console.log('====================================================');
  console.log('🔍 RECOVERAI SAFE DATABASE SCHEMA SYNCHRONIZATION');
  console.log('====================================================\n');

  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('1. Applying Enums & Type Definitions...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'ANALYST', 'SUPPORT', 'VIEWER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'UNKNOWN');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "TransactionRecoveryStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'RECOVERED', 'NOT_RECOVERED', 'CANCELLED', 'REQUIRES_REVIEW');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'VERIFIED', 'PROCESSING', 'PROCESSED', 'FAILED', 'RETRYING', 'DEAD_LETTER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Enums applied successfully.');

    console.log('2. Syncing Table Columns & Defaults...');
    await pool.query(`
      -- Merchants
      ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

      -- Transactions
      ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'FAILED';
      ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "recoveryStatus" "TransactionRecoveryStatus" NOT NULL DEFAULT 'NOT_STARTED';

      -- AI Decisions
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "isFallback" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "latencyMs" INTEGER;

      -- Razorpay Webhook Events
      CREATE TABLE IF NOT EXISTS "razorpay_webhook_events" (
        "id" TEXT NOT NULL,
        "eventId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
        "processed" BOOLEAN NOT NULL DEFAULT false,
        "errorMessage" TEXT,
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "lastRetriedAt" TIMESTAMP(3),
        "processedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "razorpay_webhook_events_pkey" PRIMARY KEY ("id")
      );

      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED';
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "lastRetriedAt" TIMESTAMP(3);

      -- Backfill existing Transaction states
      UPDATE "transactions" SET "paymentStatus" = 'CAPTURED', "recoveryStatus" = 'RECOVERED' WHERE "status" = 'SUCCESS';
      UPDATE "transactions" SET "paymentStatus" = 'FAILED', "recoveryStatus" = 'NOT_STARTED' WHERE "status" = 'FAILED';
    `);
    console.log('✅ Columns synced & backfilled successfully.');

    console.log('3. Creating High-Performance Indexes...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "razorpay_webhook_events_eventId_key" ON "razorpay_webhook_events"("eventId");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_eventType_idx" ON "razorpay_webhook_events"("eventType");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_status_idx" ON "razorpay_webhook_events"("status");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_createdAt_idx" ON "razorpay_webhook_events"("createdAt");

      CREATE INDEX IF NOT EXISTS "transactions_merchantId_status_idx" ON "transactions"("merchantId", "status");
      CREATE INDEX IF NOT EXISTS "transactions_paymentStatus_idx" ON "transactions"("paymentStatus");
      CREATE INDEX IF NOT EXISTS "transactions_recoveryStatus_idx" ON "transactions"("recoveryStatus");
      CREATE INDEX IF NOT EXISTS "transactions_razorpayOrderId_idx" ON "transactions"("razorpayOrderId");
      CREATE INDEX IF NOT EXISTS "transactions_razorpayPaymentId_idx" ON "transactions"("razorpayPaymentId");
    `);
    console.log('✅ Indexes verified / created successfully.');

    console.log('\n🎉 Safe Database Schema Sync Completed without data loss!');
  } catch (err: unknown) {
    console.error('❌ Migration Sync Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAuditAndSync();
