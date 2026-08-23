import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const connectionString = process.env.DATABASE_URL;

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 RECOVERAI MASTER SYSTEM & DATABASE AUDIT');
  console.log('====================================================\n');

  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Ensure razorpay_webhook_events table exists
    console.log('1. Checking & creating razorpay_webhook_events table if missing...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "razorpay_webhook_events" (
        "id" TEXT NOT NULL,
        "eventId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "processed" BOOLEAN NOT NULL DEFAULT false,
        "processedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "razorpay_webhook_events_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "razorpay_webhook_events_eventId_key" ON "razorpay_webhook_events"("eventId");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_eventType_idx" ON "razorpay_webhook_events"("eventType");
      CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_createdAt_idx" ON "razorpay_webhook_events"("createdAt");
    `);
    console.log('✅ Table razorpay_webhook_events verified / created successfully.\n');

    // 2. Fetch PostgreSQL table inventory
    console.log('2. Inspecting actual PostgreSQL tables...');
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name ASC;
    `);
    const tables = tableRes.rows.map((r: { table_name: string }) => r.table_name);
    console.log('Actual Tables in PostgreSQL:', tables);

    // 3. Record counts per table
    console.log('\n3. Database Table Record Counts:');
    const merchantsCount = await prisma.merchant.count();
    const customersCount = await prisma.customer.count();
    const transactionsCount = await prisma.transaction.count();
    const aiDecisionsCount = await prisma.aIDecision.count();
    const recoveryAttemptsCount = await prisma.recoveryAttempt.count();
    const auditLogsCount = await prisma.auditLog.count();
    const webhookEventsCount = await prisma.razorpayWebhookEvent.count();

    console.log(`- Merchants: ${merchantsCount}`);
    console.log(`- Customers: ${customersCount}`);
    console.log(`- Transactions: ${transactionsCount}`);
    console.log(`- AIDecisions: ${aiDecisionsCount}`);
    console.log(`- RecoveryAttempts: ${recoveryAttemptsCount}`);
    console.log(`- AuditLogs: ${auditLogsCount}`);
    console.log(`- RazorpayWebhookEvents: ${webhookEventsCount}`);

    // 4. Breakdown of transactions by merchant
    console.log('\n4. Breakdown by Merchant:');
    const merchants = await prisma.merchant.findMany({
      include: {
        _count: {
          select: {
            transactions: true,
            customers: true,
            recoveryAttempts: true,
            aiDecisions: true,
          },
        },
      },
    });
    for (const m of merchants) {
      console.log(`Merchant "${m.name}" (${m.id}):`);
      console.log(`  - Total Transactions: ${m._count.transactions}`);
      console.log(`  - Customers: ${m._count.customers}`);
      console.log(`  - Recovery Attempts: ${m._count.recoveryAttempts}`);
      console.log(`  - AI Decisions: ${m._count.aiDecisions}`);

      const failedTxCount = await prisma.transaction.count({
        where: { merchantId: m.id, status: 'FAILED' },
      });
      const successTxCount = await prisma.transaction.count({
        where: { merchantId: m.id, status: 'SUCCESS' },
      });
      const pendingTxCount = await prisma.transaction.count({
        where: { merchantId: m.id, status: 'PENDING' },
      });
      console.log(`  - Status breakdown: ${failedTxCount} FAILED, ${successTxCount} SUCCESS, ${pendingTxCount} PENDING`);
    }

    // 5. Data Integrity Audit: Check for orphans
    console.log('\n5. Data Integrity & Orphan Record Audit:');
    const orphanTxRes = await pool.query(`
      SELECT count(*) FROM transactions t 
      LEFT JOIN merchants m ON t."merchantId" = m.id 
      WHERE m.id IS NULL;
    `);
    const orphanCustomerRes = await pool.query(`
      SELECT count(*) FROM customers c 
      LEFT JOIN merchants m ON c."merchantId" = m.id 
      WHERE m.id IS NULL;
    `);
    const orphanAiDecisionsRes = await pool.query(`
      SELECT count(*) FROM ai_decisions a 
      LEFT JOIN transactions t ON a."transactionId" = t.id 
      WHERE t.id IS NULL;
    `);
    const orphanRecoveryAttemptsRes = await pool.query(`
      SELECT count(*) FROM recovery_attempts r 
      LEFT JOIN transactions t ON r."transactionId" = t.id 
      WHERE t.id IS NULL;
    `);
    const orphanAuditLogsRes = await pool.query(`
      SELECT count(*) FROM audit_logs a 
      LEFT JOIN merchants m ON a."merchantId" = m.id 
      WHERE m.id IS NULL;
    `);

    console.log(`- Orphan Transactions: ${orphanTxRes.rows[0].count}`);
    console.log(`- Orphan Customers: ${orphanCustomerRes.rows[0].count}`);
    console.log(`- Orphan AI Decisions: ${orphanAiDecisionsRes.rows[0].count}`);
    console.log(`- Orphan Recovery Attempts: ${orphanRecoveryAttemptsRes.rows[0].count}`);
    console.log(`- Orphan Audit Logs: ${orphanAuditLogsRes.rows[0].count}`);

    // Check negative amounts or invalid states
    const invalidAmounts = await prisma.transaction.count({
      where: { amount: { lt: 0 } },
    });
    const invalidRetries = await prisma.transaction.count({
      where: { retryCount: { lt: 0 } },
    });
    console.log(`- Negative Amounts: ${invalidAmounts}`);
    console.log(`- Negative Retry Counts: ${invalidRetries}`);

    // 6. Financial metric checks for Apex Retail Hub (primary merchant)
    const primaryMerchant = merchants[0];
    if (primaryMerchant) {
      console.log(`\n6. Financial Metric Audit for "${primaryMerchant.name}":`);
      const riskSumRes = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as sum_at_risk, COUNT(*) as failed_count
        FROM transactions
        WHERE "merchantId" = $1 AND status = 'FAILED'
      `, [primaryMerchant.id]);
      
      const recoveredSumRes = await pool.query(`
        SELECT COALESCE(SUM("amountRecovered"), 0) as sum_recovered, COUNT(*) as success_attempts
        FROM recovery_attempts
        WHERE "merchantId" = $1 AND status = 'SUCCESS'
      `, [primaryMerchant.id]);

      const atRisk = Number(riskSumRes.rows[0].sum_at_risk);
      const recovered = Number(recoveredSumRes.rows[0].sum_recovered);
      const rate = atRisk > 0 ? (recovered / atRisk) * 100 : 0;

      console.log(`- Revenue at Risk (DB): ₹${atRisk.toLocaleString('en-IN')}`);
      console.log(`- Revenue Recovered (DB): ₹${recovered.toLocaleString('en-IN')}`);
      console.log(`- Mathematical Recovery Rate: ${rate.toFixed(2)}%`);
      console.log(`- Total Failed Transactions: ${riskSumRes.rows[0].failed_count}`);
      console.log(`- Total Successful Recoveries: ${recoveredSumRes.rows[0].success_attempts}`);
    }

    console.log('\n====================================================');
    console.log('✅ DATABASE INTEGRITY AUDIT COMPLETE');
    console.log('====================================================');
  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runAudit();
