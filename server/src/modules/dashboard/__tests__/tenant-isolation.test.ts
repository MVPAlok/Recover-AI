import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DashboardRepository } from '../dashboard.repository.js';
import { DashboardService } from '../dashboard.service.js';
import { PrismaClient, TransactionStatus, PaymentStatus, RecoveryStatus, AIAgentType, RecoveryDecision } from '@prisma/client';

/**
 * RecoverAI — Phase 9 Security Hardening & Tenant Isolation Penetration Test Suite
 * Validates strict isolation across distinct merchant tenants:
 * - Cross-merchant transaction access blocked (404/Not Found)
 * - Cross-merchant recovery attempt access blocked (404/Not Found)
 * - Cross-merchant overview aggregate isolation (Zero revenue leakage)
 * - Cross-merchant customer statistics isolation (Strictly scoped)
 * - Cross-merchant audit log access blocked
 * - Zero secret leakage
 */

function createMockPrisma() {
  const merchantA = { id: 'mcht_tenant_A', name: 'Tenant A Store', email: 'owner@tenantA.com', createdAt: new Date() };
  const merchantB = { id: 'mcht_tenant_B', name: 'Tenant B Store', email: 'owner@tenantB.com', createdAt: new Date() };

  const customerA = { id: 'cust_A', merchantId: merchantA.id, name: 'Customer A', email: 'a@client.com', createdAt: new Date() };
  const customerB = { id: 'cust_B', merchantId: merchantB.id, name: 'Customer B', email: 'b@client.com', createdAt: new Date() };

  const transactionA1 = {
    id: 'txn_A_001',
    merchantId: merchantA.id,
    customerId: customerA.id,
    amount: 1500,
    currency: 'INR',
    status: TransactionStatus.FAILED,
    customer: customerA,
    merchant: merchantA,
    createdAt: new Date('2026-08-24T10:00:00Z'),
    updatedAt: new Date('2026-08-24T10:00:00Z'),
    payments: [],
    aiDecisions: [],
    recoveryAttempts: [],
    auditLogs: [],
  };

  const transactionB1 = {
    id: 'txn_B_001',
    merchantId: merchantB.id,
    customerId: customerB.id,
    amount: 50000,
    currency: 'INR',
    status: TransactionStatus.SUCCESS,
    customer: customerB,
    merchant: merchantB,
    createdAt: new Date('2026-08-24T11:00:00Z'),
    updatedAt: new Date('2026-08-24T11:00:00Z'),
    payments: [
      {
        id: 'pay_B_001',
        merchantId: merchantB.id,
        amount: 50000,
        status: PaymentStatus.CAPTURED,
        verified: true,
        reconciled: true,
        createdAt: new Date('2026-08-24T11:05:00Z'),
      },
    ],
    aiDecisions: [],
    recoveryAttempts: [],
    auditLogs: [],
  };

  const recoveryB1 = {
    id: 'rec_B_001',
    merchantId: merchantB.id,
    transactionId: transactionB1.id,
    amountRecovered: 50000,
    status: RecoveryStatus.SUCCESS,
    action: RecoveryDecision.RETRY,
    transaction: transactionB1,
    aiDecision: null,
    createdAt: new Date('2026-08-24T11:05:00Z'),
    auditLogs: [],
  };

  return {
    merchant: {
      findUnique: async ({ where }: any) => {
        if (where.id === merchantA.id) return merchantA;
        if (where.id === merchantB.id) return merchantB;
        return null;
      },
      findFirst: async () => merchantA,
      findMany: async () => [merchantA, merchantB],
    },
    transaction: {
      findFirst: async ({ where }: any) => {
        if (where.merchantId === merchantA.id) {
          if (where.id === transactionA1.id) return transactionA1;
          return null; // Transaction B1 is NOT found under Merchant A!
        }
        if (where.merchantId === merchantB.id) {
          if (where.id === transactionB1.id) return transactionB1;
          return null;
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        if (where?.merchantId === merchantA.id) return [transactionA1];
        if (where?.merchantId === merchantB.id) return [transactionB1];
        return [];
      },
      count: async ({ where }: any) => {
        if (where?.merchantId === merchantA.id) {
          if (where.status === TransactionStatus.FAILED) return 1;
          if (where.status === TransactionStatus.SUCCESS) return 0;
          return 1;
        }
        if (where?.merchantId === merchantB.id) {
          if (where.status === TransactionStatus.FAILED) return 0;
          if (where.status === TransactionStatus.SUCCESS) return 1;
          return 1;
        }
        return 0;
      },
      aggregate: async ({ where }: any) => {
        if (where?.merchantId === merchantA.id) return { _sum: { amount: 1500 } };
        if (where?.merchantId === merchantB.id) return { _sum: { amount: 0 } };
        return { _sum: { amount: 0 } };
      },
    },
    recoveryAttempt: {
      findFirst: async ({ where }: any) => {
        if (where.merchantId === merchantA.id) {
          return null; // Recovery B1 is NOT found under Merchant A!
        }
        if (where.merchantId === merchantB.id) {
          if (where.id === recoveryB1.id) return recoveryB1;
          return null;
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        if (where?.merchantId === merchantA.id) return [];
        if (where?.merchantId === merchantB.id) return [recoveryB1];
        return [];
      },
      count: async ({ where }: any) => {
        if (where?.merchantId === merchantA.id) return 0;
        if (where?.merchantId === merchantB.id) return 1;
        return 0;
      },
      aggregate: async ({ where }: any) => {
        if (where?.merchantId === merchantA.id) return { _sum: { amountRecovered: 0 } };
        if (where?.merchantId === merchantB.id) return { _sum: { amountRecovered: 50000 } };
        return { _sum: { amountRecovered: 0 } };
      },
    },
    payment: {
      aggregate: async ({ where }: any) => {
        if (where?.merchantId === merchantA.id) return { _sum: { capturedAmount: 0 } };
        if (where?.merchantId === merchantB.id) return { _sum: { capturedAmount: 50000 } };
        return { _sum: { capturedAmount: 0 } };
      },
    },
    aIDecision: {
      count: async () => 1,
    },
    razorpayWebhookEvent: {
      count: async () => 0,
      findFirst: async () => null,
    },
    auditLog: {
      findMany: async ({ where }: any) => {
        if (where?.merchantId === merchantA.id) return [];
        if (where?.merchantId === merchantB.id) {
          return [
            {
              id: 'log_B_1',
              merchantId: merchantB.id,
              action: 'RECOVERY_SUCCESS',
              entityType: 'PAYMENT',
              entityId: 'pay_B_001',
              createdAt: new Date('2026-08-24T11:05:00Z'),
            },
          ];
        }
        return [];
      },
      count: async ({ where }: any) => (where?.merchantId === merchantA.id ? 0 : 1),
    },
  } as unknown as PrismaClient;
}

describe('🛡️ Tenant Isolation & Penetration Tests', () => {
  const mockPrisma = createMockPrisma();
  const repo = new DashboardRepository(mockPrisma);
  const service = new DashboardService(repo);

  it('Test 1: Merchant A cannot view Merchant B overview metrics (Revenue Isolation)', async () => {
    const overviewA = await service.getOverview('mcht_tenant_A');
    const overviewB = await service.getOverview('mcht_tenant_B');

    // Merchant A has 1500 revenue at risk, 0 recovered
    assert.equal(overviewA.revenueAtRisk, 1500);
    assert.equal(overviewA.recoveredRevenue, 0);
    assert.equal(overviewA.recoveryRate, 0);

    // Merchant B has 0 at risk, 50000 recovered
    assert.equal(overviewB.revenueAtRisk, 0);
    assert.equal(overviewB.recoveredRevenue, 50000);

    // Strict boundary: Overview A does NOT contain any of B's 50000 revenue
    assert.notEqual(overviewA.recoveredRevenue, overviewB.recoveredRevenue);
  });

  it('Test 2: Merchant A requesting Merchant B transaction (txn_B_001) throws 404/Not Found (Cross-Tenant Blocked)', async () => {
    await assert.rejects(
      async () => {
        await service.getTransactionDetail('mcht_tenant_A', 'txn_B_001');
      },
      {
        name: 'Error',
        message: 'Transaction txn_B_001 not found',
      }
    );
  });

  it('Test 3: Merchant A requesting Merchant B recovery attempt (rec_B_001) throws 404/Not Found (Cross-Tenant Blocked)', async () => {
    await assert.rejects(
      async () => {
        await service.getRecoveryDetail('mcht_tenant_A', 'rec_B_001');
      },
      {
        name: 'Error',
        message: 'Recovery attempt rec_B_001 not found',
      }
    );

    const recoveryForB = await service.getRecoveryDetail('mcht_tenant_B', 'rec_B_001');
    assert.notEqual(recoveryForB, null);
    assert.equal(recoveryForB?.id, 'rec_B_001');
  });

  it('Test 4: Merchant A querying recovery attempts receives only Merchant A records (0 records, no leakage from B)', async () => {
    const recoveriesA = await service.getRecoveries('mcht_tenant_A', {});
    assert.equal(recoveriesA.total, 0);
    assert.equal(recoveriesA.items.length, 0);

    const recoveriesB = await service.getRecoveries('mcht_tenant_B', {});
    assert.equal(recoveriesB.total, 1);
    assert.equal(recoveriesB.items.length, 1);
  });

  it('Test 5: Merchant A querying audit logs receives 0 entries from Merchant B', async () => {
    const logsA = await service.getAuditLogs('mcht_tenant_A', {});
    assert.equal(logsA.total, 0);

    const logsB = await service.getAuditLogs('mcht_tenant_B', {});
    assert.equal(logsB.total, 1);
  });

  it('Test 6: Customer statistics calculated for Merchant A are strictly scoped to Merchant A transactions', async () => {
    const detailA = await service.getTransactionDetail('mcht_tenant_A', 'txn_A_001');
    assert.equal(detailA.id, 'txn_A_001');
    assert.equal(detailA.customer.totalTransactions, 1);
    assert.equal(detailA.customer.failedTransactions, 1);
    assert.equal(detailA.customer.successfulTransactions, 0);
  });

  it('Test 7: Razorpay Gateway Status exposes Test Mode without leaking API keys, secrets or DB URLs', async () => {
    const status = await service.getRazorpayIntegrationStatus();
    assert.equal(status.mode, 'TEST MODE');

    // Confirm that no secrets are present in the response object
    const serialized = JSON.stringify(status);
    assert.equal(serialized.includes('key_secret'), false);
    assert.equal(serialized.includes('AIzaSy'), false);
    assert.equal(serialized.includes('postgresql://'), false);
    assert.equal(serialized.includes('redis://'), false);
  });

  it('Test 8: Unauthenticated overview query without merchantId throws authorization requirement error', async () => {
    await assert.rejects(
      async () => {
        await service.getOverview(undefined);
      },
      {
        name: 'Error',
        message: 'Merchant tenant identification header (x-merchant-id) is required.',
      }
    );
  });
});
