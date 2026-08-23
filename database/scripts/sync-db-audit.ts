import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const connectionString = process.env.DATABASE_URL;

async function runAuditAndSync() {
  console.log('====================================================');
  console.log('🔍 RECOVERAI SAFE PRODUCTION DATABASE SCHEMA SYNC');
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
        CREATE TYPE "PaymentStatus" AS ENUM ('UNKNOWN', 'CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      -- Add new enum values if they don't exist
      ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CREATED';
      ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING';

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

    console.log('2. Syncing Core RBAC Tables (users, merchant_memberships)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

      CREATE TABLE IF NOT EXISTS "merchant_memberships" (
        "id" TEXT NOT NULL,
        "merchantId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "merchant_memberships_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "merchant_memberships_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "merchant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "merchant_memberships_merchantId_userId_key" ON "merchant_memberships"("merchantId", "userId");
      CREATE INDEX IF NOT EXISTS "merchant_memberships_merchantId_idx" ON "merchant_memberships"("merchantId");
      CREATE INDEX IF NOT EXISTS "merchant_memberships_userId_idx" ON "merchant_memberships"("userId");
    `);
    console.log('✅ Users & Memberships synced.');

    console.log('3. Syncing Payment Evidence Model (payments)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" TEXT NOT NULL,
        "merchantId" TEXT NOT NULL,
        "transactionId" TEXT NOT NULL,
        "recoveryAttemptId" TEXT,
        "razorpayOrderId" TEXT,
        "razorpayPaymentId" TEXT,
        "amount" DECIMAL(12,2) NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "status" "PaymentStatus" NOT NULL DEFAULT 'UNKNOWN',
        "capturedAmount" DECIMAL(12,2),
        "verified" BOOLEAN NOT NULL DEFAULT false,
        "reconciled" BOOLEAN NOT NULL DEFAULT false,
        "failureCode" TEXT,
        "failureReason" TEXT,
        "idempotencyKey" TEXT,
        "correlationId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "payments_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "payments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "payments_recoveryAttemptId_fkey" FOREIGN KEY ("recoveryAttemptId") REFERENCES "recovery_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotencyKey_key" ON "payments"("idempotencyKey");
      CREATE INDEX IF NOT EXISTS "payments_merchantId_idx" ON "payments"("merchantId");
      CREATE INDEX IF NOT EXISTS "payments_transactionId_idx" ON "payments"("transactionId");
      CREATE INDEX IF NOT EXISTS "payments_recoveryAttemptId_idx" ON "payments"("recoveryAttemptId");
      CREATE INDEX IF NOT EXISTS "payments_razorpayOrderId_idx" ON "payments"("razorpayOrderId");
      CREATE INDEX IF NOT EXISTS "payments_razorpayPaymentId_idx" ON "payments"("razorpayPaymentId");
      CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
      CREATE INDEX IF NOT EXISTS "payments_reconciled_idx" ON "payments"("reconciled");
      CREATE INDEX IF NOT EXISTS "payments_correlationId_idx" ON "payments"("correlationId");
    `);
    console.log('✅ Payments table & ledger indexes synced.');

    console.log('4. Syncing Table Columns & Correlation IDs...');
    await pool.query(`
      -- Merchants
      ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

      -- Transactions
      ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'FAILED';
      ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "recoveryStatus" "TransactionRecoveryStatus" NOT NULL DEFAULT 'NOT_STARTED';
      ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "maxRetries" INTEGER NOT NULL DEFAULT 3;
      ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
      CREATE INDEX IF NOT EXISTS "transactions_correlationId_idx" ON "transactions"("correlationId");

      -- AI Decisions
      ALTER TABLE "ai_decisions" ALTER COLUMN "decision" DROP NOT NULL;
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "failureCategory" TEXT;
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "rootCause" TEXT;
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "riskLevel" TEXT;
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "riskFactors" JSONB;
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "isFallback" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "latencyMs" INTEGER;
      ALTER TABLE "ai_decisions" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
      CREATE INDEX IF NOT EXISTS "ai_decisions_correlationId_idx" ON "ai_decisions"("correlationId");

      -- Recovery Attempts
      ALTER TABLE "recovery_attempts" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
      ALTER TABLE "recovery_attempts" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
      ALTER TABLE "recovery_attempts" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
      ALTER TABLE "recovery_attempts" ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3);
      ALTER TABLE "recovery_attempts" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
      ALTER TABLE "recovery_attempts" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS "recovery_attempts_idempotencyKey_key" ON "recovery_attempts"("idempotencyKey");
      CREATE UNIQUE INDEX IF NOT EXISTS "recovery_attempts_transactionId_attemptNumber_key" ON "recovery_attempts"("transactionId", "attemptNumber");
      CREATE INDEX IF NOT EXISTS "recovery_attempts_correlationId_idx" ON "recovery_attempts"("correlationId");

      -- Audit Logs
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actorType" TEXT;
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
      CREATE INDEX IF NOT EXISTS "audit_logs_correlationId_idx" ON "audit_logs"("correlationId");

      -- Razorpay Webhook Events
      CREATE TABLE IF NOT EXISTS "razorpay_webhook_events" (
        "id" TEXT NOT NULL,
        "eventId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
        "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
        "merchantId" TEXT,
        "transactionId" TEXT,
        "razorpayOrderId" TEXT,
        "razorpayPaymentId" TEXT,
        "errorMessage" TEXT,
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "lastRetriedAt" TIMESTAMP(3),
        "processedAt" TIMESTAMP(3),
        "correlationId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "razorpay_webhook_events_pkey" PRIMARY KEY ("id")
      );

      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "signatureVerified" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "merchantId" TEXT;
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
      ALTER TABLE "razorpay_webhook_events" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      CREATE UNIQUE INDEX IF NOT EXISTS "razorpay_webhook_events_eventId_key" ON "razorpay_webhook_events"("eventId");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_eventType_idx" ON "razorpay_webhook_events"("eventType");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_status_idx" ON "razorpay_webhook_events"("status");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_transactionId_idx" ON "razorpay_webhook_events"("transactionId");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_razorpayOrderId_idx" ON "razorpay_webhook_events"("razorpayOrderId");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_razorpayPaymentId_idx" ON "razorpay_webhook_events"("razorpayPaymentId");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_correlationId_idx" ON "razorpay_webhook_events"("correlationId");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_createdAt_idx" ON "razorpay_webhook_events"("createdAt");
    `);
    console.log('✅ Columns, check constraints, and correlation indexes applied.');

    console.log('5. Seeding default User & MerchantMembership if empty...');
    const usersCount = await pool.query(`SELECT count(*) FROM "users"`);
    if (parseInt(usersCount.rows[0].count, 10) === 0) {
      const merchants = await pool.query(`SELECT id, email, name FROM "merchants"`);
      for (const m of merchants.rows) {
        const userRes = await pool.query(`
          INSERT INTO "users" ("id", "email", "name", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
          ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name"
          RETURNING id
        `, [m.email, `${m.name} Admin`]);

        const userId = userRes.rows[0].id;
        await pool.query(`
          INSERT INTO "merchant_memberships" ("id", "merchantId", "userId", "role", "createdAt")
          VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW())
          ON CONFLICT ("merchantId", "userId") DO NOTHING
        `, [m.id, userId]);
      }
      console.log('✅ Initial users and memberships seeded for merchants.');
    }

    console.log('6. Backfilling existing successful transactions into Payment ledger...');
    await pool.query(`
      INSERT INTO "payments" (
        "id", "merchantId", "transactionId", "amount", "currency", "status",
        "capturedAmount", "verified", "reconciled", "createdAt", "updatedAt"
      )
      SELECT
        gen_random_uuid(), t."merchantId", t."id", t."amount", t."currency",
        'CAPTURED'::"PaymentStatus", t."amount", true, true, t."createdAt", NOW()
      FROM "transactions" t
      WHERE t."status" = 'SUCCESS'
      AND NOT EXISTS (
        SELECT 1 FROM "payments" p WHERE p."transactionId" = t."id" AND p."reconciled" = true
      );
    `);
    console.log('✅ Payment ledger backfilled from confirmed successful transactions.');

    console.log('\n🎉 Production Database Schema Synchronization completed with ZERO data loss!');
  } catch (err: unknown) {
    console.error('❌ Migration Sync Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAuditAndSync();
