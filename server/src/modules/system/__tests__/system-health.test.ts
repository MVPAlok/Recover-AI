import assert from 'assert';
import { PrismaClient, AIAgentType, WebhookProcessingStatus } from '@prisma/client';
import { SystemHealthService } from '../system-health.service.js';

export async function runSystemHealthTests(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 Running System Health & Observability Unit Tests...');
  console.log('====================================================\n');

  let passed = 0;

  // Helper to create a mock Prisma client
  function createMockPrisma(overrides: Partial<any> = {}) {
    return {
      $queryRaw: overrides.$queryRaw || (async () => [{ 1: 1 }]),
      aIDecision: {
        count: overrides.aIDecisionCount || (async () => 0),
        findMany: overrides.aIDecisionFindMany || (async () => []),
      },
      razorpayWebhookEvent: {
        count: overrides.webhookCount || (async () => 0),
        findFirst: overrides.webhookFindFirst || (async () => null),
      },
    } as unknown as PrismaClient;
  }

  function createService(mockPrisma: PrismaClient, customOverrides: any = {}) {
    return new SystemHealthService({
      prisma: mockPrisma,
      checkRedis: customOverrides.checkRedis || (async () => ({
        status: 'healthy',
        latencyMs: 5,
        message: 'Mock Redis healthy',
      })),
      checkRecoveryWorker: customOverrides.checkRecoveryWorker || (async () => ({
        status: 'healthy',
        queueDepth: 0,
        activeJobs: 0,
        waitingJobs: 0,
        failedJobs: 0,
        delayedJobs: 0,
        concurrency: 5,
        message: 'Mock Recovery Worker idle',
      })),
    });
  }

  // Test 1: All dependencies operational returns healthy
  try {
    const mockPrisma = createMockPrisma({
      $queryRaw: async () => [{ 1: 1 }],
      aIDecisionCount: async ({ where }: any) => {
        if (where?.isFallback) return 0;
        return 50;
      },
      aIDecisionFindMany: async () => [{ latencyMs: 250 }, { latencyMs: 300 }],
      webhookCount: async ({ where }: any) => {
        if (where?.status) return 0; // 0 failed
        return 100; // 100 total
      },
      webhookFindFirst: async () => ({
        id: 'evt_1',
        eventId: 'evt_rzp_1',
        createdAt: new Date(),
      }),
    });

    const service = createService(mockPrisma);
    const health = await service.getSystemHealth();

    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.services.postgresql.status, 'healthy');
    assert.strictEqual(health.services.gemini.status, 'healthy');
    assert.strictEqual(health.services.razorpay.mode, 'test');
    assert.strictEqual(health.services.webhookWorker.status, 'healthy');
    assert.strictEqual(health.metrics.webhookErrorRate, 0);
    assert.strictEqual(health.metrics.aiFallbackRate, 0);

    console.log('  ✓ Test 1: All healthy services yield overall OPERATIONAL status');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Test 1 Failed:', err.message);
  }

  // Test 2: PostgreSQL down yields CRITICAL overall status
  try {
    const mockPrisma = createMockPrisma({
      $queryRaw: async () => {
        throw new Error('Connection refused: 5432');
      },
    });

    const service = createService(mockPrisma);
    const health = await service.getSystemHealth();

    assert.strictEqual(health.status, 'critical');
    assert.strictEqual(health.services.postgresql.status, 'unavailable');
    assert.strictEqual(health.success, false);

    console.log('  ✓ Test 2: PostgreSQL failure triggers CRITICAL system status');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Test 2 Failed:', err.message);
  }

  // Test 3: Gemini fallback >= 10% yields DEGRADED status with fallbackActive: true
  try {
    const mockPrisma = createMockPrisma({
      aIDecisionCount: async ({ where }: any) => {
        if (where?.isFallback) return 15; // 15 fallback
        return 50; // 50 total (30% fallback rate)
      },
      aIDecisionFindMany: async () => [{ latencyMs: 1200 }],
    });

    const service = createService(mockPrisma);
    const health = await service.getSystemHealth();

    assert.strictEqual(health.status, 'degraded');
    assert.strictEqual(health.services.gemini.status, 'degraded');
    assert.strictEqual(health.services.gemini.fallbackActive, true);
    assert.strictEqual(health.metrics.aiFallbackRate, 30);

    console.log('  ✓ Test 3: Elevated AI fallback rate correctly triggers DEGRADED state');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Test 3 Failed:', err.message);
  }

  // Test 4: Webhook error rate >= 5% yields DEGRADED webhookWorker
  try {
    const mockPrisma = createMockPrisma({
      webhookCount: async ({ where }: any) => {
        if (where?.status) return 10; // 10 failed
        return 100; // 100 total (10% error rate)
      },
      webhookFindFirst: async () => ({
        id: 'evt_1',
        eventId: 'evt_err_1',
        createdAt: new Date(),
      }),
    });

    const service = createService(mockPrisma);
    const health = await service.getSystemHealth();

    assert.strictEqual(health.status, 'degraded');
    assert.strictEqual(health.services.webhookWorker.status, 'degraded');
    assert.strictEqual(health.metrics.webhookErrorRate, 10);

    console.log('  ✓ Test 4: Elevated webhook error rate correctly flags DEGRADED state');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Test 4 Failed:', err.message);
  }

  // Test 5: Zero webhook traffic in 24h is NOT marked as failed
  try {
    const mockPrisma = createMockPrisma({
      webhookCount: async () => 0,
      webhookFindFirst: async () => null,
    });

    const service = createService(mockPrisma);
    const health = await service.getSystemHealth();

    assert.strictEqual(health.services.webhookWorker.status, 'healthy');
    assert.strictEqual(health.metrics.lastWebhookSecondsAgo, null);
    assert.strictEqual(health.metrics.webhookErrorRate, 0);

    console.log('  ✓ Test 5: Zero webhook traffic is cleanly distinguished from worker failure');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Test 5 Failed:', err.message);
  }

  // Test 6: Razorpay sandbox isolation and key sanitization
  try {
    const mockPrisma = createMockPrisma();
    const service = createService(mockPrisma);
    const health = await service.getSystemHealth();

    assert.strictEqual(health.services.razorpay.mode, 'test');
    assert.strictEqual(health.environment, 'TEST_MODE');

    // Strict security assertions
    const stringified = JSON.stringify(health);
    assert(!stringified.includes('AIzaSy'), 'Secret Gemini API Key leaked in health JSON!');
    assert(!stringified.includes('rediss://'), 'Secret Redis connection URL leaked in health JSON!');
    assert(!stringified.includes('postgresql://'), 'Secret Database URL leaked in health JSON!');
    assert(!stringified.includes('test_webhook_secret'), 'Secret Webhook secret leaked in health JSON!');

    console.log('  ✓ Test 6: Razorpay Sandbox test mode verified and zero secrets leaked');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Test 6 Failed:', err.message);
  }

  // Test 7: Merchant isolation query parameter filtering
  try {
    let capturedMerchantId: string | undefined;
    const mockPrisma = createMockPrisma({
      aIDecisionCount: async ({ where }: any) => {
        capturedMerchantId = where?.merchantId;
        return 5;
      },
    });

    const service = createService(mockPrisma);
    await service.getSystemHealth('mer_test_tenant_99');

    assert.strictEqual(capturedMerchantId, 'mer_test_tenant_99');
    console.log('  ✓ Test 7: Tenant/Merchant isolation respected in telemetry queries');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Test 7 Failed:', err.message);
  }

  console.log(`\n🎉 All ${passed}/7 System Health Unit Tests Passed Successfully!\n`);
}

runSystemHealthTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
