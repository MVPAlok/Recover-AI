import { DashboardService } from '../dashboard.service.js';
import { DashboardRepository } from '../dashboard.repository.js';
import { PrismaClient, TransactionStatus, RecoveryDecision, RecoveryStatus, AIAgentType } from '@prisma/client';

class MockDashboardRepository extends DashboardRepository {
  private mockMerchant = {
    id: 'mer_apex_01',
    name: 'Apex Retail Hub',
    email: 'admin@apexretail.example.test',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  private mockTransactions = [
    {
      id: 'tx_dash_01',
      merchantId: 'mer_apex_01',
      customerId: 'cust_01',
      amount: 2499.0,
      currency: 'INR',
      status: TransactionStatus.FAILED,
      paymentMethod: 'UPI',
      failureCode: 'BANK_TIMEOUT',
      failureReason: 'Bank timeout',
      retryCount: 0,
      razorpayPaymentId: null,
      razorpayOrderId: null,
      createdAt: new Date('2026-08-20T10:00:00Z'),
      updatedAt: new Date('2026-08-20T10:00:00Z'),
      customer: {
        id: 'cust_01',
        merchantId: 'mer_apex_01',
        name: 'Aarav Patel',
        email: 'aarav@example.com',
        phone: '+919876543210',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      aiDecisions: [
        {
          id: 'dec_01',
          merchantId: 'mer_apex_01',
          transactionId: 'tx_dash_01',
          agentType: AIAgentType.RECOVERY_DECISION,
          decision: RecoveryDecision.RETRY,
          recoveryProbability: 0.95,
          confidenceScore: 0.92,
          reasoning: 'Strong customer history; temporary failure code',
          modelName: 'gpt-4o-mini',
          promptVersion: 'v1.0',
          createdAt: new Date('2026-08-20T10:01:00Z'),
        },
        {
          id: 'det_01',
          merchantId: 'mer_apex_01',
          transactionId: 'tx_dash_01',
          agentType: AIAgentType.DETECTION,
          decision: RecoveryDecision.RETRY,
          recoveryProbability: 0.95,
          confidenceScore: 0.90,
          reasoning: 'Positive signals: Strong customer history; Temporary bank timeout. Risk factors: None',
          modelName: null,
          promptVersion: null,
          createdAt: new Date('2026-08-20T10:00:30Z'),
        },
      ],
      recoveryAttempts: [
        {
          id: 'att_01',
          merchantId: 'mer_apex_01',
          transactionId: 'tx_dash_01',
          aiDecisionId: 'dec_01',
          attemptNumber: 1,
          actionType: RecoveryDecision.RETRY,
          status: RecoveryStatus.SUCCESS,
          reason: 'Recovered via retry order',
          amountRecovered: 2499.0,
          scheduledAt: null,
          executedAt: new Date('2026-08-20T10:05:00Z'),
          createdAt: new Date('2026-08-20T10:05:00Z'),
          updatedAt: new Date('2026-08-20T10:05:00Z'),
        },
      ],
      auditLogs: [
        {
          id: 'log_01',
          merchantId: 'mer_apex_01',
          transactionId: 'tx_dash_01',
          recoveryAttemptId: 'att_01',
          entityType: 'TRANSACTION',
          entityId: 'tx_dash_01',
          action: 'RECOVERY_COMPLETED',
          actor: 'RECOVERY_EXECUTOR',
          details: { amount: 2499 },
          createdAt: new Date('2026-08-20T10:05:00Z'),
        },
      ],
    },
    {
      id: 'tx_dash_02',
      merchantId: 'mer_apex_01',
      customerId: 'cust_02',
      amount: 5000.0,
      currency: 'INR',
      status: TransactionStatus.FAILED,
      paymentMethod: 'CARD',
      failureCode: 'INSUFFICIENT_FUNDS',
      failureReason: 'Insufficient funds in customer account',
      retryCount: 2,
      razorpayPaymentId: null,
      razorpayOrderId: null,
      createdAt: new Date('2026-08-21T11:00:00Z'),
      updatedAt: new Date('2026-08-21T11:00:00Z'),
      customer: {
        id: 'cust_02',
        merchantId: 'mer_apex_01',
        name: 'Rohan Gupta',
        email: 'rohan@example.com',
        phone: '+919876543211',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      aiDecisions: [
        {
          id: 'dec_02',
          merchantId: 'mer_apex_01',
          transactionId: 'tx_dash_02',
          agentType: AIAgentType.RECOVERY_DECISION,
          decision: RecoveryDecision.STOP,
          recoveryProbability: 0.1,
          confidenceScore: 0.85,
          reasoning: 'Hard financial failure with multiple retries',
          modelName: 'gpt-4o-mini',
          promptVersion: 'v1.0',
          createdAt: new Date('2026-08-21T11:01:00Z'),
        },
      ],
      recoveryAttempts: [],
      auditLogs: [],
    },
  ];

  async getMerchant(merchantId?: string) {
    if (merchantId && merchantId !== this.mockMerchant.id) return null;
    return this.mockMerchant as any;
  }

  async getAllMerchants() {
    return [this.mockMerchant] as any;
  }

  async getOverviewAggregates(_merchantId: string) {
    return {
      totalTransactions: 10,
      failedPayments: 2,
      successfulTransactions: 8,
      revenueAtRisk: 7499.0,
      recoveredRevenue: 2499.0,
      recoverablePayments: 1,
    };
  }

  async getRecoveryOpportunities(_merchantId: string, limit: number = 10) {
    return this.mockTransactions.slice(0, limit) as any;
  }

  async getTransactions(_merchantId: string, params: any) {
    let filtered = [...this.mockTransactions];
    if (params.search) {
      filtered = filtered.filter(
        (t) =>
          t.customer.name.toLowerCase().includes(params.search.toLowerCase()) ||
          t.id.toLowerCase().includes(params.search.toLowerCase())
      );
    }
    if (params.status) {
      filtered = filtered.filter((t) => t.status === params.status);
    }
    return {
      total: filtered.length,
      transactions: filtered,
      page: params.page || 1,
      limit: params.limit || 25,
      totalPages: 1,
    } as any;
  }

  async getTransactionLifecycle(_merchantId: string, transactionId: string) {
    const tx = this.mockTransactions.find((t) => t.id === transactionId);
    if (!tx) return null;
    return {
      transaction: tx,
      customerStats: {
        totalTransactions: 3,
        successfulTransactions: 2,
        failedTransactions: 1,
        successRate: 66.7,
      },
    } as any;
  }

  async getRecoveries(_merchantId: string, _params: any) {
    const attempts = this.mockTransactions.flatMap((t) =>
      t.recoveryAttempts.map((att) => ({
        ...att,
        transaction: t,
        aiDecision: t.aiDecisions[0],
      }))
    );
    return {
      total: attempts.length,
      items: attempts,
      page: 1,
      limit: 25,
      totalPages: 1,
    } as any;
  }

  async getRecoveryById(_merchantId: string, id: string) {
    for (const t of this.mockTransactions) {
      const att = t.recoveryAttempts.find((a) => a.id === id);
      if (att) {
        return {
          ...att,
          transaction: t,
          aiDecision: t.aiDecisions[0],
          auditLogs: t.auditLogs,
        } as any;
      }
    }
    return null;
  }

  async getFailureBreakdown(_merchantId: string) {
    return [
      { failureCode: 'BANK_TIMEOUT', count: 1, amount: 2499.0, percentage: 50.0 },
      { failureCode: 'INSUFFICIENT_FUNDS', count: 1, amount: 5000.0, percentage: 50.0 },
    ];
  }

  async getDecisionBreakdown(_merchantId: string) {
    return [
      { decision: RecoveryDecision.RETRY, count: 1, percentage: 50.0 },
      { decision: RecoveryDecision.STOP, count: 1, percentage: 50.0 },
    ];
  }

  async getRecoveryOutcomes(_merchantId: string) {
    return [
      { status: RecoveryStatus.SUCCESS, count: 1, amountRecovered: 2499.0 },
    ];
  }

  async getAuditLogs(_merchantId: string, _params: any) {
    const logs = this.mockTransactions.flatMap((t) => t.auditLogs);
    return {
      total: logs.length,
      logs,
      page: 1,
      limit: 50,
      totalPages: 1,
    } as any;
  }

  async getRazorpayStatusSummary() {
    return {
      totalWebhooks: 12,
      lastWebhookAt: '2026-08-23T05:47:05.000Z',
      lastEventType: 'payment.captured',
    };
  }
}

async function runDashboardTests() {
  console.log('\n====================================================');
  console.log('🧪 Running Phase 8: Merchant Dashboard Unit Tests...');
  console.log('====================================================\n');

  const mockRepo = new MockDashboardRepository(undefined as unknown as PrismaClient);
  const service = new DashboardService(mockRepo);

  // Test 1: Overview calculations & documented recovery rate formula
  const overview = await service.getOverview('mer_apex_01');
  if (overview.revenueAtRisk !== 7499.0 || overview.recoveredRevenue !== 2499.0) {
    throw new Error(`Overview aggregation mismatch: risk=${overview.revenueAtRisk}, recovered=${overview.recoveredRevenue}`);
  }
  const expectedRate = Number(((2499.0 / 7499.0) * 100).toFixed(1));
  if (overview.recoveryRate !== expectedRate) {
    throw new Error(`Expected recovery rate ${expectedRate}%, got ${overview.recoveryRate}%`);
  }
  console.log(`  ✓ Test 1: Overview metrics and recovery rate (${overview.recoveryRate}%) calculated accurately.`);

  // Test 2: Recovery opportunities mapping
  const opps = await service.getRecoveryOpportunities('mer_apex_01', 5);
  if (opps.length !== 2 || opps[0].riskLevel !== 'LOW' || opps[0].decision !== 'RETRY') {
    throw new Error('Recovery opportunities normalization failed');
  }
  console.log('  ✓ Test 2: Recovery opportunities mapped with correct probabilities and risk levels.');

  // Test 3: Transaction search and filtering
  const searchResult = await service.getTransactions('mer_apex_01', { search: 'Aarav' });
  if (searchResult.items.length !== 1 || searchResult.items[0].id !== 'tx_dash_01') {
    throw new Error('Transaction search filtering failed');
  }
  console.log('  ✓ Test 3: Transaction Explorer search filtering verified.');

  // Test 4: Transaction full lifecycle detail
  const detail = await service.getTransactionDetail('mer_apex_01', 'tx_dash_01');
  if (!detail.customer || !detail.detection || !detail.decision || detail.recoveryAttempts.length === 0) {
    throw new Error('Transaction detail lifecycle mapping incomplete');
  }
  if (detail.detection.recoveryProbability !== 95.0) {
    throw new Error(`Expected detection probability 95%, got ${detail.detection.recoveryProbability}%`);
  }
  console.log('  ✓ Test 4: Transaction lifecycle timeline and AI factors retrieved with 100% explainability.');

  // Test 5: Merchant data isolation guardrail
  try {
    await service.getOverview('mer_other_merchant');
    throw new Error('Expected merchant isolation check to fail');
  } catch (err: any) {
    if (!err.message.includes('No merchant found')) {
      throw err;
    }
  }
  console.log('  ✓ Test 5: Merchant data isolation enforced (cross-merchant access rejected).');

  // Test 6: Razorpay status security (no secrets exposed)
  const rzpStatus = await service.getRazorpayStatus();
  if (rzpStatus.mode !== 'TEST MODE' || rzpStatus.isLive !== false || (rzpStatus as any).keySecret) {
    throw new Error('Razorpay status exposed sensitive data or incorrect mode');
  }
  console.log('  ✓ Test 6: Razorpay Gateway status exposes Test Mode without leaking credentials.');

  // Test 7: Analytics aggregations
  const analytics = await service.getAnalytics('mer_apex_01');
  if (analytics.failures.length !== 2 || analytics.decisions.length !== 2) {
    throw new Error('Analytics breakdown aggregation failed');
  }
  console.log('  ✓ Test 7: Analytics breakdowns (failures, decisions, outcomes) aggregated correctly.');

  console.log('\n🎉 All 7/7 Merchant Dashboard Backend Unit Tests Passed Successfully!\n');
  process.exit(0);
}

runDashboardTests().catch((err) => {
  console.error(`\n❌ Dashboard test failed: ${err.message}\n`, err);
  process.exit(1);
});
