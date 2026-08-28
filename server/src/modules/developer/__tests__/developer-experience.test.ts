import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../config/prisma.js';
import { DeveloperService } from '../developer.service.js';
import crypto from 'crypto';

async function runStage6Tests() {
  console.log('\n====================================================');
  console.log('🧪 Running Stage 6: Enterprise & Developer Experience Tests...');
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

  const devService = new DeveloperService();

  // Test 1: Sandbox Webhook Testing & Payload Emulator
  await test('Generates realistic sandbox webhook payloads with valid cryptographic HMAC SHA-256 signatures', async () => {
    const emulation = devService.generateTestWebhook({
      eventType: 'payment.failed',
      transactionId: `tx_emu_${Date.now()}`,
      amount: 5000.0,
      failureCode: 'PAYMENT_FAILED_AUTH_ERROR',
      failureReason: '3DS OTP expired',
    });

    assert.strictEqual(emulation.eventType, 'payment.failed');
    assert.strictEqual(emulation.payload.payload.payment.entity.amount, 500000); // 5000 * 100 paise
    assert.ok(emulation.signature.length === 64, 'HMAC signature must be 64 characters hex');
    assert.ok(emulation.curlCommand.includes('curl -X POST'));

    // Verify HMAC
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'alok_webhook_secret_123')
      .update(emulation.rawBody)
      .digest('hex');
    assert.strictEqual(emulation.signature, expectedSig);
  });

  // Test 2: Developer API Key Management
  await test('Generates scoped developer API keys with secret token displayed once and masked prefix stored', async () => {
    const keyData = await devService.createApiKey(merchant.id, 'Production Ingestion Key');

    assert.ok(keyData.token.startsWith('rec_live_'));
    assert.strictEqual(keyData.prefix.length, 15);
    assert.strictEqual(keyData.name, 'Production Ingestion Key');

    const keyList = devService.listApiKeys(merchant.id);
    assert.ok(keyList.length >= 1);
    assert.strictEqual(keyList[0].keyPrefix, keyData.prefix);
  });

  // Test 3: Outbound Webhook Subscriptions
  await test('Registers and lists outbound merchant webhook subscription endpoints', async () => {
    const sub = devService.registerWebhookSubscription({
      merchantId: merchant.id,
      url: 'https://merchant-api.example.com/webhooks/recoverai',
      events: ['recovery.started', 'recovery.succeeded'],
    });

    assert.strictEqual(sub.url, 'https://merchant-api.example.com/webhooks/recoverai');
    assert.strictEqual(sub.isActive, true);
    assert.ok(sub.secret.startsWith('whsec_'));

    const subs = devService.listWebhookSubscriptions(merchant.id);
    assert.ok(subs.some((s) => s.id === sub.id));
  });

  // Test 4: Compliance & Finance Audit Report Exporter (CSV and JSON)
  await test('Exports immutable compliance audit logs in standard CSV and JSON format', async () => {
    // JSON export
    const jsonReport = await devService.exportAuditReport({
      merchantId: merchant.id,
      format: 'json',
      limit: 10,
    });
    assert.strictEqual(jsonReport.format, 'json');
    assert.ok(typeof jsonReport.rowCount === 'number');
    const parsed = JSON.parse(jsonReport.data);
    assert.ok(Array.isArray(parsed));

    // CSV export
    const csvReport = await devService.exportAuditReport({
      merchantId: merchant.id,
      format: 'csv',
      limit: 10,
    });
    assert.strictEqual(csvReport.format, 'csv');
    assert.ok(csvReport.data.startsWith('id,timestamp,transactionId,entityType,action,actor,actorType,details'));
  });

  // Test 5: Webhook Event Replay Engine
  const testEventId = `evt_replay_seed_${Date.now()}`;
  await prisma.razorpayWebhookEvent.create({
    data: {
      eventId: testEventId,
      merchantId: merchant.id,
      eventType: 'payment.failed',
      payload: {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              amount: 100000,
              currency: 'INR',
              status: 'failed',
            },
          },
        },
      },
      status: 'PROCESSED',
    },
  });

  await test('Replays ingested webhook events generating new audit trails and verification cycles', async () => {
    const replayResult = await devService.replayWebhook(testEventId);

    assert.strictEqual(replayResult.success, true);
    assert.strictEqual(replayResult.eventId, testEventId);
  });

  // Cleanup test event
  await prisma.razorpayWebhookEvent.delete({ where: { eventId: testEventId } });

  console.log(`\n🎉 All ${passed}/${total} Stage 6 Enterprise & Developer Experience Tests Passed Successfully!\n`);
}

runStage6Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Stage 6 tests failed:', err);
    process.exit(1);
  });
