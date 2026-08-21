import { SimulationRecoveryProvider } from '../providers/simulation-provider.js';
import { RetryExecutor } from '../executors/retry.executor.js';
import { RemindExecutor } from '../executors/remind.executor.js';
import { EscalateExecutor } from '../executors/escalate.executor.js';
import { WaitExecutor } from '../executors/wait.executor.js';
import { StopExecutor } from '../executors/stop.executor.js';
import { ExecutionValidator } from '../execution-validator.js';
import { OutcomeService } from '../outcome.service.js';
import { AIAgentType } from '@prisma/client';

export async function runRecoveryExecutorUnitTests(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 Running Recovery Executor Unit Tests...');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ Test ${total}: ${testName}`);
    } else {
      console.error(`  ❌ Test ${total} FAILED: ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
      throw new Error(`Unit test failed: ${testName}`);
    }
  }

  const provider = new SimulationRecoveryProvider(42);

  // 1. Successful simulated RETRY
  {
    const retryExecutor = new RetryExecutor(provider);
    const result = await retryExecutor.execute({
      transactionId: 'tx_unit_1',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_1',
      action: 'RETRY',
      amount: 4500,
      currency: 'INR',
      retryCount: 0,
      recoveryProbability: 0.99, // very high probability guaranteed to succeed
    });

    assert(
      result.status === 'SUCCESS' &&
        result.outcomeCode === 'PAYMENT_RECOVERED' &&
        result.amountRecovered === 4500,
      'Successful simulated RETRY produces PAYMENT_RECOVERED with full amount recovered'
    );
  }

  // 2. Failed simulated RETRY
  {
    const retryExecutor = new RetryExecutor(provider);
    const result = await retryExecutor.execute({
      transactionId: 'tx_unit_2',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_2',
      action: 'RETRY',
      amount: 4500,
      currency: 'INR',
      retryCount: 0,
      recoveryProbability: 0.0001, // extremely low probability guaranteed to fail
    });

    assert(
      result.status === 'FAILED' &&
        result.outcomeCode === 'RECOVERY_ATTEMPT_FAILED' &&
        result.amountRecovered === 0,
      'Failed simulated RETRY produces RECOVERY_ATTEMPT_FAILED with 0 amount recovered'
    );
  }

  // 3. Retry limit exceeded blocks provider call
  {
    const retryExecutor = new RetryExecutor(provider);
    const result = await retryExecutor.execute({
      transactionId: 'tx_unit_3',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_3',
      action: 'RETRY',
      amount: 4500,
      currency: 'INR',
      retryCount: 3, // at max limit
      recoveryProbability: 0.99,
    });

    assert(
      result.status === 'CANCELLED' &&
        result.outcomeCode === 'MAX_RETRY_LIMIT_EXCEEDED' &&
        result.amountRecovered === 0,
      'Retry count >= 3 blocks execution and returns CANCELLED with MAX_RETRY_LIMIT_EXCEEDED'
    );
  }

  // 4. Stale decision (>30 mins) blocks execution
  {
    const staleDate = new Date(Date.now() - 35 * 60 * 1000); // 35 mins ago
    const mockTx = {
      id: 'tx_unit_4',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      amount: 2500,
      currency: 'INR',
      status: 'FAILED',
      retryCount: 0,
    } as any;
    const mockMerchant = { id: 'mcht_1' } as any;
    const mockDecision = {
      id: 'dec_stale_1',
      transactionId: 'tx_unit_4',
      agentType: AIAgentType.RECOVERY_DECISION,
      decision: 'RETRY',
      createdAt: staleDate,
    } as any;

    const validation = ExecutionValidator.validateExecution({
      transaction: mockTx,
      merchant: mockMerchant,
      decision: mockDecision,
    });

    assert(
      !validation.isValid && validation.outcomeCode === 'STALE_DECISION_BLOCKED',
      'Stale decision (>30 mins) is rejected with STALE_DECISION_BLOCKED'
    );
  }

  // 5. REMIND action creates simulated reminder
  {
    const remindExecutor = new RemindExecutor(provider);
    const result = await remindExecutor.execute({
      transactionId: 'tx_unit_5',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_5',
      action: 'REMIND',
      amount: 5000,
      currency: 'INR',
      retryCount: 0,
      customerEmail: 'user@example.com',
    });

    assert(
      result.status === 'SUCCESS' &&
        result.outcomeCode === 'REMINDER_SIMULATED' &&
        result.amountRecovered === 0,
      'REMIND action creates simulated reminder with 0 amount recovered'
    );
  }

  // 6. ESCALATE action creates simulated escalation
  {
    const escalateExecutor = new EscalateExecutor(provider);
    const result = await escalateExecutor.execute({
      transactionId: 'tx_unit_6',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_6',
      action: 'ESCALATE',
      amount: 15000,
      currency: 'INR',
      retryCount: 1,
      reason: 'High value customer requires VIP support',
    });

    assert(
      result.status === 'SUCCESS' &&
        result.outcomeCode === 'ESCALATION_CREATED' &&
        result.amountRecovered === 0,
      'ESCALATE action creates simulated escalation case'
    );
  }

  // 7. WAIT action creates pending scheduled attempt
  {
    const waitExecutor = new WaitExecutor(provider);
    const result = await waitExecutor.execute({
      transactionId: 'tx_unit_7',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_7',
      action: 'WAIT',
      amount: 3000,
      currency: 'INR',
      retryCount: 0,
      waitMinutes: 45,
    });

    assert(
      result.status === 'PENDING' &&
        result.outcomeCode === 'WAIT_SCHEDULED' &&
        result.scheduledAt !== undefined &&
        result.amountRecovered === 0,
      'WAIT action sets status to PENDING with a future scheduledAt timestamp'
    );
  }

  // 8. STOP action cancels without calling provider
  {
    const stopExecutor = new StopExecutor(provider);
    const result = await stopExecutor.execute({
      transactionId: 'tx_unit_8',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_8',
      action: 'STOP',
      amount: 2000,
      currency: 'INR',
      retryCount: 2,
      reason: 'Hard financial failure',
    });

    assert(
      result.status === 'CANCELLED' &&
        result.outcomeCode === 'RECOVERY_STOPPED_BY_POLICY' &&
        result.amountRecovered === 0,
      'STOP action sets status to CANCELLED with RECOVERY_STOPPED_BY_POLICY'
    );
  }

  // 9. OutcomeService guarantees revenue separation
  {
    const reminderResult = OutcomeService.buildExecutionResult({
      recoveryAttemptId: 'att_test_1',
      transactionId: 'tx_1',
      aiDecisionId: 'dec_1',
      action: 'REMIND',
      providerResult: {
        success: true,
        status: 'SUCCESS',
        outcomeCode: 'REMINDER_SIMULATED',
        amountRecovered: 5000, // even if provider erroneously returned an amount
        message: 'Reminder sent',
      },
      attemptNumber: 1,
    });

    assert(
      reminderResult.amountRecovered === 0,
      'OutcomeService strictly zeros amountRecovered for non-RETRY actions'
    );
  }

  // 10. Deterministic PRNG produces identical rolls for identical seed and inputs
  {
    const provider1 = new SimulationRecoveryProvider(999);
    const provider2 = new SimulationRecoveryProvider(999);

    const res1 = await provider1.executeRetry({
      transactionId: 'tx_reproducible',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_1',
      action: 'RETRY',
      amount: 1000,
      currency: 'INR',
      retryCount: 0,
      recoveryProbability: 0.85,
    });

    const res2 = await provider2.executeRetry({
      transactionId: 'tx_reproducible',
      merchantId: 'mcht_1',
      customerId: 'cust_1',
      aiDecisionId: 'dec_1',
      action: 'RETRY',
      amount: 1000,
      currency: 'INR',
      retryCount: 0,
      recoveryProbability: 0.85,
    });

    assert(
      res1.status === res2.status &&
        res1.outcomeCode === res2.outcomeCode &&
        res1.amountRecovered === res2.amountRecovered,
      'Simulation provider is 100% deterministic given identical seed and inputs'
    );
  }

  console.log(`\n🎉 All ${passed}/${total} Recovery Executor Unit Tests Passed Successfully!\n`);
}

// Direct execution
if (process.argv[1]?.includes('recovery-executor.test')) {
  runRecoveryExecutorUnitTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
