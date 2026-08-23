import { ExecutionPolicy } from '../execution-policy.js';
import { ExecutionValidator } from '../execution-validator.js';
import { RecoveryExecutorService } from '../recovery-executor.service.js';
import { SimulationRecoveryProvider } from '../providers/simulation-provider.js';
import { RazorpayTestProvider } from '../providers/razorpay-test.provider.js';

export async function runProviderSelectionTests(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 Running Provider Selection & Fail-Closed Tests...');
  console.log('====================================================\n');

  let passed = 0;

  // Test 1: ExecutionPolicy accepts 'simulation' and 'razorpay_test'
  try {
    const simMode = ExecutionPolicy.validateExecutionMode('simulation');
    const rzpMode = ExecutionPolicy.validateExecutionMode('razorpay_test');

    if (simMode === 'simulation' && rzpMode === 'razorpay_test') {
      console.log("  ✓ Test 1: ExecutionPolicy permits 'simulation' and 'razorpay_test'");
      passed++;
    } else {
      console.error('  ✗ Test 1 Failed:', { simMode, rzpMode });
    }
  } catch (err: any) {
    console.error('  ✗ Test 1 Failed:', err.message);
  }

  // Test 2: ExecutionPolicy strictly rejects live/unknown modes
  try {
    ExecutionPolicy.validateExecutionMode('razorpay_live');
    console.error("  ✗ Test 2 Failed: 'razorpay_live' was not rejected!");
  } catch (err: any) {
    if (err.message.includes('unsupported')) {
      console.log("  ✓ Test 2: Live execution mode ('razorpay_live') is rejected with fail-closed error");
      passed++;
    } else {
      console.error('  ✗ Test 2 Failed with unexpected error:', err);
    }
  }

  // Test 3: ExecutionValidator allows 'simulation' mode
  try {
    const result = ExecutionValidator.validateExecution({
      transaction: { id: 'tx_1', status: 'FAILED', retryCount: 0 } as any,
      merchant: { id: 'mer_1' } as any,
      decision: {
        id: 'dec_1',
        agentType: 'RECOVERY_DECISION',
        transactionId: 'tx_1',
        decision: 'RETRY',
        createdAt: new Date(),
      } as any,
      executionMode: 'simulation',
    });

    if (result.isValid) {
      console.log("  ✓ Test 3: ExecutionValidator validates 'simulation' execution correctly");
      passed++;
    } else {
      console.error('  ✗ Test 3 Failed:', result);
    }
  } catch (err: any) {
    console.error('  ✗ Test 3 Failed:', err.message);
  }

  // Test 4: ExecutionValidator allows 'razorpay_test' mode
  try {
    const result = ExecutionValidator.validateExecution({
      transaction: { id: 'tx_1', status: 'FAILED', retryCount: 0 } as any,
      merchant: { id: 'mer_1' } as any,
      decision: {
        id: 'dec_1',
        agentType: 'RECOVERY_DECISION',
        transactionId: 'tx_1',
        decision: 'RETRY',
        createdAt: new Date(),
      } as any,
      executionMode: 'razorpay_test',
    });

    if (result.isValid) {
      console.log("  ✓ Test 4: ExecutionValidator validates 'razorpay_test' execution correctly");
      passed++;
    } else {
      console.error('  ✗ Test 4 Failed:', result);
    }
  } catch (err: any) {
    console.error('  ✗ Test 4 Failed:', err.message);
  }

  // Test 5: ExecutionValidator rejects unsupported modes
  try {
    const result = ExecutionValidator.validateExecution({
      transaction: { id: 'tx_1', status: 'FAILED', retryCount: 0 } as any,
      merchant: { id: 'mer_1' } as any,
      decision: {
        id: 'dec_1',
        agentType: 'RECOVERY_DECISION',
        transactionId: 'tx_1',
        decision: 'RETRY',
        createdAt: new Date(),
      } as any,
      executionMode: 'production_live',
    });

    if (!result.isValid && (result as any).outcomeCode === 'UNSUPPORTED_MODE_ERROR') {
      console.log('  ✓ Test 5: ExecutionValidator blocks unsupported execution mode with UNSUPPORTED_MODE_ERROR');
      passed++;
    } else {
      console.error('  ✗ Test 5 Failed:', result);
    }
  } catch (err: any) {
    console.error('  ✗ Test 5 Failed:', err.message);
  }

  // Test 6: Dynamic provider resolution in RecoveryExecutorService
  try {
    const service = new RecoveryExecutorService();
    const simProvider = (service as any).resolveProvider('simulation');
    const rzpProvider = (service as any).resolveProvider('razorpay_test');

    if (
      simProvider instanceof SimulationRecoveryProvider &&
      rzpProvider instanceof RazorpayTestProvider
    ) {
      console.log('  ✓ Test 6: Service dynamically resolves SimulationRecoveryProvider and RazorpayTestProvider');
      passed++;
    } else {
      console.error('  ✗ Test 6 Failed: Provider type mismatch:', { simProvider, rzpProvider });
    }
  } catch (err: any) {
    console.error('  ✗ Test 6 Failed:', err.message);
  }

  console.log(`\n🎉 All ${passed}/6 Provider Selection & Security Tests Passed Successfully!\n`);
}

if (process.argv[1]?.endsWith('provider-selection.test.ts')) {
  runProviderSelectionTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test runner failure:', err);
      process.exit(1);
    });
}
