import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../config/prisma.js';
import { RecoveryIntelligenceService } from '../recovery-intelligence.service.js';
import {
  PaymentStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
} from '@prisma/client';

async function runStage4Tests() {
  console.log('\n====================================================');
  console.log('🧪 Running Stage 4: Recovery Intelligence Tests...');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ Test ${total}: ${name}`);
    } catch (err: any) {
      console.error(`  ✗ Test ${total}: ${name} FAILED - ${err.message}`);
      throw err;
    }
  }

  const merchant = await prisma.merchant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!merchant) throw new Error('Merchant required. Seed database first.');

  const customer = await prisma.customer.findFirst({ where: { merchantId: merchant.id } });
  if (!customer) throw new Error('Customer required. Seed database first.');

  const intelligence = new RecoveryIntelligenceService();

  // Test 1: Comparative Strategy Matrix and Expected Recovery Values (EV)
  const tx1Id = `stage4_tx_auth_${Date.now()}`;
  await prisma.transaction.create({
    data: {
      id: tx1Id,
      merchantId: merchant.id,
      customerId: customer.id,
      amount: 20000.0,
      currency: 'INR',
      status: TransactionStatus.FAILED,
      paymentStatus: PaymentStatus.FAILED,
      recoveryStatus: TransactionRecoveryStatus.NOT_STARTED,
      failureCode: 'CUSTOMER_AUTHENTICATION_FAILURE',
      failureReason: 'Customer abandoned OTP 3DS challenge',
      retryCount: 0,
    },
  });

  await test('Generates comparative strategy matrix with EV calculations (₹20,000 transaction)', async () => {
    const report = await intelligence.generateIntelligenceReport(tx1Id);

    assert.strictEqual(report.transactionId, tx1Id);
    assert.strictEqual(report.amount, 20000.0);
    assert.ok(report.strategies.length >= 4, 'Must evaluate at least 4 recovery strategies');

    // Strategy B (Payment Link) should be PREFERRED for auth failure
    const linkStrategy = report.strategies.find((s) => s.strategyId === 'PAYMENT_LINK');
    assert.ok(linkStrategy, 'Must have Strategy B: Payment Link');
    assert.strictEqual(linkStrategy.status, 'PREFERRED');
    assert.ok(linkStrategy.probability >= 50, 'Payment Link probability should be high');
    assert.strictEqual(linkStrategy.expectedRecoveryValue, Math.round(20000 * (linkStrategy.probability / 100)));

    // Strategy A (Retry) should be SUBOPTIMAL for OTP drop-off
    const retryStrategy = report.strategies.find((s) => s.strategyId === 'RETRY');
    assert.ok(retryStrategy);
    assert.strictEqual(retryStrategy.status, 'SUBOPTIMAL');

    // Preferred strategy should match Strategy B
    assert.strictEqual(report.preferredStrategy.strategyId, 'PAYMENT_LINK');
  });

  // Test 2: AI Counterfactual Explanations
  await test('Generates counterfactual explanations comparing selected strategy vs alternatives', async () => {
    const report = await intelligence.generateIntelligenceReport(tx1Id);

    assert.ok(report.aiExplanation.counterfactuals.length >= 1);
    assert.ok(
      report.aiExplanation.counterfactuals[0].includes('Automated Retry'),
      'Counterfactual explanation must compare Payment Link against Automated Retry'
    );
    assert.ok(report.aiExplanation.confidenceScore >= 0.85);
  });

  // Test 3: Customer Recovery Profile Aggregation
  await test('Aggregates accurate customer profile, lifetime spend, and responsiveness tier', async () => {
    const report = await intelligence.generateIntelligenceReport(tx1Id);

    assert.strictEqual(report.customerProfile.customerId, customer.id);
    assert.strictEqual(report.customerProfile.customerName, customer.name);
    assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(report.customerProfile.responsivenessTier));
  });

  // Test 4: Disqualification of Auto-Retry when retryCount >= 3
  const tx2Id = `stage4_tx_exhausted_${Date.now()}`;
  await prisma.transaction.create({
    data: {
      id: tx2Id,
      merchantId: merchant.id,
      customerId: customer.id,
      amount: 15000.0,
      currency: 'INR',
      status: TransactionStatus.FAILED,
      paymentStatus: PaymentStatus.FAILED,
      recoveryStatus: TransactionRecoveryStatus.NOT_STARTED,
      failureCode: 'GATEWAY_TIMEOUT',
      retryCount: 3, // Exhausted
    },
  });

  await test('Disqualifies Strategy A (Auto-Retry) when retryCount >= 3', async () => {
    const report = await intelligence.generateIntelligenceReport(tx2Id);

    const retryStrategy = report.strategies.find((s) => s.strategyId === 'RETRY');
    assert.ok(retryStrategy);
    assert.strictEqual(retryStrategy.status, 'DISQUALIFIED');
    assert.strictEqual(retryStrategy.probability, 0);
    assert.strictEqual(retryStrategy.expectedRecoveryValue, 0);
  });

  // Cleanup test transactions
  await prisma.transaction.deleteMany({
    where: { id: { in: [tx1Id, tx2Id] } },
  });

  console.log(`\n🎉 All ${passed}/${total} Stage 4 Recovery Intelligence Tests Passed Successfully!\n`);
}

runStage4Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Stage 4 tests failed:', err);
    process.exit(1);
  });
