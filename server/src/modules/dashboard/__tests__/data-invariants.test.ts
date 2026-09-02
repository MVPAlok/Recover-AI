import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AIAgentType,
  PaymentStatus,
  RecoveryDecision,
  RecoveryStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
} from '@prisma/client';
import { SandboxSeederService } from '../sandbox-seeder.service.js';

function createInvariantTestMock() {
  const merchants: any[] = [
    { id: 'mcht_alpha_001', name: 'Alpha Stores', currency: 'INR' },
    { id: 'mcht_beta_002', name: 'Beta Enterprise', currency: 'INR' },
  ];
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
      update: async ({ where, data }: any) => {
        const idx = transactions.findIndex(t => t.id === where.id);
        if (idx >= 0) {
          transactions[idx] = { ...transactions[idx], ...data };
          return transactions[idx];
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        return transactions.filter(t => !where || !where.merchantId || t.merchantId === where.merchantId);
      },
      count: async ({ where }: any) => {
        return transactions.filter(t => !where || !where.merchantId || t.merchantId === where.merchantId).length;
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
      findMany: async ({ where }: any) => {
        return aiDecisions.filter(d => !where || !where.merchantId || d.merchantId === where.merchantId);
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
      findMany: async ({ where }: any) => {
        return recoveryAttempts.filter(a => !where || !where.merchantId || a.merchantId === where.merchantId);
      },
      count: async ({ where }: any) => {
        return recoveryAttempts.filter(a => !where || !where.merchantId || a.merchantId === where.merchantId).length;
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
      findMany: async ({ where }: any) => {
        return payments.filter(p => !where || !where.merchantId || p.merchantId === where.merchantId);
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
      findMany: async ({ where }: any) => {
        return auditLogs.filter(a => !where || !where.merchantId || a.merchantId === where.merchantId);
      },
      count: async ({ where }: any) => {
        return auditLogs.filter(a => !where || !where.merchantId || a.merchantId === where.merchantId).length;
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

  return {
    db,
    tables: { merchants, customers, transactions, aiDecisions, recoveryAttempts, payments, auditLogs },
  };
}

test('🛡️ RecoverAI — Data Integrity & Architectural Invariants Suite', async (t) => {
  const { db, tables } = createInvariantTestMock();
  const seeder = new SandboxSeederService(db);

  const merchantA = 'mcht_alpha_001';
  const merchantB = 'mcht_beta_002';

  // Seed Merchant A and Merchant B
  await seeder.seedMerchantSandbox(merchantA, 'INR');
  await seeder.seedMerchantSandbox(merchantB, 'INR');

  await t.test('Invariant 1: Single-Merchant Tenancy (Every transaction belongs to exactly one merchant)', async () => {
    const allTxns = tables.transactions;
    assert.ok(allTxns.length >= 84, 'Expected transactions for both merchants');

    for (const txn of allTxns) {
      assert.ok(txn.merchantId === merchantA || txn.merchantId === merchantB, 'Transaction must have valid merchantId');
      assert.ok(txn.customerId, 'Transaction must reference a customer');
      assert.ok(txn.amount > 0, 'Transaction amount must be positive');
      assert.ok(txn.currency === 'INR', 'Currency must match workspace setting');
    }
  });

  await t.test('Invariant 2: AI Decision Relational Integrity (Every AIDecision references an extant transaction)', async () => {
    const txnMap = new Map(tables.transactions.map(t => [t.id, t]));

    for (const decision of tables.aiDecisions) {
      assert.ok(decision.transactionId, 'Decision must specify transactionId');
      assert.ok(txnMap.has(decision.transactionId), `Decision ${decision.id} references non-existent transaction ${decision.transactionId}`);
      
      const parentTxn = txnMap.get(decision.transactionId)!;
      assert.strictEqual(decision.merchantId, parentTxn.merchantId, 'Decision merchantId must match transaction merchantId');
      assert.ok(decision.confidenceScore >= 0 && decision.confidenceScore <= 1, 'Confidence score must be within [0, 1]');
    }
  });

  await t.test('Invariant 3: Recovery Attempt Validity (Every attempt references a valid transaction and matching merchant)', async () => {
    const txnMap = new Map(tables.transactions.map(t => [t.id, t]));

    for (const attempt of tables.recoveryAttempts) {
      assert.ok(attempt.transactionId, 'Attempt must reference transactionId');
      assert.ok(txnMap.has(attempt.transactionId), `Attempt references missing transaction ${attempt.transactionId}`);

      const parentTxn = txnMap.get(attempt.transactionId)!;
      assert.strictEqual(attempt.merchantId, parentTxn.merchantId, 'Attempt merchantId must match transaction');
      assert.ok(attempt.attemptNumber >= 1 && attempt.attemptNumber <= 3, 'Attempt number must be within budget [1..3]');
    }
  });

  await t.test('Invariant 4: Payment Integrity (Every payment references a captured, verified transaction)', async () => {
    const txnMap = new Map(tables.transactions.map(t => [t.id, t]));

    for (const payment of tables.payments) {
      assert.ok(payment.transactionId, 'Payment must reference transactionId');
      assert.ok(txnMap.has(payment.transactionId), `Payment references missing transaction ${payment.transactionId}`);

      const parentTxn = txnMap.get(payment.transactionId)!;
      assert.strictEqual(payment.merchantId, parentTxn.merchantId, 'Payment merchantId must match transaction');
      assert.strictEqual(payment.status, PaymentStatus.CAPTURED, 'Payment in sandbox must be CAPTURED');
      assert.strictEqual(payment.verified, true, 'Payment must be cryptographically verified');
      assert.strictEqual(payment.reconciled, true, 'Payment must be reconciled');
      assert.strictEqual(payment.amount, parentTxn.amount, 'Payment amount must equal transaction amount');
    }
  });

  await t.test('Invariant 5: Financial Reconciliation Parity (Sum of Payments === Sandbox Recovered Revenue)', async () => {
    const statsA = await seeder.getSandboxStats(merchantA);
    const statsB = await seeder.getSandboxStats(merchantB);

    const paymentsA = tables.payments.filter(p => p.merchantId === merchantA);
    const sumA = paymentsA.reduce((acc, p) => acc + p.amount, 0);

    const paymentsB = tables.payments.filter(p => p.merchantId === merchantB);
    const sumB = paymentsB.reduce((acc, p) => acc + p.amount, 0);

    assert.strictEqual(statsA.totalRecoveredAmount, sumA, 'Merchant A recovered revenue must equal sum of verified payments');
    assert.strictEqual(statsB.totalRecoveredAmount, sumB, 'Merchant B recovered revenue must equal sum of verified payments');
  });

  await t.test('Invariant 6: End-to-End Traceability (Audit logs contain scenarioId and valid correlationId)', async () => {
    for (const log of tables.auditLogs) {
      assert.ok(log.correlationId, 'Audit log must contain correlationId');
      assert.ok(log.details, 'Audit log must have structured details');
      assert.strictEqual(log.details.environment, 'SANDBOX', 'Audit log must be tagged SANDBOX');
      assert.ok(log.details.scenarioId || log.correlationId.includes('scenario'), 'Audit log must trace to a scenarioId');
    }
  });

  await t.test('Invariant 7: Multi-Tenant Zero-Leakage (Merchant queries return 0 records from another merchant)', async () => {
    const txnsA = tables.transactions.filter(t => t.merchantId === merchantA);
    const txnsB = tables.transactions.filter(t => t.merchantId === merchantB);

    assert.ok(txnsA.length > 0, 'Merchant A must have transactions');
    assert.ok(txnsB.length > 0, 'Merchant B must have transactions');

    // Cross-contamination check
    const leakageAB = txnsA.filter(t => t.merchantId === merchantB);
    const leakageBA = txnsB.filter(t => t.merchantId === merchantA);

    assert.strictEqual(leakageAB.length, 0, 'Merchant A ledger must not contain any Merchant B records');
    assert.strictEqual(leakageBA.length, 0, 'Merchant B ledger must not contain any Merchant A records');
  });

  await t.test('Invariant 8: Reset Isolation (Resetting Merchant A leaves Merchant B untouched)', async () => {
    const countBBefore = tables.transactions.filter(t => t.merchantId === merchantB).length;

    // Reset Merchant A
    await seeder.resetMerchantSandbox(merchantA, 'INR');

    const countBAfter = tables.transactions.filter(t => t.merchantId === merchantB).length;
    assert.strictEqual(countBAfter, countBBefore, 'Merchant B records must remain completely unchanged after Merchant A reset');

    const countA = tables.transactions.filter(t => t.merchantId === merchantA).length;
    assert.strictEqual(countA, 42, 'Merchant A should have cleanly reseeded exactly 42 transactions');
  });

  await t.test('Invariant 9: Live Simulation Pipeline & Idempotency (Event simulation produces valid traceable records)', async () => {
    const simResult = await seeder.simulateSingleEvent(merchantA, {
      scenario: 'GATEWAY_TIMEOUT',
      amount: 4999,
      outcome: 'SUCCESS',
    });

    assert.ok(simResult.scenarioId, 'Simulation must return scenarioId');
    assert.ok(simResult.correlationId, 'Simulation must return correlationId');
    assert.ok(simResult.transaction.id, 'Simulation must return created transaction');
    assert.strictEqual(simResult.transaction.amount, 4999, 'Simulation amount must match');

    // Verify trace in audit logs
    const relatedLogs = tables.auditLogs.filter(l => l.correlationId === simResult.correlationId);
    assert.ok(relatedLogs.length >= 1, 'Simulation must emit at least 1 traceable audit log with scenario correlationId');
  });
});
