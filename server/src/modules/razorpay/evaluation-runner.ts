import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { RazorpayClient } from '../../integrations/razorpay/razorpay.client.js';
import { RazorpayWebhookValidator } from '../webhooks/razorpay.webhook.validator.js';
import { RazorpayWebhookService } from '../webhooks/razorpay.webhook.service.js';
import { RazorpayWebhookRepository } from '../webhooks/razorpay.webhook.repository.js';
import { RecoveryExecutorService } from '../recovery-executor/recovery-executor.service.js';
import { ExecutionRepository } from '../recovery-executor/execution.repository.js';
import { RazorpayTestProvider } from '../recovery-executor/providers/razorpay-test.provider.js';

interface ScenarioResult {
  scenarioId: string;
  name: string;
  expectedOutcome: string;
  actualOutcome: string;
  passed: boolean;
  notes?: string;
}

export async function runRazorpayE2EEvaluation(): Promise<ScenarioResult[]> {
  console.log('================================================================');
  console.log('🚀 Phase 7: Razorpay Test Mode End-to-End Evaluation');
  console.log('================================================================\n');

  const results: ScenarioResult[] = [];
  const webhookSecret = 'rzp_wh_secret_eval_suite_12345';

  const mockRazorpayClient = {
    async createOrder(params: any) {
      return {
        id: `order_test_${Date.now()}`,
        entity: 'order',
        amount: params.amount,
        amount_paid: 0,
        amount_due: params.amount,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        status: 'created',
        attempts: 0,
        notes: params.notes || {},
        created_at: Math.floor(Date.now() / 1000),
      };
    },
    async createPaymentLink(params: any) {
      return {
        id: `plink_test_${Date.now()}`,
        short_url: `https://rzp.io/i/test_${Date.now()}`,
        status: 'created',
        amount: params.amount,
        amount_paid: 0,
        currency: params.currency || 'INR',
        description: params.description,
        customer: params.customer,
        created_at: Math.floor(Date.now() / 1000),
      };
    },
    verifyWebhookSignature(rawBody: Buffer | string, signature: string, secret?: string): boolean {
      const sec = secret || webhookSecret;
      const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expected = crypto.createHmac('sha256', sec).update(payload).digest('hex');
      try {
        const sigBuf = Buffer.from(signature, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
      } catch {
        return false;
      }
    },
  } as unknown as RazorpayClient;

  // In-memory mock database for E2E evaluation
  const mockTransactions = new Map<string, any>();
  const mockAttempts = new Map<string, any>();
  const mockAuditLogs: any[] = [];
  const mockWebhookEvents = new Map<string, any>();

  const mockExecRepo = {
    async getTransactionWithDetails(id: string) {
      return mockTransactions.get(id) || null;
    },
    async createRecoveryAttempt(data: any) {
      const attempt = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...data,
        amountRecovered: new Prisma.Decimal(data.amountRecovered || 0),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAttempts.set(attempt.id, attempt);
      const tx = mockTransactions.get(data.transactionId);
      if (tx) tx.recoveryAttempts.push(attempt);
      return attempt;
    },
    async updateRecoveryAttemptOutcome(id: string, outcome: any) {
      const attempt = mockAttempts.get(id);
      if (attempt) {
        Object.assign(attempt, outcome);
        attempt.amountRecovered = new Prisma.Decimal(outcome.amountRecovered || 0);
      }
      return attempt;
    },
    async incrementTransactionRetryCount(txId: string) {
      const tx = mockTransactions.get(txId);
      if (tx) tx.retryCount += 1;
      return tx;
    },
    async createAuditLog(data: any) {
      const log = { id: `log_${mockAuditLogs.length}`, ...data, createdAt: new Date() };
      mockAuditLogs.push(log);
      return log;
    },
  } as unknown as ExecutionRepository;

  const mockWebhookRepo = {
    async recordWebhookEvent({ eventId, eventType, payload }: any) {
      if (mockWebhookEvents.has(eventId)) {
        return { event: mockWebhookEvents.get(eventId), isDuplicate: true };
      }
      const event = { id: `wh_${eventId}`, eventId, eventType, payload, processed: false, createdAt: new Date() };
      mockWebhookEvents.set(eventId, event);
      return { event, isDuplicate: false };
    },
    async markEventProcessed(eventId: string) {
      const existing = mockWebhookEvents.get(eventId);
      if (existing) existing.processed = true;
    },
    async findTransactionForWebhook({ orderId, transactionId }: any) {
      if (transactionId && mockTransactions.has(transactionId)) {
        return mockTransactions.get(transactionId);
      }
      for (const tx of mockTransactions.values()) {
        if (tx.razorpayOrderId === orderId) return tx;
      }
      return null;
    },
    async updateTransactionRazorpayIds(txId: string, ids: any) {
      const tx = mockTransactions.get(txId);
      if (tx) {
        if (ids.razorpayOrderId) tx.razorpayOrderId = ids.razorpayOrderId;
        if (ids.razorpayPaymentId) tx.razorpayPaymentId = ids.razorpayPaymentId;
      }
    },
    async updateRecoveryAttemptStatus(attemptId: string, params: any) {
      const attempt = mockAttempts.get(attemptId);
      if (attempt) {
        Object.assign(attempt, params);
        if (params.amountRecovered !== undefined) {
          attempt.amountRecovered = new Prisma.Decimal(params.amountRecovered);
        }
      }
    },
    async createAuditLog(params: any) {
      const log = { id: `whlog_${mockAuditLogs.length}`, ...params, createdAt: new Date() };
      mockAuditLogs.push(log);
      return log;
    },
  } as unknown as RazorpayWebhookRepository;

  const provider = new RazorpayTestProvider(mockRazorpayClient);
  const executorService = new RecoveryExecutorService(mockExecRepo, provider);
  const webhookValidator = new RazorpayWebhookValidator(mockRazorpayClient);
  const webhookService = new RazorpayWebhookService(mockWebhookRepo, webhookValidator);

  function signPayload(payloadObj: Record<string, unknown>, secret = webhookSecret) {
    const rawBody = JSON.stringify(payloadObj);
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return { rawBody, signature };
  }

  // =================================================================
  // SCENARIO A: Successful Retry (Order → payment.captured webhook)
  // =================================================================
  console.log('📋 Scenario A: Successful Retry Workflow (Order Generation + payment.captured Webhook)');
  const txA = {
    id: 'tx_eval_scenario_a',
    merchantId: 'mer_eval_01',
    customerId: 'cust_eval_01',
    amount: new Prisma.Decimal(2499.0),
    currency: 'INR',
    status: 'FAILED',
    retryCount: 0,
    razorpayOrderId: null,
    razorpayPaymentId: null,
    customer: { id: 'cust_eval_01', name: 'Aarav Patel', email: 'aarav@example.com' },
    merchant: { id: 'mer_eval_01', name: 'QuickCart' },
    aiDecisions: [
      {
        id: 'dec_scenario_a',
        merchantId: 'mer_eval_01',
        transactionId: 'tx_eval_scenario_a',
        agentType: 'RECOVERY_DECISION',
        decision: 'RETRY',
        recoveryProbability: 0.88,
        createdAt: new Date(),
      },
    ],
    recoveryAttempts: [] as any[],
  };
  mockTransactions.set(txA.id, txA);

  const execA = await executorService.executeDecision({
    transactionId: txA.id,
    decisionId: 'dec_scenario_a',
    executionMode: 'razorpay_test',
  });

  const orderIdA = (execA.metadata as any)?.razorpayOrderId;
  txA.razorpayOrderId = orderIdA;

  // Webhook arrives confirming capture
  const { rawBody: bodyA, signature: sigA } = signPayload({
    event: 'payment.captured',
    id: 'evt_eval_a_001',
    payload: {
      payment: {
        entity: {
          id: 'pay_rzp_eval_001',
          order_id: orderIdA,
          amount: 249900, // ₹2,499 in paise
          method: 'card',
          notes: { transactionId: txA.id },
        },
      },
    },
  });

  const whA = await webhookService.handleWebhook({
    rawBody: bodyA,
    signature: sigA,
    headerEventId: 'evt_eval_a_001',
    webhookSecret,
  });

  const finalAttemptA = txA.recoveryAttempts[0];
  const passedA =
    execA.status === 'PENDING' &&
    whA.status === 'PROCESSED' &&
    finalAttemptA?.status === 'SUCCESS' &&
    finalAttemptA?.amountRecovered.toNumber() === 2499.0;

  console.log(`   Order Created:    ${orderIdA}`);
  console.log(`   Webhook Outcome:  ${whA.status}`);
  console.log(`   Attempt Status:   ${finalAttemptA?.status} (₹${finalAttemptA?.amountRecovered})`);
  console.log(`   Result:           ${passedA ? '✅ PASS' : '❌ FAIL'}\n`);

  results.push({
    scenarioId: 'SCENARIO_A',
    name: 'Successful Retry via Razorpay Test Order + Webhook Capture',
    expectedOutcome: 'SUCCESS (₹2,499)',
    actualOutcome: `${finalAttemptA?.status} (₹${finalAttemptA?.amountRecovered})`,
    passed: passedA,
  });

  // =================================================================
  // SCENARIO B: Failed Retry (payment.failed webhook)
  // =================================================================
  console.log('📋 Scenario B: Failed Retry via Gateway (payment.failed Webhook)');
  const txB = {
    id: 'tx_eval_scenario_b',
    merchantId: 'mer_eval_01',
    customerId: 'cust_eval_02',
    amount: new Prisma.Decimal(1500.0),
    currency: 'INR',
    status: 'FAILED',
    retryCount: 1,
    razorpayOrderId: null,
    razorpayPaymentId: null,
    customer: { id: 'cust_eval_02', name: 'Neha Sharma', email: 'neha@example.com' },
    merchant: { id: 'mer_eval_01', name: 'QuickCart' },
    aiDecisions: [
      {
        id: 'dec_scenario_b',
        merchantId: 'mer_eval_01',
        transactionId: 'tx_eval_scenario_b',
        agentType: 'RECOVERY_DECISION',
        decision: 'RETRY',
        recoveryProbability: 0.65,
        createdAt: new Date(),
      },
    ],
    recoveryAttempts: [] as any[],
  };
  mockTransactions.set(txB.id, txB);

  await executorService.executeDecision({
    transactionId: txB.id,
    decisionId: 'dec_scenario_b',
    executionMode: 'razorpay_test',
  });

  const { rawBody: bodyB, signature: sigB } = signPayload({
    event: 'payment.failed',
    id: 'evt_eval_b_001',
    payload: {
      payment: {
        entity: {
          id: 'pay_rzp_eval_fail_002',
          order_id: txB.razorpayOrderId,
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'Card declined by issuing bank',
          notes: { transactionId: txB.id },
        },
      },
    },
  });

  const whB = await webhookService.handleWebhook({
    rawBody: bodyB,
    signature: sigB,
    headerEventId: 'evt_eval_b_001',
    webhookSecret,
  });

  const finalAttemptB = txB.recoveryAttempts[0];
  const passedB =
    whB.status === 'PROCESSED' &&
    finalAttemptB?.status === 'FAILED' &&
    finalAttemptB?.amountRecovered.toNumber() === 0;

  console.log(`   Webhook Outcome:  ${whB.status}`);
  console.log(`   Attempt Status:   ${finalAttemptB?.status} (₹${finalAttemptB?.amountRecovered})`);
  console.log(`   Result:           ${passedB ? '✅ PASS' : '❌ FAIL'}\n`);

  results.push({
    scenarioId: 'SCENARIO_B',
    name: 'Failed Retry Notification via payment.failed Webhook',
    expectedOutcome: 'FAILED (₹0)',
    actualOutcome: `${finalAttemptB?.status} (₹${finalAttemptB?.amountRecovered})`,
    passed: passedB,
  });

  // =================================================================
  // SCENARIO C: Duplicate Webhook Event (Idempotency)
  // =================================================================
  console.log('📋 Scenario C: Duplicate Webhook Event ID Idempotency');
  const whC = await webhookService.handleWebhook({
    rawBody: bodyA,
    signature: sigA,
    headerEventId: 'evt_eval_a_001', // Re-sending same eventId from Scenario A
    webhookSecret,
  });

  const passedC = whC.status === 'DUPLICATE_IGNORED';
  console.log(`   Webhook Status:   ${whC.status}`);
  console.log(`   Result:           ${passedC ? '✅ PASS' : '❌ FAIL'}\n`);

  results.push({
    scenarioId: 'SCENARIO_C',
    name: 'Duplicate Webhook Idempotency (x-razorpay-event-id)',
    expectedOutcome: 'DUPLICATE_IGNORED',
    actualOutcome: whC.status,
    passed: passedC,
  });

  // =================================================================
  // SCENARIO D: Invalid / Tampered Webhook Signature
  // =================================================================
  console.log('📋 Scenario D: Invalid & Tampered Webhook Signature Rejection');
  let passedD = false;
  try {
    const tamperedBody = bodyA.replace('249900', '9999900');
    await webhookService.handleWebhook({
      rawBody: tamperedBody,
      signature: sigA,
      headerEventId: 'evt_tampered_001',
      webhookSecret,
    });
  } catch (err: any) {
    passedD = true;
  }

  console.log(`   Signature Check:  ${passedD ? 'REJECTED (Invalid Signature)' : 'ACCEPTED (Vulnerability!)'}`);
  console.log(`   Result:           ${passedD ? '✅ PASS' : '❌ FAIL'}\n`);

  results.push({
    scenarioId: 'SCENARIO_D',
    name: 'Tampered Signature Validation & Security Rejection',
    expectedOutcome: 'REJECTED',
    actualOutcome: passedD ? 'REJECTED' : 'ACCEPTED',
    passed: passedD,
  });

  // =================================================================
  // SCENARIO E: Amount Mismatch Protection
  // =================================================================
  console.log('📋 Scenario E: Gateway Amount Mismatch Protection');
  const txE = {
    id: 'tx_eval_scenario_e',
    merchantId: 'mer_eval_01',
    customerId: 'cust_eval_03',
    amount: new Prisma.Decimal(5000.0), // Expected ₹5,000
    currency: 'INR',
    status: 'FAILED',
    retryCount: 0,
    razorpayOrderId: 'order_eval_e_001',
    razorpayPaymentId: null,
    customer: { id: 'cust_eval_03', name: 'Rohan Gupta', email: 'rohan@example.com' },
    merchant: { id: 'mer_eval_01', name: 'QuickCart' },
    aiDecisions: [],
    recoveryAttempts: [
      {
        id: 'att_scenario_e',
        attemptNumber: 1,
        status: 'PENDING',
        amountRecovered: new Prisma.Decimal(0),
      },
    ],
  };
  mockTransactions.set(txE.id, txE);

  const { rawBody: bodyE, signature: sigE } = signPayload({
    event: 'payment.captured',
    id: 'evt_eval_e_001',
    payload: {
      payment: {
        entity: {
          id: 'pay_rzp_eval_e_001',
          order_id: 'order_eval_e_001',
          amount: 100000, // Paid ₹1,000 vs expected ₹5,000
          notes: { transactionId: txE.id },
        },
      },
    },
  });

  const whE = await webhookService.handleWebhook({
    rawBody: bodyE,
    signature: sigE,
    headerEventId: 'evt_eval_e_001',
    webhookSecret,
  });

  const attemptE = txE.recoveryAttempts[0];
  const passedE = whE.status === 'AMOUNT_MISMATCH' && attemptE.status === 'PENDING';

  console.log(`   Webhook Outcome:  ${whE.status}`);
  console.log(`   Attempt Status:   ${attemptE.status} (Amount: ₹${attemptE.amountRecovered})`);
  console.log(`   Result:           ${passedE ? '✅ PASS' : '❌ FAIL'}\n`);

  results.push({
    scenarioId: 'SCENARIO_E',
    name: 'Gateway Amount Mismatch Financial Integrity Guardrail',
    expectedOutcome: 'AMOUNT_MISMATCH (Recovery not confirmed)',
    actualOutcome: whE.status,
    passed: passedE,
  });

  // =================================================================
  // SCENARIO F: Stale Decision Guardrail
  // =================================================================
  console.log('📋 Scenario F: Stale Decision (>30m) Guardrail Enforcement');
  const staleDate = new Date(Date.now() - 45 * 60 * 1000); // 45 mins old
  const txF = {
    id: 'tx_eval_scenario_f',
    merchantId: 'mer_eval_01',
    customerId: 'cust_eval_04',
    amount: new Prisma.Decimal(3000.0),
    currency: 'INR',
    status: 'FAILED',
    retryCount: 0,
    razorpayOrderId: null,
    razorpayPaymentId: null,
    customer: { id: 'cust_eval_04', name: 'Vikram Rao', email: 'vikram@example.com' },
    merchant: { id: 'mer_eval_01', name: 'QuickCart' },
    aiDecisions: [
      {
        id: 'dec_scenario_f',
        merchantId: 'mer_eval_01',
        transactionId: 'tx_eval_scenario_f',
        agentType: 'RECOVERY_DECISION',
        decision: 'RETRY',
        createdAt: staleDate,
      },
    ],
    recoveryAttempts: [] as any[],
  };
  mockTransactions.set(txF.id, txF);

  const execF = await executorService.executeDecision({
    transactionId: txF.id,
    decisionId: 'dec_scenario_f',
    executionMode: 'razorpay_test',
  });

  const passedF = execF.outcomeCode === 'STALE_DECISION_BLOCKED' && execF.status === 'CANCELLED';
  console.log(`   Executor Outcome: ${execF.outcomeCode} (Status: ${execF.status})`);
  console.log(`   Result:           ${passedF ? '✅ PASS' : '❌ FAIL'}\n`);

  results.push({
    scenarioId: 'SCENARIO_F',
    name: 'Stale Decision Prevention Guardrail',
    expectedOutcome: 'STALE_DECISION_BLOCKED',
    actualOutcome: execF.outcomeCode,
    passed: passedF,
  });

  // =================================================================
  // SCENARIO G: Retry Limit Exceeded Guardrail (retryCount = 3)
  // =================================================================
  console.log('📋 Scenario G: Retry Limit Exceeded Guardrail (retryCount = 3)');
  const txG = {
    id: 'tx_eval_scenario_g',
    merchantId: 'mer_eval_01',
    customerId: 'cust_eval_05',
    amount: new Prisma.Decimal(1999.0),
    currency: 'INR',
    status: 'FAILED',
    retryCount: 3, // Maximum reached
    razorpayOrderId: null,
    razorpayPaymentId: null,
    customer: { id: 'cust_eval_05', name: 'Ananya Roy', email: 'ananya@example.com' },
    merchant: { id: 'mer_eval_01', name: 'QuickCart' },
    aiDecisions: [
      {
        id: 'dec_scenario_g',
        merchantId: 'mer_eval_01',
        transactionId: 'tx_eval_scenario_g',
        agentType: 'RECOVERY_DECISION',
        decision: 'STOP',
        createdAt: new Date(),
      },
    ],
    recoveryAttempts: [] as any[],
  };
  mockTransactions.set(txG.id, txG);

  const execG = await executorService.executeDecision({
    transactionId: txG.id,
    decisionId: 'dec_scenario_g',
    executionMode: 'razorpay_test',
  });

  const passedG = execG.action === 'STOP' && execG.status === 'CANCELLED';
  console.log(`   Action / Status:  ${execG.action} / ${execG.status}`);
  console.log(`   Result:           ${passedG ? '✅ PASS' : '❌ FAIL'}\n`);

  results.push({
    scenarioId: 'SCENARIO_G',
    name: 'Retry Limit Policy Enforcement (STOP action)',
    expectedOutcome: 'STOP / CANCELLED',
    actualOutcome: `${execG.action} / ${execG.status}`,
    passed: passedG,
  });

  const totalPassed = results.filter((r) => r.passed).length;
  console.log('================================================================');
  console.log(`📊 Phase 7 E2E Evaluation Score: ${totalPassed}/${results.length} (${((totalPassed / results.length) * 100).toFixed(1)}%)`);
  console.log('================================================================\n');

  return results;
}

if (process.argv[1]?.endsWith('evaluation-runner.ts')) {
  runRazorpayE2EEvaluation()
    .then((results) => {
      const allPassed = results.every((r) => r.passed);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('E2E Evaluation failed with uncaught error:', err);
      process.exit(1);
    });
}
