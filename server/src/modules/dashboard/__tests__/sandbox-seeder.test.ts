import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SandboxSeederService } from '../sandbox-seeder.service.js';
import { PrismaClient, TransactionStatus, PaymentStatus, RecoveryStatus, RecoveryDecision } from '@prisma/client';

function createMockPrisma() {
  const merchants: any[] = [{ id: 'mer_test_sandbox_1', name: 'Sandbox Merchant', email: 'sandbox@test.example' }];
  const customers: any[] = [];
  const transactions: any[] = [];
  const aiDecisions: any[] = [];
  const recoveryAttempts: any[] = [];
  const payments: any[] = [];
  const auditLogs: any[] = [];

  const db: any = {
    customer: {
      findFirst: async ({ where }: any) => {
        return customers.find(c => c.merchantId === where.merchantId && (!where.email || c.email === where.email)) || null;
      },
      findMany: async ({ where }: any) => {
        return customers.filter(c => !where || !where.merchantId || c.merchantId === where.merchantId);
      },
      create: async ({ data }: any) => {
        const item = { id: data.id || `cust_${customers.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        customers.push(item);
        return item;
      },
      createMany: async ({ data }: any) => {
        for (const d of data) {
          customers.push({ id: d.id || `cust_${customers.length + 1}`, ...d, createdAt: new Date(), updatedAt: new Date() });
        }
        return { count: data.length };
      },
    },
    transaction: {
      create: async ({ data }: any) => {
        const item = { id: data.id || `txn_${transactions.length + 1}`, ...data };
        transactions.push(item);
        return item;
      },
      createMany: async ({ data }: any) => {
        for (const d of data) {
          transactions.push({ id: d.id || `txn_${transactions.length + 1}`, ...d });
        }
        return { count: data.length };
      },
      count: async ({ where }: any) => {
        return transactions.filter(t => t.merchantId === where.merchantId).length;
      },
      deleteMany: async ({ where }: any) => {
        const initial = transactions.length;
        const remaining = transactions.filter(t => t.merchantId !== where.merchantId);
        transactions.length = 0;
        transactions.push(...remaining);
        return { count: initial - remaining.length };
      },
    },
    aIDecision: {
      create: async ({ data }: any) => {
        const item = { id: data.id || `dec_${aiDecisions.length + 1}`, ...data };
        aiDecisions.push(item);
        return item;
      },
      createMany: async ({ data }: any) => {
        for (const d of data) {
          aiDecisions.push({ id: d.id || `dec_${aiDecisions.length + 1}`, ...d });
        }
        return { count: data.length };
      },
      deleteMany: async ({ where }: any) => {
        const initial = aiDecisions.length;
        const remaining = aiDecisions.filter(d => d.merchantId !== where.merchantId);
        aiDecisions.length = 0;
        aiDecisions.push(...remaining);
        return { count: initial - remaining.length };
      },
    },
    recoveryAttempt: {
      create: async ({ data }: any) => {
        const item = { id: data.id || `att_${recoveryAttempts.length + 1}`, ...data };
        recoveryAttempts.push(item);
        return item;
      },
      createMany: async ({ data }: any) => {
        for (const d of data) {
          recoveryAttempts.push({ id: d.id || `att_${recoveryAttempts.length + 1}`, ...d });
        }
        return { count: data.length };
      },
      count: async ({ where }: any) => {
        return recoveryAttempts.filter(a => a.merchantId === where.merchantId).length;
      },
      deleteMany: async ({ where }: any) => {
        const initial = recoveryAttempts.length;
        const remaining = recoveryAttempts.filter(a => a.merchantId !== where.merchantId);
        recoveryAttempts.length = 0;
        recoveryAttempts.push(...remaining);
        return { count: initial - remaining.length };
      },
    },
    payment: {
      create: async ({ data }: any) => {
        const item = { id: data.id || `pay_${payments.length + 1}`, ...data };
        payments.push(item);
        return item;
      },
      createMany: async ({ data }: any) => {
        for (const d of data) {
          payments.push({ id: d.id || `pay_${payments.length + 1}`, ...d });
        }
        return { count: data.length };
      },
      deleteMany: async ({ where }: any) => {
        const initial = payments.length;
        const remaining = payments.filter(p => p.merchantId !== where.merchantId);
        payments.length = 0;
        payments.push(...remaining);
        return { count: initial - remaining.length };
      },
      aggregate: async ({ where }: any) => {
        const matched = payments.filter(p => p.merchantId === where.merchantId && p.status === PaymentStatus.CAPTURED);
        const sum = matched.reduce((acc, curr) => acc + curr.amount, 0);
        return { _sum: { amount: sum } };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const item = { id: data.id || `aud_${auditLogs.length + 1}`, ...data };
        auditLogs.push(item);
        return item;
      },
      createMany: async ({ data }: any) => {
        for (const d of data) {
          auditLogs.push({ id: d.id || `aud_${auditLogs.length + 1}`, ...d });
        }
        return { count: data.length };
      },
      count: async ({ where }: any) => {
        return auditLogs.filter(a => a.merchantId === where.merchantId).length;
      },
      deleteMany: async ({ where }: any) => {
        const initial = auditLogs.length;
        const remaining = auditLogs.filter(a => a.merchantId !== where.merchantId);
        auditLogs.length = 0;
        auditLogs.push(...remaining);
        return { count: initial - remaining.length };
      },
    },
    $transaction: async (promises: any[]) => {
      return Promise.all(promises);
    },
  };

  return { db, merchants, customers, transactions, aiDecisions, recoveryAttempts, payments, auditLogs };
}

describe('SandboxSeederService — Structured Scenario Generation & Simulation', () => {
  it('seeds 42 structured scenario transactions with diverse lifecycles and audit trails', async () => {
    const mock = createMockPrisma();
    const seeder = new SandboxSeederService(mock.db as unknown as PrismaClient);

    const result = await seeder.seedMerchantSandbox('mer_test_sandbox_1', 'INR');

    assert.equal(result.transactionsCount, 42, 'Must seed exactly 42 structured transactions');
    assert.equal(mock.transactions.length, 42, 'Database must contain 42 transaction rows');
    assert.ok(mock.customers.length >= 10, 'Must create at least 10 distinct customer records');
    assert.ok(mock.aiDecisions.length === 42, 'Every transaction must have an AI Decision record');
    assert.ok(mock.recoveryAttempts.length >= 30, 'Actionable transactions must have recovery attempts');
    assert.ok(mock.auditLogs.length >= 80, 'Full audit trail events must be recorded in the database');
    assert.ok(result.recoveredAmount > 0, 'Total recovered amount must reflect successful captures');

    // Verify synthetic labeling
    const sampleAudit = mock.auditLogs[0];
    assert.equal(sampleAudit.details.environment, 'SANDBOX', 'Must be flagged as SANDBOX environment');
    assert.equal(sampleAudit.details.dataSource, 'SYNTHETIC', 'Must be flagged as SYNTHETIC data source');

    // Verify lifecycle distribution
    const recoveredCount = mock.transactions.filter((t: any) => t.status === TransactionStatus.SUCCESS).length;
    const failedCount = mock.transactions.filter((t: any) => t.status === TransactionStatus.FAILED).length;
    assert.equal(recoveredCount, 16, 'Exactly 16 transactions must be in RECOVERED state');
    assert.equal(failedCount, 26, 'Remaining 26 transactions must represent diverse failure lifecycles');
  });

  it('correctly aggregates sandbox statistics from the database', async () => {
    const mock = createMockPrisma();
    const seeder = new SandboxSeederService(mock.db as unknown as PrismaClient);

    await seeder.seedMerchantSandbox('mer_test_sandbox_1', 'INR');
    const stats = await seeder.getSandboxStats('mer_test_sandbox_1');

    assert.equal(stats.transactionsCount, 42);
    assert.ok(stats.recoveryAttemptsCount >= 30);
    assert.ok(stats.auditLogsCount >= 80);
    assert.ok(stats.totalRecoveredAmount > 0);
  });

  it('simulates a single live recovery event with real database records', async () => {
    const mock = createMockPrisma();
    const seeder = new SandboxSeederService(mock.db as unknown as PrismaClient);

    const simResult = await seeder.simulateSingleEvent('mer_test_sandbox_1', {
      scenario: 'OTP_DROPOUT',
      amount: 4850,
      outcome: 'PENDING',
    });

    assert.equal(simResult.transaction.amount, 4850);
    assert.equal(simResult.aiDecision.decision, RecoveryDecision.REMIND);
    assert.equal(simResult.scenario, 'OTP_DROPOUT');
    assert.equal(simResult.outcome, 'PENDING');
    assert.equal(mock.transactions.length, 1);
    assert.equal(mock.aiDecisions.length, 1);
  });

  it('flushes and reseeds cleanly on resetMerchantSandbox', async () => {
    const mock = createMockPrisma();
    const seeder = new SandboxSeederService(mock.db as unknown as PrismaClient);

    // Initial seed
    await seeder.seedMerchantSandbox('mer_test_sandbox_1', 'INR');
    assert.equal(mock.transactions.length, 42);

    // Add 2 simulation events
    await seeder.simulateSingleEvent('mer_test_sandbox_1', { scenario: 'GATEWAY_TIMEOUT', amount: 2499 });
    await seeder.simulateSingleEvent('mer_test_sandbox_1', { scenario: 'INSUFFICIENT_FUNDS', amount: 12000 });
    assert.equal(mock.transactions.length, 44);

    // Reset
    const resetResult = await seeder.resetMerchantSandbox('mer_test_sandbox_1', 'INR');
    assert.equal(resetResult.transactionsCount, 42);
    assert.equal(mock.transactions.length, 42, 'Transactions must reset back to exactly 42 baseline seed items');
  });
});
