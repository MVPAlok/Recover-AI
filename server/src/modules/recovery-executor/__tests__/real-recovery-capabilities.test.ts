import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../config/prisma.js';
import { SmartRetryScheduler } from '../smart-retry-scheduler.js';
import { RecoveryExecutorService } from '../recovery-executor.service.js';
import { RazorpayWebhookService } from '../../webhooks/razorpay.webhook.service.js';
import {
  PaymentStatus,
  RecoveryDecision,
  RecoveryStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
} from '@prisma/client';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'alok_webhook_secret_123';

function generateHmac(payload: string, secret = WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function runStage3Tests() {
  console.log('\n====================================================');
  console.log('🧪 Running Stage 3: Real Recovery Capabilities Tests...');
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

  const executor = new RecoveryExecutorService();
  const webhookService = new RazorpayWebhookService();

  // Test 1: Smart Retry Schedule Calculation
  await test('Smart Retry Scheduler calculates optimal delays and channels for failure taxonomy', async () => {
    // 1. Authentication failure -> Immediate WhatsApp / SMS link
    const authSchedule = SmartRetryScheduler.calculateSchedule({
      failureCode: 'CUSTOMER_AUTHENTICATION_FAILURE',
      retryCount: 0,
      amount: 4500,
    });
    assert.strictEqual(authSchedule.channelRecommendation, 'PAYMENT_LINK_WHATSAPP');
    assert.strictEqual(authSchedule.recommendedDelayMinutes, 0);
    assert.strictEqual(authSchedule.paymentLinkParameters?.upiIntentEnabled, true);

    // 2. Gateway Timeout -> Exponential retry delay
    const timeoutSchedule0 = SmartRetryScheduler.calculateSchedule({
      failureCode: 'GATEWAY_TIMEOUT',
      retryCount: 0,
      amount: 2500,
    });
    assert.strictEqual(timeoutSchedule0.channelRecommendation, 'GATEWAY_AUTO_RETRY');
    assert.strictEqual(timeoutSchedule0.recommendedDelayMinutes, 3);

    const timeoutSchedule1 = SmartRetryScheduler.calculateSchedule({
      failureCode: 'GATEWAY_TIMEOUT',
      retryCount: 1,
      amount: 2500,
    });
    assert.strictEqual(timeoutSchedule1.recommendedDelayMinutes, 15);

    // 3. Bank Downtime -> 30 min observation window
    const bankSchedule = SmartRetryScheduler.calculateSchedule({
      failureCode: 'BANK_DOWNTIME_SERVICE_UNAVAILABLE',
      retryCount: 0,
      amount: 2000,
    });
    assert.strictEqual(bankSchedule.recommendedDelayMinutes, 30);

    // 4. High-value transaction -> Manual review
    const highValSchedule = SmartRetryScheduler.calculateSchedule({
      failureCode: 'UNKNOWN_GATEWAY_ERROR',
      retryCount: 1,
      amount: 75000,
    });
    assert.strictEqual(highValSchedule.channelRecommendation, 'MANUAL_REVIEW');
  });

  // Test 2: Invariant: Dispatched action does NOT mark recovered until payment evidence arrives
  const testTx1Id = `stage3_tx_remind_${Date.now()}`;
  const testOrderId = `order_st3_${Date.now()}`;
  const testPaymentId = `pay_st3_${Date.now()}`;

  await prisma.transaction.create({
    data: {
      id: testTx1Id,
      merchantId: merchant.id,
      customerId: customer.id,
      amount: 4200.0,
      currency: 'INR',
      status: TransactionStatus.FAILED,
      paymentStatus: PaymentStatus.FAILED,
      recoveryStatus: TransactionRecoveryStatus.NOT_STARTED,
      failureCode: 'AUTHENTICATION_FAILURE',
      failureReason: '3DS OTP Challenge abandoned',
      retryCount: 0,
      razorpayOrderId: testOrderId,
    },
  });

  const decision1 = await prisma.aIDecision.create({
    data: {
      merchantId: merchant.id,
      transactionId: testTx1Id,
      agentType: 'RECOVERY_DECISION',
      decision: RecoveryDecision.REMIND,
      confidenceScore: 0.85,
      reasoning: 'Customer authentication abandoned; payment link generated.',
    },
  });

  await test('Dispatched recovery action strictly sets amountRecovered = 0 and awaits webhook confirmation', async () => {
    const execResult = await executor.executeDecision({
      transactionId: testTx1Id,
      decisionId: decision1.id,
      executionMode: 'simulation',
    });

    assert.strictEqual(execResult.action, RecoveryDecision.REMIND);
    assert.strictEqual(execResult.amountRecovered, 0, 'Must not claim recovered revenue upon dispatch');

    const tx = await prisma.transaction.findUnique({ where: { id: testTx1Id } });
    assert.notStrictEqual(tx?.recoveryStatus, TransactionRecoveryStatus.RECOVERED);
  });

  // Test 3: Verified Webhook Capture reconciles the Payment Link recovery
  await test('Verified payment capture completes the lifecycle to RECOVERED in PostgreSQL ledger', async () => {
    const eventId = `evt_stage3_cap_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            order_id: testOrderId,
            amount: 420000, // ₹4200.00
            currency: 'INR',
            status: 'captured',
            method: 'upi',
            notes: { transactionId: testTx1Id },
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateHmac(rawBody);

    const result = await webhookService.handleWebhook({
      rawBody,
      signature,
      headerEventId: eventId,
      bodyPayload: payload,
    });

    assert.strictEqual(result.status, 'PROCESSED');

    const reconciledTx = await prisma.transaction.findUnique({ where: { id: testTx1Id } });
    assert.strictEqual(reconciledTx?.status, TransactionStatus.SUCCESS);
    assert.strictEqual(reconciledTx?.recoveryStatus, TransactionRecoveryStatus.RECOVERED);

    const paymentLedger = await prisma.payment.findFirst({
      where: { transactionId: testTx1Id, reconciled: true },
    });
    assert.ok(paymentLedger);
    assert.strictEqual(paymentLedger.capturedAmount?.toNumber(), 4200.0);
  });

  // Cleanup test transaction
  await prisma.transaction.delete({ where: { id: testTx1Id } });

  console.log(`\n🎉 All ${passed}/${total} Stage 3 Real Recovery Capabilities Tests Passed Successfully!\n`);
}

runStage3Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Stage 3 tests failed:', err);
    process.exit(1);
  });
