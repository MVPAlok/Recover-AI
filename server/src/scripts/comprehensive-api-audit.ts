import http from 'http';
import app from '../app.js';
import { prisma } from '../config/prisma.js';
import crypto from 'crypto';

interface AuditResult {
  category: string;
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  httpStatus: number;
  expectedStatus: number;
  durationMs: number;
  details: string;
}

const results: AuditResult[] = [];

async function recordTest(
  category: string,
  endpoint: string,
  method: string,
  fn: () => Promise<Response>,
  expectedStatus: number = 200,
  validator?: (body: any) => void
) {
  const start = Date.now();
  try {
    const res = await fn();
    const durationMs = Date.now() - start;
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // not json
    }

    let status: 'PASS' | 'FAIL' = res.status === expectedStatus ? 'PASS' : 'FAIL';
    let details = `HTTP ${res.status}`;

    if (validator && status === 'PASS') {
      try {
        validator(body);
        details += ' | Contract Verified';
      } catch (err: unknown) {
        status = 'FAIL';
        details += ` | Validation failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    results.push({
      category,
      endpoint,
      method,
      status,
      httpStatus: res.status,
      expectedStatus,
      durationMs,
      details,
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    results.push({
      category,
      endpoint,
      method,
      status: 'FAIL',
      httpStatus: 0,
      expectedStatus,
      durationMs,
      details: `Exception: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

async function runMasterApiAudit() {
  console.log('====================================================');
  console.log('🚀 RECOVERAI MASTER SYSTEM API AUDIT & VERIFICATION');
  console.log('====================================================\n');

  // Start ephemeral test server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  try {
    // Fetch a sample merchant and transactions
    const merchants = await prisma.merchant.findMany({ take: 2 });
    if (merchants.length < 2) {
      throw new Error('Need at least 2 merchants for isolation testing.');
    }

    const merchantA = merchants[0];
    const merchantB = merchants[1];

    const sampleTxA = await prisma.transaction.findFirst({
      where: { merchantId: merchantA.id },
      include: { customer: true },
    });
    const sampleFailedTxA = await prisma.transaction.findFirst({
      where: { merchantId: merchantA.id, status: 'FAILED' },
      include: { customer: true },
    });
    const sampleTxB = await prisma.transaction.findFirst({
      where: { merchantId: merchantB.id },
    });

    console.log(`Merchant A: "${merchantA.name}" (${merchantA.id})`);
    console.log(`Merchant B: "${merchantB.name}" (${merchantB.id})`);
    console.log(`Sample Tx A: ${sampleTxA?.id}`);
    console.log(`Sample Failed Tx A: ${sampleFailedTxA?.id}`);
    console.log(`Sample Tx B: ${sampleTxB?.id}\n`);

    // --- 1. HEALTH & METRICS ---
    console.log('--- 1. Health Endpoints ---');
    await recordTest('Health', '/api/health', 'GET', () => fetch(`${baseUrl}/api/health`), 200, (body) => {
      if (!body.status || body.status !== 'healthy') throw new Error('Status not healthy');
    });

    // --- 2. DASHBOARD APIS ---
    console.log('--- 2. Dashboard Endpoints ---');
    await recordTest('Dashboard', '/api/dashboard/merchants', 'GET', () => fetch(`${baseUrl}/api/dashboard/merchants`), 200, (body) => {
      if (!Array.isArray(body.data) || body.data.length === 0) throw new Error('No merchants returned');
    });

    await recordTest('Dashboard', '/api/dashboard/overview', 'GET', () => 
      fetch(`${baseUrl}/api/dashboard/overview`, {
        headers: { 'x-merchant-id': merchantA.id }
      }), 
      200, 
      (body) => {
        const d = body.data;
        if (d.revenueAtRisk === undefined || d.recoveredRevenue === undefined || d.recoveryRate === undefined) {
          throw new Error('Missing core metrics in overview');
        }
      }
    );

    await recordTest('Dashboard', '/api/dashboard/recovery-opportunities', 'GET', () => 
      fetch(`${baseUrl}/api/dashboard/recovery-opportunities?limit=5`, {
        headers: { 'x-merchant-id': merchantA.id }
      }), 
      200, 
      (body) => {
        if (!Array.isArray(body.data)) throw new Error('Data should be an array');
      }
    );

    await recordTest('Dashboard', '/api/integrations/razorpay/status', 'GET', () => fetch(`${baseUrl}/api/integrations/razorpay/status`), 200, (body) => {
      const d = body.data;
      if (d.mode !== 'TEST MODE') throw new Error('Should expose TEST MODE');
      if (d.keySecret || d.webhookSecret) throw new Error('SECURITY VIOLATION: Leaked secret key!');
    });

    // --- 3. TRANSACTIONS APIS ---
    console.log('--- 3. Transactions Endpoints ---');
    await recordTest('Transactions', '/api/transactions', 'GET', () => 
      fetch(`${baseUrl}/api/transactions?page=1&limit=10`, {
        headers: { 'x-merchant-id': merchantA.id }
      }), 
      200, 
      (body) => {
        if (!Array.isArray(body.data) || body.meta?.total === undefined) throw new Error('Malformed pagination response');
      }
    );

    await recordTest('Transactions', '/api/transactions (Search)', 'GET', () => 
      fetch(`${baseUrl}/api/transactions?search=Advik`, {
        headers: { 'x-merchant-id': merchantA.id }
      }), 
      200, 
      (body) => {
        if (!Array.isArray(body.data)) throw new Error('Search failed');
      }
    );

    await recordTest('Transactions', '/api/transactions (Filter status=FAILED)', 'GET', () => 
      fetch(`${baseUrl}/api/transactions?status=FAILED`, {
        headers: { 'x-merchant-id': merchantA.id }
      }), 
      200, 
      (body) => {
        for (const item of body.data) {
          if (item.status !== 'FAILED') throw new Error(`Filter mismatch: found status ${item.status}`);
        }
      }
    );

    if (sampleTxA) {
      await recordTest('Transactions', `/api/transactions/${sampleTxA.id}`, 'GET', () => 
        fetch(`${baseUrl}/api/transactions/${sampleTxA.id}`, {
          headers: { 'x-merchant-id': merchantA.id }
        }), 
        200, 
        (body) => {
          const d = body.data;
          if (!d.id || !d.customer || !Array.isArray(d.recoveryAttempts)) throw new Error('Incomplete transaction detail contract');
        }
      );
    }

    // --- 4. RECOVERIES APIS ---
    console.log('--- 4. Recoveries Endpoints ---');
    await recordTest('Recoveries', '/api/recoveries', 'GET', () => 
      fetch(`${baseUrl}/api/recoveries?page=1&limit=10`, {
        headers: { 'x-merchant-id': merchantA.id }
      }), 
      200, 
      (body) => {
        if (!Array.isArray(body.data) || body.meta?.total === undefined) throw new Error('Malformed recoveries response');
      }
    );

    // --- 5. ANALYTICS APIS ---
    console.log('--- 5. Analytics Endpoints ---');
    await recordTest('Analytics', '/api/analytics/overview', 'GET', () => 
      fetch(`${baseUrl}/api/analytics/overview`, {
        headers: { 'x-merchant-id': merchantA.id }
      }), 
      200, 
      (body) => {
        const d = body.data;
        if (!d.overview || !Array.isArray(d.failures) || !Array.isArray(d.decisions)) {
          throw new Error('Malformed analytics structure');
        }
      }
    );

    // --- 6. AUDIT LOG APIS ---
    console.log('--- 6. Audit Log Endpoints ---');
    await recordTest('Audit', '/api/audit-log', 'GET', () => 
      fetch(`${baseUrl}/api/audit-log?limit=10`, {
        headers: { 'x-merchant-id': merchantA.id }
      }), 
      200, 
      (body) => {
        if (!Array.isArray(body.data) || body.meta?.total === undefined) throw new Error('Malformed audit log response');
      }
    );

    // --- 7. MERCHANT ISOLATION SCOPING TESTS ---
    console.log('--- 7. Merchant Isolation Tests ---');
    if (sampleTxB) {
      await recordTest('Security: Isolation', `/api/transactions/${sampleTxB.id} (Cross-Merchant)`, 'GET', () => 
        fetch(`${baseUrl}/api/transactions/${sampleTxB.id}`, {
          headers: { 'x-merchant-id': merchantA.id }
        }), 
        404
      );
    }

    // --- 8. DETECTION ENGINE APIS ---
    console.log('--- 8. Detection Engine Endpoints ---');
    if (sampleFailedTxA) {
      await recordTest('Detection', `/api/detection/${sampleFailedTxA.id}`, 'GET', () => 
        fetch(`${baseUrl}/api/detection/${sampleFailedTxA.id}`), 
        200, 
        (body) => {
          if (body.data.recoveryProbability === undefined || !body.data.recommendedDecision) {
            throw new Error('Missing probability or decision');
          }
        }
      );

      await recordTest('Detection', `/api/detection/${sampleFailedTxA.id}/analyze`, 'POST', () => 
        fetch(`${baseUrl}/api/detection/${sampleFailedTxA.id}/analyze`, {
          method: 'POST'
        }), 
        201, 
        (body) => {
          if (!body.data.recommendedDecision || body.data.recoveryProbability === undefined) {
            throw new Error('Missing score or decision');
          }
        }
      );
    }

    // --- 9. DIAGNOSIS AGENT APIS ---
    console.log('--- 9. Diagnosis Agent Endpoints ---');
    if (sampleFailedTxA) {
      await recordTest('Diagnosis', `/api/diagnosis/${sampleFailedTxA.id}`, 'GET', () => 
        fetch(`${baseUrl}/api/diagnosis/${sampleFailedTxA.id}?provider=mock-llm-provider`), 
        200,
        (body) => {
          if (!body.data.diagnosisCode || !body.data.failureCategory) throw new Error('Missing diagnosis result');
        }
      );

      await recordTest('Diagnosis', `/api/diagnosis/${sampleFailedTxA.id}/analyze`, 'POST', () => 
        fetch(`${baseUrl}/api/diagnosis/${sampleFailedTxA.id}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'mock-llm-provider' })
        }), 
        201, 
        (body) => {
          if (!body.data.diagnosisCode || !body.data.recommendedNextStep) throw new Error('Missing diagnosis result');
        }
      );
    }

    // --- 10. RECOVERY DECISION APIS ---
    console.log('--- 10. Recovery Decision Endpoints ---');
    if (sampleFailedTxA) {
      await recordTest('Decision', `/api/recovery-decision/${sampleFailedTxA.id}`, 'GET', () => 
        fetch(`${baseUrl}/api/recovery-decision/${sampleFailedTxA.id}`), 
        200, 
        (body) => {
          if (!body.data.decision || !body.data.rulesApplied) throw new Error('Missing decision or rulesApplied');
        }
      );

      await recordTest('Decision', `/api/recovery-decision/${sampleFailedTxA.id}/decide`, 'POST', () => 
        fetch(`${baseUrl}/api/recovery-decision/${sampleFailedTxA.id}/decide`, {
          method: 'POST'
        }), 
        200, 
        (body) => {
          if (!body.data.decision || !body.data.rulesApplied) throw new Error('Missing decision or rulesApplied');
        }
      );
    }

    // --- 11. RECOVERY EXECUTOR APIS ---
    console.log('--- 11. Recovery Executor Endpoints ---');
    if (sampleFailedTxA) {
      await recordTest('Executor', `/api/recovery-executor/${sampleFailedTxA.id}/execute`, 'POST', () => 
        fetch(`${baseUrl}/api/recovery-executor/${sampleFailedTxA.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'simulation' })
        }), 
        200, 
        (body) => {
          if (!body.data.recoveryAttemptId || !body.data.status) throw new Error('Execution failed');
        }
      );

      await recordTest('Executor', `/api/recovery-executor/${sampleFailedTxA.id}`, 'GET', () => 
        fetch(`${baseUrl}/api/recovery-executor/${sampleFailedTxA.id}`), 
        200,
        (body) => {
          if ((!body.data.recoveryAttemptId && !body.data.id) || !body.data.status) throw new Error('Missing latest execution');
        }
      );
    }

    // --- 12. RAZORPAY WEBHOOKS & SECURITY ---
    console.log('--- 12. Razorpay Webhooks Endpoints ---');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'alok_webhook_secret_123';
    const testPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_audit_test_999',
            order_id: 'order_audit_test_999',
            amount: 249900,
            status: 'captured',
            notes: {
              transactionId: sampleFailedTxA?.id || 'tx_test',
            },
          },
        },
      },
    });

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(testPayload)
      .digest('hex');

    await recordTest('Webhooks', '/api/webhooks/razorpay (Valid HMAC)', 'POST', () => 
      fetch(`${baseUrl}/api/webhooks/razorpay`, {
        method: 'POST',
        headers: {
          'x-razorpay-signature': validSignature,
          'Content-Type': 'application/json',
        },
        body: testPayload,
      }),
      200,
      (body) => {
        if (!body.success) throw new Error('Webhook not acknowledged');
      }
    );

    await recordTest('Webhooks', '/api/webhooks/razorpay (Tampered Body)', 'POST', () => 
      fetch(`${baseUrl}/api/webhooks/razorpay`, {
        method: 'POST',
        headers: {
          'x-razorpay-signature': 'invalid_signature_hex',
          'Content-Type': 'application/json',
        },
        body: testPayload,
      }),
      400
    );

    // --- PRINT FINAL SUMMARY ---
    console.log('\n====================================================');
    console.log('📊 MASTER SYSTEM API AUDIT RESULTS');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    console.log('| Category | Method | Endpoint | Status | HTTP | Latency | Details |');
    console.log('|:---|:---:|:---|:---:|:---:|:---:|:---|');
    for (const r of results) {
      const icon = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
      if (r.status === 'PASS') passed++;
      else failed++;
      console.log(`| ${r.category} | ${r.method} | ${r.endpoint} | ${icon} | ${r.httpStatus} | ${r.durationMs}ms | ${r.details} |`);
    }

    console.log(`\nTOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
    if (failed === 0) {
      console.log('🎉 ALL APIs PASSED WITH 100% SUCCESS RATE!');
    } else {
      console.log('⚠️ SOME APIs FAILED. Review details above.');
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runMasterApiAudit().catch(console.error);
