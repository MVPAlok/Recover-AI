import { FeatureExtractor } from './feature-extractor.js';
import { ScoringEngine } from './scoring-engine.js';
import { DetectionFeatures, RiskLevel, ScenarioEvaluationItem } from './detection.types.js';
import { prisma } from '../../config/prisma.js';
import { DetectionService } from './detection.service.js';

interface TestCase {
  id: string;
  name: string;
  tx: {
    id: string;
    amount: number;
    currency: string;
    paymentMethod: string | null;
    failureCode: string | null;
    failureReason: string | null;
    retryCount: number;
    createdAt: Date;
  };
  priorTxs: Array<{
    id: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    createdAt: Date;
  }>;
  expectedRiskLevel: RiskLevel | string;
  expectedRecoverable: boolean;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'SCENARIO_A',
    name: 'Scenario A (Strong Customer + Bank Timeout + 0 Retries)',
    tx: {
      id: 'txn_test_scen_a',
      amount: 2499,
      currency: 'INR',
      paymentMethod: 'UPI',
      failureCode: 'BANK_TIMEOUT',
      failureReason: 'Bank gateway timed out during payment authorization',
      retryCount: 0,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'tx_1', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 40 * 86400000) },
      { id: 'tx_2', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 30 * 86400000) },
      { id: 'tx_3', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
      { id: 'tx_4', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 10 * 86400000) },
    ],
    expectedRiskLevel: 'LOW',
    expectedRecoverable: true,
  },
  {
    id: 'SCENARIO_B',
    name: 'Scenario B (Repeated Failures + Insufficient Funds + 2 Retries)',
    tx: {
      id: 'txn_test_scen_b',
      amount: 2499,
      currency: 'INR',
      paymentMethod: 'DEBIT_CARD',
      failureCode: 'INSUFFICIENT_FUNDS',
      failureReason: 'Account or credit card limit has insufficient funds',
      retryCount: 2,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'tx_1', amount: 2499, status: 'FAILED', createdAt: new Date(Date.now() - 20 * 86400000) },
      { id: 'tx_2', amount: 2499, status: 'FAILED', createdAt: new Date(Date.now() - 10 * 86400000) },
    ],
    expectedRiskLevel: 'HIGH',
    expectedRecoverable: false,
  },
  {
    id: 'SCENARIO_C',
    name: 'Scenario C (Strong Customer + Authentication Failure)',
    tx: {
      id: 'txn_test_scen_c',
      amount: 2499,
      currency: 'INR',
      paymentMethod: 'CREDIT_CARD',
      failureCode: 'AUTHENTICATION_FAILURE',
      failureReason: 'Card 3D-Secure / OTP verification failed',
      retryCount: 0,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'tx_1', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 30 * 86400000) },
      { id: 'tx_2', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
      { id: 'tx_3', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 10 * 86400000) },
    ],
    expectedRiskLevel: 'LOW/MEDIUM',
    expectedRecoverable: true,
  },
  {
    id: 'SCENARIO_D',
    name: 'Scenario D (Strong Customer + Gateway Timeout + 0 Retries)',
    tx: {
      id: 'txn_test_scen_d',
      amount: 4999,
      currency: 'INR',
      paymentMethod: 'CREDIT_CARD',
      failureCode: 'GATEWAY_TIMEOUT',
      failureReason: 'Payment gateway processing timed out',
      retryCount: 0,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'tx_1', amount: 4999, status: 'SUCCESS', createdAt: new Date(Date.now() - 30 * 86400000) },
      { id: 'tx_2', amount: 4999, status: 'SUCCESS', createdAt: new Date(Date.now() - 15 * 86400000) },
    ],
    expectedRiskLevel: 'LOW',
    expectedRecoverable: true,
  },
  {
    id: 'SCENARIO_E',
    name: 'Scenario E (Exceeded Retry Limit: retryCount >= 3)',
    tx: {
      id: 'txn_test_scen_e',
      amount: 2499,
      currency: 'INR',
      paymentMethod: 'UPI',
      failureCode: 'CARD_DECLINED',
      failureReason: 'Card issuer declined the payment request',
      retryCount: 3,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'tx_1', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 30 * 86400000) },
    ],
    expectedRiskLevel: 'HIGH',
    expectedRecoverable: false,
  },
  {
    id: 'EDGE_EXPIRED_CARD',
    name: 'Edge Case (Expired Card Instrument Failure)',
    tx: {
      id: 'txn_test_edge_expired',
      amount: 1499,
      currency: 'INR',
      paymentMethod: 'CREDIT_CARD',
      failureCode: 'EXPIRED_CARD',
      failureReason: 'Card expiration date has passed',
      retryCount: 0,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'tx_1', amount: 1499, status: 'SUCCESS', createdAt: new Date(Date.now() - 40 * 86400000) },
    ],
    expectedRiskLevel: 'HIGH',
    expectedRecoverable: false,
  },
  {
    id: 'EDGE_NEW_CUSTOMER_TIMEOUT',
    name: 'Edge Case (New Customer with Zero Prior History + Timeout)',
    tx: {
      id: 'txn_test_edge_new_cust',
      amount: 999,
      currency: 'INR',
      paymentMethod: 'UPI',
      failureCode: 'BANK_TIMEOUT',
      failureReason: 'Bank gateway timed out during payment authorization',
      retryCount: 0,
      createdAt: new Date(),
    },
    priorTxs: [],
    expectedRiskLevel: 'LOW',
    expectedRecoverable: true,
  },
];

export async function runEvaluation(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 RecoverAI Detection & Scoring Engine Evaluation');
  console.log('====================================================\n');

  const scenarioResults: ScenarioEvaluationItem[] = [];
  let passedCount = 0;

  for (const test of TEST_CASES) {
    const features = FeatureExtractor.extract(test.tx, test.priorTxs as any);
    const result = ScoringEngine.evaluate(
      test.tx.id,
      'mcht_test_eval',
      'cust_test_eval',
      features
    );

    let pass = false;
    if (test.expectedRiskLevel.includes('/')) {
      const allowed = test.expectedRiskLevel.split('/');
      pass = allowed.includes(result.riskLevel) && result.recoverable === test.expectedRecoverable;
    } else {
      pass =
        result.riskLevel === test.expectedRiskLevel &&
        result.recoverable === test.expectedRecoverable;
    }

    if (pass) passedCount++;

    scenarioResults.push({
      scenarioId: test.id,
      scenarioName: test.name,
      expectedRiskLevel: test.expectedRiskLevel,
      actualRiskLevel: result.riskLevel,
      expectedRecoverable: test.expectedRecoverable,
      actualRecoverable: result.recoverable,
      recoveryProbability: result.recoveryProbability,
      confidenceScore: result.confidenceScore,
      recommendedDecision: result.recommendedDecision,
      pass,
      reasoning: result.reasoningSummary,
    });

    console.log(`[${pass ? '✅ PASS' : '❌ FAIL'}] ${test.name}`);
    console.log(`       Probability : ${(result.recoveryProbability * 100).toFixed(1)}% | Confidence: ${(result.confidenceScore * 100).toFixed(0)}%`);
    console.log(`       Risk Level  : ${result.riskLevel} (Expected: ${test.expectedRiskLevel})`);
    console.log(`       Decision    : ${result.recommendedDecision} | Recoverable: ${result.recoverable}`);
    console.log(`       Reasoning   : ${result.reasoningSummary.slice(0, 120)}...`);
    console.log('');
  }

  const alignmentRate = ((passedCount / TEST_CASES.length) * 100).toFixed(1);
  console.log('----------------------------------------------------');
  console.log(`Scenario Alignment Score: ${passedCount}/${TEST_CASES.length} (${alignmentRate}%)`);
  console.log('----------------------------------------------------\n');

  // Evaluate against live database if connected
  try {
    console.log('📊 Evaluating Live PostgreSQL Dataset with Batch Detection Service...');
    const service = new DetectionService();
    const batchSummary = await service.runBatchDetection(500, false);

    console.log('Live Dataset Results:');
    console.log(`  - Failed Transactions Evaluated : ${batchSummary.processed}`);
    console.log(`  - Classified Recoverable       : ${batchSummary.recoverable} (${((batchSummary.recoverable / (batchSummary.processed || 1)) * 100).toFixed(1)}%)`);
    console.log(`  - Classified Non-Recoverable   : ${batchSummary.notRecoverable} (${((batchSummary.notRecoverable / (batchSummary.processed || 1)) * 100).toFixed(1)}%)`);
    console.log(`  - LOW Risk (High Confidence)   : ${batchSummary.lowRisk}`);
    console.log(`  - MEDIUM Risk (Caution/Remind) : ${batchSummary.mediumRisk}`);
    console.log(`  - HIGH Risk (Stop/Hard Fail)   : ${batchSummary.highRisk}`);
    console.log(`  - AIDecisions Persisted to DB  : ${batchSummary.persistedDecisions}`);
    console.log(`  - Processing Time              : ${batchSummary.durationMs}ms`);
    console.log('====================================================\n');
  } catch (err) {
    console.warn('⚠️ Could not run live dataset batch (database might be disconnected or empty):', err);
  }
}

if (process.argv[1]?.includes('evaluation-runner')) {
  runEvaluation()
    .catch((e) => {
      console.error('Evaluation runner failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
