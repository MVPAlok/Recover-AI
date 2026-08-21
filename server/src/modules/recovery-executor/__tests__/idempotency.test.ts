import { IdempotencyService } from '../idempotency.service.js';
import { Prisma, RecoveryAttempt } from '@prisma/client';

export async function runIdempotencyTests(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 Running Recovery Executor Idempotency Tests...');
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
      throw new Error(`Idempotency test failed: ${testName}`);
    }
  }

  // 1. Fresh decision without attempts is not duplicate
  {
    const existingAttempts: RecoveryAttempt[] = [];
    const check = IdempotencyService.checkExistingAttempt('dec_fresh_100', existingAttempts);

    assert(
      check.isDuplicate === false && check.existingResult === undefined,
      'Fresh decision with empty attempts returns isDuplicate: false'
    );
  }

  // 2. Decision already executed to SUCCESS is recognized as idempotent duplicate
  {
    const mockAttempt: RecoveryAttempt = {
      id: 'att_idemp_1',
      merchantId: 'mcht_1',
      transactionId: 'tx_1',
      aiDecisionId: 'dec_idemp_1',
      attemptNumber: 1,
      actionType: 'RETRY',
      status: 'SUCCESS',
      reason: 'Payment recovered',
      amountRecovered: new Prisma.Decimal(2500),
      scheduledAt: null,
      executedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const check = IdempotencyService.checkExistingAttempt('dec_idemp_1', [mockAttempt]);

    assert(
      check.isDuplicate === true &&
        check.existingResult?.isIdempotent === true &&
        check.existingResult?.status === 'SUCCESS' &&
        check.existingResult?.outcomeCode === 'PAYMENT_RECOVERED',
      'Existing SUCCESS attempt returns cached idempotent result'
    );
  }

  // 3. Decision already in PENDING WAIT status is recognized as idempotent duplicate
  {
    const futureDate = new Date(Date.now() + 30 * 60 * 1000);
    const mockAttempt: RecoveryAttempt = {
      id: 'att_idemp_2',
      merchantId: 'mcht_1',
      transactionId: 'tx_2',
      aiDecisionId: 'dec_idemp_2',
      attemptNumber: 1,
      actionType: 'WAIT',
      status: 'PENDING',
      reason: 'Wait scheduled',
      amountRecovered: new Prisma.Decimal(0),
      scheduledAt: futureDate,
      executedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const check = IdempotencyService.checkExistingAttempt('dec_idemp_2', [mockAttempt]);

    assert(
      check.isDuplicate === true &&
        check.existingResult?.status === 'PENDING' &&
        check.existingResult?.outcomeCode === 'WAIT_SCHEDULED',
      'Existing PENDING WAIT attempt returns cached scheduled result'
    );
  }

  // 4. Multiple prior attempts match only the specific decisionId
  {
    const attempt1: RecoveryAttempt = {
      id: 'att_1',
      merchantId: 'mcht_1',
      transactionId: 'tx_3',
      aiDecisionId: 'dec_old_1',
      attemptNumber: 1,
      actionType: 'RETRY',
      status: 'FAILED',
      reason: 'Failed attempt 1',
      amountRecovered: new Prisma.Decimal(0),
      scheduledAt: null,
      executedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const attempt2: RecoveryAttempt = {
      id: 'att_2',
      merchantId: 'mcht_1',
      transactionId: 'tx_3',
      aiDecisionId: 'dec_old_2',
      attemptNumber: 2,
      actionType: 'REMIND',
      status: 'SUCCESS',
      reason: 'Reminder sent',
      amountRecovered: new Prisma.Decimal(0),
      scheduledAt: null,
      executedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const checkNew = IdempotencyService.checkExistingAttempt('dec_new_3', [attempt1, attempt2]);
    const checkOld = IdempotencyService.checkExistingAttempt('dec_old_2', [attempt1, attempt2]);

    assert(
      checkNew.isDuplicate === false &&
        checkOld.isDuplicate === true &&
        checkOld.existingResult?.attemptNumber === 2,
      'Idempotency distinguishes between new decision IDs and historical attempts'
    );
  }

  console.log(`\n🎉 All ${passed}/${total} Idempotency Tests Passed Successfully!\n`);
}

// Direct execution
if (process.argv[1]?.includes('idempotency.test')) {
  runIdempotencyTests().catch((err) => {
    console.error('Idempotency tests failed:', err);
    process.exit(1);
  });
}
