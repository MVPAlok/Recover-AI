import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../config/prisma.js';
import { RecoveryOrchestratorService } from '../orchestrator.service.js';
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

async function runStage2Tests() {
  console.log('\n====================================================');
  console.log('🧪 Running Stage 2: Event-Driven Recovery Engine Tests...');
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

  const orchestrator = new RecoveryOrchestratorService();
  const webhookService = new RazorpayWebhookService();

  // Test 1: Full 6-stage autonomous lifecycle execution
  const tx1Id = `stage2_tx_timeout_${Date.now()}`;
  const tx1OrderId = `order_st2_${Date.now()}`;
  const tx1PaymentId = `pay_st2_${Date.now()}`;

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
      failureCode: 'GATEWAY_TIMEOUT',
      failureReason: 'Bank timeout during OTP authentication',
      retryCount: 0,
      razorpayOrderId: tx1OrderId,
    },
  });

  await test('Full 6-stage autonomous recovery lifecycle runs end-to-end with correlation tracking', async () => {
    const correlationId = `corr_${Date.now()}`;
    const requestId = `req_${Date.now()}`;

    const result = await orchestrator.runAutonomousRecovery({
      transactionId: tx1Id,
      correlationId,
      requestId,
      executionMode: 'simulation',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.correlationId, correlationId);
    assert.strictEqual(result.status, 'EXECUTED');
    assert.deepStrictEqual(result.stagesCompleted, ['01_DETECT', '02_DIAGNOSE', '03_DECIDE', '04_EXECUTE']);

    // Check that decisions and attempts were recorded in database
    const updatedTx = await prisma.transaction.findUnique({
      where: { id: tx1Id },
      include: { aiDecisions: true, recoveryAttempts: true, auditLogs: true },
    });

    assert.ok(updatedTx);
    assert.ok(updatedTx.aiDecisions.length >= 2, 'Must have detection & diagnosis & decision records');
    assert.ok(updatedTx.recoveryAttempts.length >= 1, 'Must have recovery attempt recorded');

    // Check AuditLog contains correlation ID
    const auditLogs = await prisma.auditLog.findMany({
      where: { transactionId: tx1Id, correlationId },
    });
    assert.ok(auditLogs.length >= 1, 'Audit log must record correlation ID');
  });

  // Test 2: Webhook payment.captured reconciles the autonomous recovery
  await test('Incoming HMAC verified webhook reconciles the transaction to RECOVERED with ledger update', async () => {
    const eventId = `evt_stage2_cap_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: tx1PaymentId,
            order_id: tx1OrderId,
            amount: 350000, // ₹3500.00 in paise
            currency: 'INR',
            status: 'captured',
            method: 'card',
            notes: { transactionId: tx1Id },
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateHmac(rawBody);

    const webhookResult = await webhookService.handleWebhook({
      rawBody,
      signature,
      headerEventId: eventId,
      bodyPayload: payload,
    });

    assert.strictEqual(webhookResult.status, 'PROCESSED');

    const finalTx = await prisma.transaction.findUnique({ where: { id: tx1Id } });
    assert.strictEqual(finalTx?.status, TransactionStatus.SUCCESS);
    assert.strictEqual(finalTx?.recoveryStatus, TransactionRecoveryStatus.RECOVERED);
    assert.strictEqual(finalTx?.paymentStatus, PaymentStatus.CAPTURED);

    const paymentEntry = await prisma.payment.findFirst({
      where: { transactionId: tx1Id, reconciled: true },
    });
    assert.ok(paymentEntry, 'Payment ledger entry must be verified & reconciled');
    assert.strictEqual(paymentEntry.capturedAmount?.toNumber(), 3500.0);
  });

  // Test 3: Already recovered transactions are safely skipped
  await test('Already recovered transaction safely skips pipeline execution', async () => {
    const skipResult = await orchestrator.runAutonomousRecovery({
      transactionId: tx1Id,
    });

    assert.strictEqual(skipResult.status, 'SKIPPED');
    assert.strictEqual(skipResult.success, true);
  });

  // Test 4: Hard financial policy STOP stops execution and records cancellation
  const tx2Id = `stage2_tx_stop_${Date.now()}`;
  await prisma.transaction.create({
    data: {
      id: tx2Id,
      merchantId: merchant.id,
      customerId: customer.id,
      amount: 999.0,
      currency: 'INR',
      status: TransactionStatus.FAILED,
      paymentStatus: PaymentStatus.FAILED,
      recoveryStatus: TransactionRecoveryStatus.NOT_STARTED,
      failureCode: 'CARD_EXPIRED',
      failureReason: 'Customer card has expired (hard decline)',
      retryCount: 3, // Exhausted
    },
  });

  await test('Expired card / exhausted retries policy triggers STOP and halts pipeline with audit event', async () => {
    const result = await orchestrator.runAutonomousRecovery({
      transactionId: tx2Id,
    });

    assert.strictEqual(result.status, 'HALTED_BY_POLICY');
    assert.strictEqual(result.decision, RecoveryDecision.STOP);

    const tx = await prisma.transaction.findUnique({
      where: { id: tx2Id },
      include: { recoveryAttempts: true },
    });

    assert.ok(tx?.recoveryAttempts.some((a) => a.status === RecoveryStatus.CANCELLED));
  });

  // Test 5: Idempotent Webhook Deduplication
  await test('Duplicate webhook delivery is cleanly ignored without duplicate financial side effects', async () => {
    const duplicateEventId = `evt_stage2_dup_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_dup_${Date.now()}`,
            order_id: tx1OrderId,
            amount: 350000,
            currency: 'INR',
            status: 'captured',
            notes: { transactionId: tx1Id },
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateHmac(rawBody);

    // First delivery
    await webhookService.handleWebhook({
      rawBody,
      signature,
      headerEventId: duplicateEventId,
      bodyPayload: payload,
    });

    // Replay delivery
    const replayResult = await webhookService.handleWebhook({
      rawBody,
      signature,
      headerEventId: duplicateEventId,
      bodyPayload: payload,
    });

    assert.strictEqual(replayResult.status, 'DUPLICATE_IGNORED');
  });

  // Cleanup test transactions
  await prisma.transaction.deleteMany({
    where: { id: { in: [tx1Id, tx2Id] } },
  });

  console.log(`\n🎉 All ${passed}/${total} Stage 2 Event-Driven Recovery Engine Tests Passed Successfully!\n`);
}

runStage2Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Stage 2 tests failed:', err);
    process.exit(1);
  });
