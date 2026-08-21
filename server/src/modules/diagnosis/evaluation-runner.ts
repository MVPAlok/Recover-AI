import { DiagnosisContextBuilder } from './context-builder.js';
import { DiagnosisAgent } from './diagnosis-agent.js';
import { MockLLMProvider } from './llm/mock-llm-provider.js';
import { DiagnosisService } from './diagnosis.service.js';
import { prisma } from '../../config/prisma.js';
import { DiagnosisCode, DiagnosisEvaluationItem, RecommendedNextStep } from './diagnosis.types.js';

interface ScenarioCase {
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
  expectedDiagnosisCode: DiagnosisCode;
  expectedNextStep: RecommendedNextStep;
}

const EVALUATION_CASES: ScenarioCase[] = [
  {
    id: 'SCENARIO_A',
    name: 'Scenario A (Strong Customer + Bank Timeout + 0 Retries)',
    tx: {
      id: 'eval_tx_a',
      amount: 2499,
      currency: 'INR',
      paymentMethod: 'UPI',
      failureCode: 'BANK_TIMEOUT',
      failureReason: 'Bank gateway timed out during payment authorization',
      retryCount: 0,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'h1', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 30 * 86400000) },
      { id: 'h2', amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
    ],
    expectedDiagnosisCode: 'TEMPORARY_BANK_FAILURE',
    expectedNextStep: 'EVALUATE_RETRY',
  },
  {
    id: 'SCENARIO_B',
    name: 'Scenario B (Repeated Failure + Insufficient Funds + 2 Retries)',
    tx: {
      id: 'eval_tx_b',
      amount: 2499,
      currency: 'INR',
      paymentMethod: 'DEBIT_CARD',
      failureCode: 'INSUFFICIENT_FUNDS',
      failureReason: 'Account or credit card limit has insufficient funds',
      retryCount: 2,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'h1', amount: 2499, status: 'FAILED', createdAt: new Date(Date.now() - 20 * 86400000) },
    ],
    expectedDiagnosisCode: 'INSUFFICIENT_FUNDS',
    expectedNextStep: 'NO_RECOVERY_RECOMMENDED',
  },
  {
    id: 'SCENARIO_C',
    name: 'Scenario C (Strong Customer + Authentication Failure)',
    tx: {
      id: 'eval_tx_c',
      amount: 1499,
      currency: 'INR',
      paymentMethod: 'CREDIT_CARD',
      failureCode: 'AUTHENTICATION_FAILURE',
      failureReason: 'Card 3D-Secure / OTP verification failed',
      retryCount: 0,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'h1', amount: 1499, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
    ],
    expectedDiagnosisCode: 'CUSTOMER_AUTHENTICATION_FAILURE',
    expectedNextStep: 'EVALUATE_REMINDER',
  },
  {
    id: 'SCENARIO_D',
    name: 'Scenario D (Strong Customer + Gateway Timeout + 0 Retries)',
    tx: {
      id: 'eval_tx_d',
      amount: 4999,
      currency: 'INR',
      paymentMethod: 'CREDIT_CARD',
      failureCode: 'GATEWAY_TIMEOUT',
      failureReason: 'Payment gateway processing timed out',
      retryCount: 0,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'h1', amount: 4999, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
    ],
    expectedDiagnosisCode: 'TEMPORARY_GATEWAY_FAILURE',
    expectedNextStep: 'EVALUATE_RETRY',
  },
  {
    id: 'SCENARIO_E',
    name: 'Scenario E (Exceeded Retry Limit: retryCount >= 3)',
    tx: {
      id: 'eval_tx_e',
      amount: 2499,
      currency: 'INR',
      paymentMethod: 'CARD_DECLINED',
      failureCode: 'CARD_DECLINED',
      failureReason: 'Card issuer declined the payment request',
      retryCount: 3,
      createdAt: new Date(),
    },
    priorTxs: [
      { id: 'h1', amount: 2499, status: 'FAILED', createdAt: new Date(Date.now() - 10 * 86400000) },
    ],
    expectedDiagnosisCode: 'CARD_DECLINED',
    expectedNextStep: 'NO_RECOVERY_RECOMMENDED',
  },
];

export async function runDiagnosisEvaluation(): Promise<void> {
  console.log('====================================================');
  console.log('🧠 RecoverAI Diagnosis Agent Evaluation Runner');
  console.log('====================================================\n');

  const provider = new MockLLMProvider();
  const agent = new DiagnosisAgent(provider);

  let passed = 0;
  const results: DiagnosisEvaluationItem[] = [];

  for (const item of EVALUATION_CASES) {
    const context = DiagnosisContextBuilder.build(item.tx, item.priorTxs as any);
    const result = await agent.diagnose(context, 'mcht_eval');

    const pass =
      result.diagnosisCode === item.expectedDiagnosisCode &&
      result.recommendedNextStep === item.expectedNextStep;

    if (pass) passed++;

    results.push({
      scenarioId: item.id,
      scenarioName: item.name,
      expectedDiagnosisCode: item.expectedDiagnosisCode,
      actualDiagnosisCode: result.diagnosisCode,
      expectedCategory: result.failureCategory,
      actualCategory: result.failureCategory,
      expectedNextStep: item.expectedNextStep,
      actualNextStep: result.recommendedNextStep,
      confidence: result.confidence,
      pass,
      reasoning: result.reasoning,
    });

    console.log(`[${pass ? '✅ PASS' : '❌ FAIL'}] ${item.name}`);
    console.log(`       Diagnosis : ${result.diagnosisCode} (Expected: ${item.expectedDiagnosisCode})`);
    console.log(`       Category  : ${result.failureCategory} | Severity: ${result.severity}`);
    console.log(`       Next Step : ${result.recommendedNextStep} (Expected: ${item.expectedNextStep})`);
    console.log(`       Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`       Evidence  : ${result.evidence.join('; ')}`);
    console.log('');
  }

  const rate = ((passed / EVALUATION_CASES.length) * 100).toFixed(1);
  console.log('----------------------------------------------------');
  console.log(`Diagnosis Scenario Alignment: ${passed}/${EVALUATION_CASES.length} (${rate}%)`);
  console.log('----------------------------------------------------\n');

  // Live Batch Diagnosis against PostgreSQL
  try {
    console.log('📊 Executing Live PostgreSQL Batch Diagnosis (Limit: 50)...');
    const service = new DiagnosisService();
    const summary = await service.runBatchDiagnosis(50, false);

    console.log('Live Batch Diagnosis Summary:');
    console.log(`  - Total Processed     : ${summary.processed}`);
    console.log(`  - Succeeded Diagnoses : ${summary.successful}`);
    console.log(`  - Failed / Errored    : ${summary.failed}`);
    console.log(`  - LOW Severity        : ${summary.lowSeverity}`);
    console.log(`  - MEDIUM Severity     : ${summary.mediumSeverity}`);
    console.log(`  - HIGH Severity       : ${summary.highSeverity}`);
    console.log(`  - AIDecisions Saved   : ${summary.persistedDecisions}`);
    console.log(`  - Execution Time      : ${summary.durationMs}ms`);
    console.log('====================================================\n');
  } catch (err) {
    console.warn('⚠️ Could not run live database diagnosis batch:', err);
  }
}

if (process.argv[1]?.includes('evaluation-runner')) {
  runDiagnosisEvaluation()
    .catch((e) => {
      console.error('Diagnosis evaluation runner error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
