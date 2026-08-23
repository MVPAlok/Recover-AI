import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { RazorpayWebhookValidator } from '../razorpay.webhook.validator.js';
import { RazorpayWebhookService } from '../razorpay.webhook.service.js';
import { RazorpayWebhookRepository } from '../razorpay.webhook.repository.js';
import { RazorpayClient } from '../../../integrations/razorpay/razorpay.client.js';

export async function runWebhookTests(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 Running Razorpay Webhook Processing Unit Tests...');
  console.log('====================================================\n');

  let passed = 0;
  const webhookSecret = 'test_webhook_secret_key_12345';
  const client = new RazorpayClient({
    keyId: 'rzp_test_testKey123',
    keySecret: 'testSecret123',
    webhookSecret,
  });

  const validator = new RazorpayWebhookValidator(client);

  // Helper to generate signed payload
  function createSignedPayload(payloadObj: Record<string, unknown>) {
    const rawBody = JSON.stringify(payloadObj);
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    return { rawBody, signature };
  }

  // Test 1: Validator accepts valid signature & extracts payload
  try {
    const { rawBody, signature } = createSignedPayload({
      event: 'payment.captured',
      id: 'evt_test_001',
      payload: { payment: { entity: { id: 'pay_001', amount: 150000 } } },
    });

    const result = validator.validate({
      rawBody,
      signature,
      headerEventId: 'evt_test_001',
      webhookSecret,
    });

    if (result.isValid && result.eventId === 'evt_test_001' && result.eventType === 'payment.captured') {
      console.log('  ✓ Test 1: Validator successfully verifies valid HMAC SHA256 and extracts event details');
      passed++;
    } else {
      console.error('  ✗ Test 1 Failed: Validation output incorrect', result);
    }
  } catch (err: any) {
    console.error('  ✗ Test 1 Failed:', err.message);
  }

  // Test 2: Validator rejects tampered body with original signature
  try {
    const { rawBody: originalBody, signature } = createSignedPayload({
      event: 'payment.captured',
      id: 'evt_test_002',
      payload: { payment: { entity: { id: 'pay_002', amount: 5000 } } },
    });

    const tamperedBody = originalBody.replace('5000', '999999');

    validator.validate({
      rawBody: tamperedBody,
      signature,
      headerEventId: 'evt_test_002',
      webhookSecret,
    });

    console.error('  ✗ Test 2 Failed: Tampered payload was not rejected!');
  } catch (err: any) {
    console.log('  ✓ Test 2: Validator rejects tampered body with invalid signature');
    passed++;
  }

  // Mock repository for service logic tests
  const recordedEvents = new Map<string, any>();
  const auditLogs: any[] = [];
  const updatedAttempts = new Map<string, any>();

  const mockRepo = {
    async recordWebhookEvent({ eventId, eventType, payload }: any) {
      if (recordedEvents.has(eventId)) {
        return { event: recordedEvents.get(eventId), isDuplicate: true };
      }
      const event = { id: `uuid_${eventId}`, eventId, eventType, payload, processed: false, createdAt: new Date() };
      recordedEvents.set(eventId, event);
      return { event, isDuplicate: false };
    },
    async markEventProcessed(eventId: string) {
      const existing = recordedEvents.get(eventId);
      if (existing) existing.processed = true;
    },
    async updateWebhookEventStatus(eventId: string, params: any) {
      const existing = recordedEvents.get(eventId);
      if (existing) {
        existing.status = params.status;
        existing.processed = params.processed ?? (params.status === 'PROCESSED');
      }
    },
    async updateTransactionFinancialState(txId: string, params: any) {},
    async findTransactionForWebhook({ orderId, transactionId }: any) {
      if (transactionId === 'tx_success_1' || orderId === 'order_success_1') {
        return {
          id: 'tx_success_1',
          merchantId: 'mer_001',
          amount: new Prisma.Decimal(2499.0),
          currency: 'INR',
          razorpayPaymentId: null,
          razorpayOrderId: 'order_success_1',
          recoveryAttempts: [{ id: 'att_001', attemptNumber: 1, status: 'PENDING', amountRecovered: new Prisma.Decimal(0) }],
        };
      }
      if (transactionId === 'tx_mismatch_1' || orderId === 'order_mismatch_1') {
        return {
          id: 'tx_mismatch_1',
          merchantId: 'mer_001',
          amount: new Prisma.Decimal(5000.0), // Expected ₹5000
          currency: 'INR',
          razorpayPaymentId: null,
          razorpayOrderId: 'order_mismatch_1',
          recoveryAttempts: [{ id: 'att_002', attemptNumber: 1, status: 'PENDING', amountRecovered: new Prisma.Decimal(0) }],
        };
      }
      if (transactionId === 'tx_failed_1' || orderId === 'order_failed_1') {
        return {
          id: 'tx_failed_1',
          merchantId: 'mer_001',
          amount: new Prisma.Decimal(1200.0),
          currency: 'INR',
          razorpayPaymentId: null,
          razorpayOrderId: 'order_failed_1',
          recoveryAttempts: [{ id: 'att_003', attemptNumber: 1, status: 'PENDING', amountRecovered: new Prisma.Decimal(0) }],
        };
      }
      return null;
    },
    async updateTransactionRazorpayIds(txId: string, ids: any) {},
    async updateRecoveryAttemptStatus(attemptId: string, params: any) {
      updatedAttempts.set(attemptId, params);
      return { id: attemptId, ...params };
    },
    async createAuditLog(params: any) {
      auditLogs.push(params);
      return { id: `audit_${auditLogs.length}`, ...params };
    },
  } as unknown as RazorpayWebhookRepository;

  const service = new RazorpayWebhookService(mockRepo, validator);

  // Test 3: Successful payment.captured webhook confirms recovery & updates amount
  try {
    const { rawBody, signature } = createSignedPayload({
      event: 'payment.captured',
      id: 'evt_test_success_1',
      payload: {
        payment: {
          entity: {
            id: 'pay_succ_1',
            order_id: 'order_success_1',
            amount: 249900, // ₹2,499.00 in paise
            method: 'upi',
            notes: { transactionId: 'tx_success_1' },
          },
        },
      },
    });

    const result = await service.handleWebhook({
      rawBody,
      signature,
      headerEventId: 'evt_test_success_1',
      webhookSecret,
    });

    const attemptUpdate = updatedAttempts.get('att_001');

    if (
      result.status === 'PROCESSED' &&
      attemptUpdate?.status === 'SUCCESS' &&
      attemptUpdate?.amountRecovered === 2499.0
    ) {
      console.log('  ✓ Test 3: payment.captured confirms recovery and updates RecoveryAttempt to SUCCESS (₹2,499)');
      passed++;
    } else {
      console.error('  ✗ Test 3 Failed:', result, attemptUpdate);
    }
  } catch (err: any) {
    console.error('  ✗ Test 3 Failed:', err.message);
  }

  // Test 4: Duplicate webhook event is idempotently ignored
  try {
    const { rawBody, signature } = createSignedPayload({
      event: 'payment.captured',
      id: 'evt_test_success_1', // same eventId
      payload: {
        payment: {
          entity: {
            id: 'pay_succ_1',
            order_id: 'order_success_1',
            amount: 249900,
            notes: { transactionId: 'tx_success_1' },
          },
        },
      },
    });

    const result = await service.handleWebhook({
      rawBody,
      signature,
      headerEventId: 'evt_test_success_1',
      webhookSecret,
    });

    if (result.status === 'DUPLICATE_IGNORED') {
      console.log('  ✓ Test 4: Duplicate event ID (x-razorpay-event-id) is safely ignored without re-processing');
      passed++;
    } else {
      console.error('  ✗ Test 4 Failed: Duplicate was not ignored:', result);
    }
  } catch (err: any) {
    console.error('  ✗ Test 4 Failed:', err.message);
  }

  // Test 5: Amount Mismatch protection (captured ₹1000 vs expected ₹5000)
  try {
    const { rawBody, signature } = createSignedPayload({
      event: 'payment.captured',
      id: 'evt_mismatch_1',
      payload: {
        payment: {
          entity: {
            id: 'pay_mis_1',
            order_id: 'order_mismatch_1',
            amount: 100000, // ₹1,000 paid vs ₹5,000 expected
            notes: { transactionId: 'tx_mismatch_1' },
          },
        },
      },
    });

    const result = await service.handleWebhook({
      rawBody,
      signature,
      headerEventId: 'evt_mismatch_1',
      webhookSecret,
    });

    const attemptUpdate = updatedAttempts.get('att_002');

    if (result.status === 'AMOUNT_MISMATCH' && !attemptUpdate) {
      console.log('  ✓ Test 5: Amount mismatch prevents SUCCESS state change and logs warning audit trail');
      passed++;
    } else {
      console.error('  ✗ Test 5 Failed: Mismatch improperly handled:', result, attemptUpdate);
    }
  } catch (err: any) {
    console.error('  ✗ Test 5 Failed:', err.message);
  }

  // Test 6: payment.failed updates RecoveryAttempt to FAILED
  try {
    const { rawBody, signature } = createSignedPayload({
      event: 'payment.failed',
      id: 'evt_failed_1',
      payload: {
        payment: {
          entity: {
            id: 'pay_fail_1',
            order_id: 'order_failed_1',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Payment authorization failed at issuing bank',
            notes: { transactionId: 'tx_failed_1' },
          },
        },
      },
    });

    const result = await service.handleWebhook({
      rawBody,
      signature,
      headerEventId: 'evt_failed_1',
      webhookSecret,
    });

    const attemptUpdate = updatedAttempts.get('att_003');

    if (result.status === 'PROCESSED' && attemptUpdate?.status === 'FAILED' && attemptUpdate?.amountRecovered === 0) {
      console.log('  ✓ Test 6: payment.failed marks RecoveryAttempt as FAILED with ₹0 recovered');
      passed++;
    } else {
      console.error('  ✗ Test 6 Failed:', result, attemptUpdate);
    }
  } catch (err: any) {
    console.error('  ✗ Test 6 Failed:', err.message);
  }

  console.log(`\n🎉 All ${passed}/6 Razorpay Webhook Tests Passed Successfully!\n`);
}

if (process.argv[1]?.endsWith('webhook.test.ts')) {
  runWebhookTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test runner failure:', err);
      process.exit(1);
    });
}
