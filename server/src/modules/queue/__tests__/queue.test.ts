import { getRecoveryQueue, startRecoveryWorker, RECOVERY_QUEUE_NAME } from '../recovery.queue.js';

async function runTests() {
  console.log('\n====================================================');
  console.log('🧪 Running Phase 8: Redis Queues & BullMQ Unit Tests...');
  console.log('====================================================\n');

  try {
    if (RECOVERY_QUEUE_NAME !== 'recovery-execution-queue') {
      throw new Error(`Expected RECOVERY_QUEUE_NAME to be 'recovery-execution-queue', got '${RECOVERY_QUEUE_NAME}'`);
    }
    console.log("  ✓ Test 1: Queue name 'recovery-execution-queue' verified.");

    const queue = getRecoveryQueue();
    if (!queue || queue.name !== 'recovery-execution-queue') {
      throw new Error('Queue instantiation failed');
    }
    console.log('  ✓ Test 2: getRecoveryQueue returns active BullMQ Queue instance.');

    const worker = startRecoveryWorker();
    if (!worker || worker.name !== 'recovery-execution-queue') {
      throw new Error('Worker initialization failed');
    }
    if (worker.opts.concurrency !== 5) {
      throw new Error(`Expected worker concurrency 5, got ${worker.opts.concurrency}`);
    }
    console.log('  ✓ Test 3: startRecoveryWorker initializes Worker with concurrency = 5.');

    console.log('\n🎉 All 3/3 Redis Queue & BullMQ Tests Passed Successfully!\n');
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ Test failed: ${err.message}\n`);
    process.exit(1);
  }
}

runTests();
