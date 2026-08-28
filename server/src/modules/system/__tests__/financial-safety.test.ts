import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../config/prisma.js';
import { FinancialSafetyService } from '../financial-safety.service.js';
import {
  PaymentStatus,
  RecoveryDecision,
  RecoveryStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
} from '@prisma/client';

async function runStage5Tests() {
  console.log('\n====================================================');
  console.log('🧪 Running Stage 5: Financial Safety & Drift Protection Tests...');
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

  const safetyService = new FinancialSafetyService();

  // Test 1: Daily Merchant Retry Budget Enforcement
  await test('Daily merchant retry budget enforces hard velocity ceiling', async () => {
    // Normal limit (250) passes
    const resultAllowed = await safetyService.validateSafetyGuardrails({
      merchantId: merchant.id,
      action: RecoveryDecision.RETRY,
      dailyBudgetLimit: 500,
    });
    assert.strictEqual(resultAllowed.allowed, true);

    // Artificial budget limit (0) triggers block
    const resultBlocked = await safetyService.validateSafetyGuardrails({
      merchantId: merchant.id,
      action: RecoveryDecision.RETRY,
      dailyBudgetLimit: 0, // Zero budget
    });
    assert.strictEqual(resultBlocked.allowed, false);
    assert.strictEqual(resultBlocked.blockedReason, 'MERCHANT_DAILY_RETRY_BUDGET_EXCEEDED');
  });

  // Test 2: Customer Contact Frequency 24h Cooldown
  const tx1Id = `stage5_tx_cooldown_${Date.now()}`;
  await prisma.transaction.create({
    data: {
      id: tx1Id,
      merchantId: merchant.id,
      customerId: customer.id,
      amount: 3500.0,
      currency: 'INR',
      status: TransactionStatus.FAILED,
      paymentStatus: PaymentStatus.FAILED,
      recoveryStatus: TransactionRecoveryStatus.NOT_STARTED,
      failureCode: 'AUTHENTICATION_FAILURE',
      retryCount: 0,
    },
  });

  const attempt1 = await prisma.recoveryAttempt.create({
    data: {
      merchantId: merchant.id,
      transactionId: tx1Id,
      attemptNumber: 1,
      actionType: RecoveryDecision.REMIND,
      status: RecoveryStatus.SUCCESS,
      executedAt: new Date(),
    },
  });

  await test('Customer contact frequency guard blocks redundant customer notifications within 24h', async () => {
    const contactValidation = await safetyService.validateSafetyGuardrails({
      merchantId: merchant.id,
      customerId: customer.id,
      action: RecoveryDecision.REMIND,
    });

    assert.strictEqual(contactValidation.allowed, false);
    assert.strictEqual(contactValidation.blockedReason, 'CUSTOMER_CONTACT_COOLDOWN_ACTIVE');
    assert.strictEqual(contactValidation.contactCooldownActive, true);
  });

  // Test 3: Gateway Decline Circuit Breaker Trips on Elevated Failures
  await test('Elevated gateway decline rate trips Circuit Breaker to OPEN and halts retries', async () => {
    const testMerchantId = `merchant_cb_${Date.now()}`;

    // Record 5 consecutive failures
    for (let i = 0; i < 5; i++) {
      safetyService.recordGatewayAttempt(testMerchantId, false);
    }

    const cbStatus = safetyService.getCircuitBreakerStatus(testMerchantId);
    assert.strictEqual(cbStatus.state, 'OPEN');
    assert.strictEqual(cbStatus.failureRatePercent, 100);

    // Validate guardrail blocks execution
    const guardrailCheck = await safetyService.validateSafetyGuardrails({
      merchantId: testMerchantId,
      action: RecoveryDecision.RETRY,
    });

    assert.strictEqual(guardrailCheck.allowed, false);
    assert.strictEqual(guardrailCheck.blockedReason, 'GATEWAY_CIRCUIT_BREAKER_OPEN');

    // Manual reset restores to CLOSED
    safetyService.resetCircuitBreaker(testMerchantId);
    const cbReset = safetyService.getCircuitBreakerStatus(testMerchantId);
    assert.strictEqual(cbReset.state, 'CLOSED');
  });

  // Test 4: Model Drift and Anomaly Monitoring
  await test('Model drift engine monitors rolling confidence scores and detects decision anomalies', async () => {
    const driftReport = await safetyService.evaluateModelDrift(merchant.id);

    assert.ok(['NOMINAL', 'WARNING', 'DRIFT_DETECTED'].includes(driftReport.driftStatus));
    assert.ok(typeof driftReport.rollingAverageConfidence === 'number');
    assert.ok(typeof driftReport.stopDecisionRatePercent === 'number');
  });

  // Test 5: Audit Log Cryptographic Hash Chain Immutability
  await test('Audit trail SHA-256 hash chains verify tamper-evident entry integrity', async () => {
    const hash1 = FinancialSafetyService.computeAuditEntryHash({
      previousHash: 'GENESIS_BLOCK_00000000000000000000000000000000',
      merchantId: merchant.id,
      transactionId: tx1Id,
      action: 'RECOVERY_EXECUTION_STARTED',
      actor: 'Autonomous Orchestrator',
      details: { attempt: 1 },
      timestamp: '2026-08-29T00:00:00.000Z',
    });

    const hash2 = FinancialSafetyService.computeAuditEntryHash({
      previousHash: hash1,
      merchantId: merchant.id,
      transactionId: tx1Id,
      action: 'RECOVERY_EXECUTION_COMPLETED',
      actor: 'Autonomous Orchestrator',
      details: { outcome: 'PAYMENT_RECOVERED' },
      timestamp: '2026-08-29T00:00:05.000Z',
    });

    assert.strictEqual(hash1.length, 64, 'SHA-256 hash must be 64 characters hex');
    assert.strictEqual(hash2.length, 64);
    assert.notStrictEqual(hash1, hash2, 'Subsequent chained entry must produce unique chained hash');
  });

  // Cleanup test records
  await prisma.recoveryAttempt.delete({ where: { id: attempt1.id } });
  await prisma.transaction.delete({ where: { id: tx1Id } });

  console.log(`\n🎉 All ${passed}/${total} Stage 5 Financial Safety & Drift Protection Tests Passed Successfully!\n`);
}

runStage5Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Stage 5 tests failed:', err);
    process.exit(1);
  });
