import { ExecutionValidator } from '../execution-validator.js';
import { ExecutionPolicy } from '../execution-policy.js';
import { AIAgentType } from '@prisma/client';

export async function runSafetyTests(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 Running Recovery Executor Safety & Security Tests...');
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
      throw new Error(`Safety test failed: ${testName}`);
    }
  }

  const validMerchant = { id: 'mcht_safe_1', name: 'Safe Store' } as any;
  const validTx = {
    id: 'tx_safe_1',
    merchantId: 'mcht_safe_1',
    customerId: 'cust_safe_1',
    status: 'FAILED',
    retryCount: 0,
    amount: 1000,
    currency: 'INR',
  } as any;
  const validDecision = {
    id: 'dec_safe_1',
    transactionId: 'tx_safe_1',
    agentType: AIAgentType.RECOVERY_DECISION,
    decision: 'RETRY',
    createdAt: new Date(),
  } as any;

  // 1. Unsupported execution mode fails closed
  {
    const val = ExecutionValidator.validateExecution({
      transaction: validTx,
      merchant: validMerchant,
      decision: validDecision,
      executionMode: 'razorpay_live',
    });

    assert(
      !val.isValid && val.outcomeCode === 'UNSUPPORTED_MODE_ERROR',
      'Mode "razorpay_live" fails closed with UNSUPPORTED_MODE_ERROR'
    );
  }

  // 2. ExecutionPolicy throws on invalid mode
  {
    let caught = false;
    try {
      ExecutionPolicy.validateExecutionMode('production_payment');
    } catch {
      caught = true;
    }
    assert(caught, 'ExecutionPolicy.validateExecutionMode throws on non-simulation mode');
  }

  // 3. Non-FAILED transaction status rejected
  {
    const successTx = { ...validTx, status: 'SUCCESS' };
    const val = ExecutionValidator.validateExecution({
      transaction: successTx,
      merchant: validMerchant,
      decision: validDecision,
    });

    assert(
      !val.isValid && val.reason.includes('Only \'FAILED\' transactions'),
      'Transaction with status SUCCESS is rejected from recovery execution'
    );
  }

  // 4. Non-RECOVERY_DECISION agent type rejected
  {
    const diagnosisDecision = {
      ...validDecision,
      agentType: AIAgentType.DIAGNOSIS,
    };
    const val = ExecutionValidator.validateExecution({
      transaction: validTx,
      merchant: validMerchant,
      decision: diagnosisDecision,
    });

    assert(
      !val.isValid && val.reason.includes('expected \'RECOVERY_DECISION\''),
      'Decision with agentType DIAGNOSIS is rejected from recovery executor'
    );
  }

  // 5. Decision mismatch with transaction rejected
  {
    const mismatchDecision = {
      ...validDecision,
      transactionId: 'tx_different_999',
    };
    const val = ExecutionValidator.validateExecution({
      transaction: validTx,
      merchant: validMerchant,
      decision: mismatchDecision,
    });

    assert(
      !val.isValid && val.reason.includes('does not belong to transaction'),
      'Decision with mismatched transactionId is rejected'
    );
  }

  // 6. Max retry limit (3) strictly enforced
  {
    const maxRetryTx = { ...validTx, retryCount: 3 };
    const val = ExecutionValidator.validateExecution({
      transaction: maxRetryTx,
      merchant: validMerchant,
      decision: validDecision,
    });

    assert(
      !val.isValid && val.outcomeCode === 'MAX_RETRY_LIMIT_EXCEEDED',
      'Transaction with retryCount=3 is blocked from RETRY execution'
    );
  }

  // 7. Decision age > 30 minutes rejected
  {
    const oldDecision = {
      ...validDecision,
      createdAt: new Date(Date.now() - 40 * 60 * 1000), // 40 mins old
    };
    const val = ExecutionValidator.validateExecution({
      transaction: validTx,
      merchant: validMerchant,
      decision: oldDecision,
    });

    assert(
      !val.isValid && val.outcomeCode === 'STALE_DECISION_BLOCKED',
      'Decision older than 30 minutes is rejected as stale'
    );
  }

  console.log(`\n🎉 All ${passed}/${total} Safety & Security Tests Passed Successfully!\n`);
}

// Direct execution
if (process.argv[1]?.includes('safety.test')) {
  runSafetyTests().catch((err) => {
    console.error('Safety tests failed:', err);
    process.exit(1);
  });
}
