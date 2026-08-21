import { RecoveryExecutorService } from './recovery-executor.service.js';
import { SimulationRecoveryProvider } from './providers/simulation-provider.js';
import { PolicyEngine } from '../recovery-decision/policy-engine.js';
import { DecisionInput } from '../recovery-decision/decision.types.js';
import { prisma } from '../../config/prisma.js';
import { RetryExecutor } from './executors/retry.executor.js';
import { RemindExecutor } from './executors/remind.executor.js';
import { EscalateExecutor } from './executors/escalate.executor.js';
import { WaitExecutor } from './executors/wait.executor.js';
import { StopExecutor } from './executors/stop.executor.js';

interface ScenarioE2ECase {
  id: string;
  name: string;
  decisionInput: DecisionInput;
  expectedAction: string;
  expectedStatus: string;
}

const E2E_SCENARIOS: ScenarioE2ECase[] = [
  {
    id: 'SCENARIO_A',
    name: 'Scenario A: Strong Customer + Bank Timeout (0 Retries)',
    decisionInput: {
      transaction: {
        id: 'e2e_tx_a',
        merchantId: 'mcht_e2e',
        customerId: 'cust_e2e_a',
        amount: 2499,
        currency: 'INR',
        paymentMethod: 'UPI',
        failureCode: 'BANK_TIMEOUT',
        failureReason: 'Bank gateway timed out during payment authorization',
        retryCount: 0,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 5,
        successfulTransactions: 5,
        failedTransactions: 0,
        successRate: 1.0,
        failureRate: 0.0,
        consecutiveFailures: 0,
        lifetimeSpend: 12495,
        averageTransactionAmount: 2499,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.95,
        riskLevel: 'LOW',
        recoverable: true,
        confidenceScore: 0.92,
      },
      diagnosis: {
        diagnosisCode: 'TEMPORARY_BANK_FAILURE',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        severity: 'LOW',
        isLikelyTemporary: true,
        confidence: 0.95,
        recommendedNextStep: 'EVALUATE_RETRY',
      },
    },
    expectedAction: 'RETRY',
    expectedStatus: 'SUCCESS', // with 0.95 probability, simulation roll succeeds
  },
  {
    id: 'SCENARIO_B',
    name: 'Scenario B: Insufficient Funds + 2 Retries',
    decisionInput: {
      transaction: {
        id: 'e2e_tx_b',
        merchantId: 'mcht_e2e',
        customerId: 'cust_e2e_b',
        amount: 2499,
        currency: 'INR',
        paymentMethod: 'DEBIT_CARD',
        failureCode: 'INSUFFICIENT_FUNDS',
        failureReason: 'Account or credit card limit has insufficient funds',
        retryCount: 2,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 2,
        successfulTransactions: 0,
        failedTransactions: 2,
        successRate: 0.0,
        failureRate: 1.0,
        consecutiveFailures: 2,
        lifetimeSpend: 0,
        averageTransactionAmount: 0,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.02,
        riskLevel: 'HIGH',
        recoverable: false,
        confidenceScore: 0.95,
      },
      diagnosis: {
        diagnosisCode: 'INSUFFICIENT_FUNDS',
        failureCategory: 'FINANCIAL_HARD',
        severity: 'HIGH',
        isLikelyTemporary: false,
        confidence: 0.98,
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      },
    },
    expectedAction: 'STOP',
    expectedStatus: 'CANCELLED',
  },
  {
    id: 'SCENARIO_C',
    name: 'Scenario C: Customer Authentication Failure / Incorrect OTP',
    decisionInput: {
      transaction: {
        id: 'e2e_tx_c',
        merchantId: 'mcht_e2e',
        customerId: 'cust_e2e_c',
        amount: 4999,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'AUTHENTICATION_FAILURE',
        failureReason: 'Customer entered invalid 3D Secure OTP or PIN',
        retryCount: 0,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 8,
        successfulTransactions: 7,
        failedTransactions: 1,
        successRate: 0.875,
        failureRate: 0.125,
        consecutiveFailures: 1,
        lifetimeSpend: 34993,
        averageTransactionAmount: 4999,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.78,
        riskLevel: 'LOW',
        recoverable: true,
        confidenceScore: 0.88,
      },
      diagnosis: {
        diagnosisCode: 'CUSTOMER_AUTHENTICATION_FAILURE',
        failureCategory: 'CUSTOMER_AUTHENTICATION',
        severity: 'MEDIUM',
        isLikelyTemporary: false,
        confidence: 0.9,
        recommendedNextStep: 'EVALUATE_REMINDER',
      },
    },
    expectedAction: 'REMIND',
    expectedStatus: 'SUCCESS',
  },
  {
    id: 'SCENARIO_D',
    name: 'Scenario D: Transient Gateway Timeout',
    decisionInput: {
      transaction: {
        id: 'e2e_tx_d',
        merchantId: 'mcht_e2e',
        customerId: 'cust_e2e_d',
        amount: 1499,
        currency: 'INR',
        paymentMethod: 'NETBANKING',
        failureCode: 'GATEWAY_TIMEOUT',
        failureReason: 'Payment gateway timed out during processing',
        retryCount: 0,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 3,
        successfulTransactions: 3,
        failedTransactions: 0,
        successRate: 1.0,
        failureRate: 0.0,
        consecutiveFailures: 0,
        lifetimeSpend: 4497,
        averageTransactionAmount: 1499,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.91,
        riskLevel: 'LOW',
        recoverable: true,
        confidenceScore: 0.9,
      },
      diagnosis: {
        diagnosisCode: 'TEMPORARY_GATEWAY_FAILURE',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        severity: 'LOW',
        isLikelyTemporary: true,
        confidence: 0.92,
        recommendedNextStep: 'EVALUATE_RETRY',
      },
    },
    expectedAction: 'RETRY',
    expectedStatus: 'SUCCESS',
  },
  {
    id: 'SCENARIO_E',
    name: 'Scenario E: Retry Limit Exceeded (3 Prior Retries)',
    decisionInput: {
      transaction: {
        id: 'e2e_tx_e',
        merchantId: 'mcht_e2e',
        customerId: 'cust_e2e_e',
        amount: 12000,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'CARD_DECLINED',
        failureReason: 'Card issuer declined authorization',
        retryCount: 3,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 6,
        successfulTransactions: 4,
        failedTransactions: 2,
        successRate: 0.67,
        failureRate: 0.33,
        consecutiveFailures: 2,
        lifetimeSpend: 48000,
        averageTransactionAmount: 8000,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.4,
        riskLevel: 'HIGH',
        recoverable: false,
        confidenceScore: 0.85,
      },
      diagnosis: {
        diagnosisCode: 'CARD_DECLINED',
        failureCategory: 'FINANCIAL_HARD',
        severity: 'HIGH',
        isLikelyTemporary: false,
        confidence: 0.88,
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      },
    },
    expectedAction: 'STOP',
    expectedStatus: 'CANCELLED',
  },
  {
    id: 'SCENARIO_F',
    name: 'Scenario F: High Value Anomaly / Unknown Payment Failure',
    decisionInput: {
      transaction: {
        id: 'e2e_tx_f',
        merchantId: 'mcht_e2e',
        customerId: 'cust_e2e_f',
        amount: 25000,
        currency: 'INR',
        paymentMethod: 'NETBANKING',
        failureCode: 'UNKNOWN_ERROR',
        failureReason: 'Unrecognized payment processor exception',
        retryCount: 0,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 12,
        successfulTransactions: 11,
        failedTransactions: 1,
        successRate: 0.92,
        failureRate: 0.08,
        consecutiveFailures: 1,
        lifetimeSpend: 150000,
        averageTransactionAmount: 12500,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.45,
        riskLevel: 'MEDIUM',
        recoverable: true,
        confidenceScore: 0.50,
      },
      diagnosis: {
        diagnosisCode: 'UNKNOWN_PAYMENT_FAILURE',
        failureCategory: 'UNKNOWN',
        severity: 'HIGH',
        isLikelyTemporary: false,
        confidence: 0.40,
        recommendedNextStep: 'EVALUATE_ESCALATION',
      },
    },
    expectedAction: 'ESCALATE',
    expectedStatus: 'SUCCESS',
  },
  {
    id: 'SCENARIO_G',
    name: 'Scenario G: Conflicting Signals / Observation Window',
    decisionInput: {
      transaction: {
        id: 'e2e_tx_g',
        merchantId: 'mcht_e2e',
        customerId: 'cust_e2e_g',
        amount: 3499,
        currency: 'INR',
        paymentMethod: 'UPI',
        failureCode: 'TRANSIENT_SYSTEM_ERROR',
        failureReason: 'Intermittent system communication glitch',
        retryCount: 0,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 6,
        successfulTransactions: 6,
        failedTransactions: 0,
        successRate: 1.0,
        failureRate: 0.0,
        consecutiveFailures: 0,
        lifetimeSpend: 18000,
        averageTransactionAmount: 3000,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.60,
        riskLevel: 'MEDIUM',
        recoverable: false,
        confidenceScore: 0.75,
      },
      diagnosis: {
        diagnosisCode: 'TEMPORARY_BANK_FAILURE',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        severity: 'LOW',
        isLikelyTemporary: true,
        confidence: 0.85,
        recommendedNextStep: 'EVALUATE_RETRY',
      },
    },
    expectedAction: 'WAIT',
    expectedStatus: 'PENDING',
  },
];

export async function runEndToEndSimulationEvaluation(): Promise<void> {
  console.log('================================================================');
  console.log('🚀 Phase 6: Recovery Executor End-to-End Simulation Evaluation');
  console.log('================================================================\n');

  const provider = new SimulationRecoveryProvider(42);
  const retryExec = new RetryExecutor(provider);
  const remindExec = new RemindExecutor(provider);
  const escalateExec = new EscalateExecutor(provider);
  const waitExec = new WaitExecutor(provider);
  const stopExec = new StopExecutor(provider);

  let passed = 0;

  for (const sc of E2E_SCENARIOS) {
    // 1. Phase 5 Decision
    const decision = PolicyEngine.evaluate(sc.decisionInput);
    const action = decision.decision;

    // 2. Phase 6 Simulation Execution
    let execResult: any;
    const baseInput = {
      transactionId: sc.decisionInput.transaction.id,
      merchantId: sc.decisionInput.transaction.merchantId,
      customerId: sc.decisionInput.transaction.customerId,
      aiDecisionId: 'eval_dec_' + sc.id,
      amount: sc.decisionInput.transaction.amount,
      currency: sc.decisionInput.transaction.currency,
      retryCount: sc.decisionInput.transaction.retryCount,
    };

    switch (action) {
      case 'RETRY':
        execResult = await retryExec.execute({
          ...baseInput,
          action: 'RETRY',
          recoveryProbability: decision.detectionProbability,
        });
        break;
      case 'REMIND':
        execResult = await remindExec.execute({
          ...baseInput,
          action: 'REMIND',
        });
        break;
      case 'ESCALATE':
        execResult = await escalateExec.execute({
          ...baseInput,
          action: 'ESCALATE',
        });
        break;
      case 'WAIT':
        execResult = await waitExec.execute({
          ...baseInput,
          action: 'WAIT',
        });
        break;
      case 'STOP':
        execResult = await stopExec.execute({
          ...baseInput,
          action: 'STOP',
        });
        break;
    }

    const actionMatches = action === sc.expectedAction;
    const statusMatches = execResult.status === sc.expectedStatus;
    const isPass = actionMatches && statusMatches;

    if (isPass) passed++;

    console.log(`📋 Scenario: ${sc.name}`);
    console.log(`   Phase 5 Decision: ${action} (Expected: ${sc.expectedAction})`);
    console.log(`   Phase 6 Outcome:  ${execResult.status} [${execResult.outcomeCode}]`);
    console.log(`   Simulated Amount: ₹${execResult.amountRecovered}`);
    console.log(`   Result:           ${isPass ? '✅ PASS' : '❌ FAIL'}\n`);
  }

  console.log(`📊 E2E Simulation Score: ${passed}/${E2E_SCENARIOS.length} (${((passed / E2E_SCENARIOS.length) * 100).toFixed(0)}%)\n`);
}

export async function runLiveDatabaseSimulation(limit = 50): Promise<void> {
  console.log('================================================================');
  console.log(`📊 Live PostgreSQL Simulation (Bounded: ${limit} Transactions)`);
  console.log('================================================================\n');

  const service = new RecoveryExecutorService();
  const summary = await service.runBatchExecution(limit);

  console.log(`Transactions Evaluated:      ${summary.processed}`);
  console.log(`Executions Run:              ${summary.executed}`);
  console.log(`Successful Recoveries:       ${summary.succeeded}`);
  console.log(`Failed Attempts:             ${summary.failed}`);
  console.log(`Cancelled Attempts:          ${summary.cancelled}`);
  console.log(`Pending (Scheduled) Actions: ${summary.pending}`);
  console.log(`Total Amount Recovered:      ₹${summary.amountRecovered.toLocaleString('en-IN')}`);
  console.log(`Execution Duration:          ${summary.durationMs}ms`);

  const metrics = await service.getMetrics();
  console.log('\n📈 Global Aggregate Recovery Metrics:');
  console.log(`Total Attempts to Date:     ${metrics.totalAttempts}`);
  console.log(`Overall Recovery Rate:      ${(metrics.recoveryRate * 100).toFixed(1)}%`);
  console.log(`Retry Success Rate:         ${(metrics.retrySuccessRate * 100).toFixed(1)}%`);
  console.log(`Total Revenue Recovered:    ₹${metrics.totalAmountRecovered.toLocaleString('en-IN')}`);
  console.log('Amount Recovered by Action:');
  console.log(`   RETRY:    ₹${metrics.amountByActionType.RETRY.toLocaleString('en-IN')}`);
  console.log(`   REMIND:   ₹${metrics.amountByActionType.REMIND.toLocaleString('en-IN')}`);
  console.log(`   ESCALATE: ₹${metrics.amountByActionType.ESCALATE.toLocaleString('en-IN')}`);
  console.log(`   WAIT:     ₹${metrics.amountByActionType.WAIT.toLocaleString('en-IN')}`);
  console.log(`   STOP:     ₹${metrics.amountByActionType.STOP.toLocaleString('en-IN')}`);

  console.log('\n================================================================');
  console.log('✅ Phase 6 Live Simulation Execution Completed Successfully!');
  console.log('================================================================\n');
}

async function main() {
  await runEndToEndSimulationEvaluation();
  await runLiveDatabaseSimulation(50);
}

if (process.argv[1]?.includes('evaluation-runner')) {
  main()
    .catch((err) => {
      console.error('Simulation Evaluation failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
