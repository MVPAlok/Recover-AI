import { PolicyEngine } from './policy-engine.js';
import { DecisionService } from './decision.service.js';
import { prisma } from '../../config/prisma.js';
import { DecisionEvaluationItem, DecisionInput } from './decision.types.js';
import { RecoveryDecision } from '@prisma/client';

interface ScenarioCase {
  id: string;
  name: string;
  input: DecisionInput;
  expectedDecision: RecoveryDecision;
}

const EVALUATION_CASES: ScenarioCase[] = [
  {
    id: 'SCENARIO_A',
    name: 'Scenario A (Strong Customer + Bank Timeout + 0 Retries)',
    input: {
      transaction: {
        id: 'eval_dec_a',
        merchantId: 'mcht_eval',
        customerId: 'cust_eval_a',
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
    expectedDecision: 'RETRY',
  },
  {
    id: 'SCENARIO_B',
    name: 'Scenario B (Repeated Failures + Insufficient Funds + 2 Retries)',
    input: {
      transaction: {
        id: 'eval_dec_b',
        merchantId: 'mcht_eval',
        customerId: 'cust_eval_b',
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
    expectedDecision: 'STOP',
  },
  {
    id: 'SCENARIO_C',
    name: 'Scenario C (Strong Customer + Authentication Failure)',
    input: {
      transaction: {
        id: 'eval_dec_c',
        merchantId: 'mcht_eval',
        customerId: 'cust_eval_c',
        amount: 1499,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'AUTHENTICATION_FAILURE',
        failureReason: 'Card 3D-Secure / OTP verification failed',
        retryCount: 0,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 4,
        successfulTransactions: 4,
        failedTransactions: 0,
        successRate: 1.0,
        failureRate: 0.0,
        consecutiveFailures: 0,
        lifetimeSpend: 5996,
        averageTransactionAmount: 1499,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.78,
        riskLevel: 'LOW',
        recoverable: true,
        confidenceScore: 0.85,
      },
      diagnosis: {
        diagnosisCode: 'CUSTOMER_AUTHENTICATION_FAILURE',
        failureCategory: 'CUSTOMER_AUTHENTICATION',
        severity: 'MEDIUM',
        isLikelyTemporary: false,
        confidence: 0.90,
        recommendedNextStep: 'EVALUATE_REMINDER',
      },
    },
    expectedDecision: 'REMIND',
  },
  {
    id: 'SCENARIO_D',
    name: 'Scenario D (Strong Customer + Gateway Timeout + 0 Retries)',
    input: {
      transaction: {
        id: 'eval_dec_d',
        merchantId: 'mcht_eval',
        customerId: 'cust_eval_d',
        amount: 4999,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'GATEWAY_TIMEOUT',
        failureReason: 'Payment gateway processing timed out',
        retryCount: 0,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 8,
        successfulTransactions: 8,
        failedTransactions: 0,
        successRate: 1.0,
        failureRate: 0.0,
        consecutiveFailures: 0,
        lifetimeSpend: 39992,
        averageTransactionAmount: 4999,
        hasHistory: true,
      },
      detection: {
        recoveryProbability: 0.88,
        riskLevel: 'LOW',
        recoverable: true,
        confidenceScore: 0.90,
      },
      diagnosis: {
        diagnosisCode: 'TEMPORARY_GATEWAY_FAILURE',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        severity: 'LOW',
        isLikelyTemporary: true,
        confidence: 0.90,
        recommendedNextStep: 'EVALUATE_RETRY',
      },
    },
    expectedDecision: 'RETRY',
  },
  {
    id: 'SCENARIO_E',
    name: 'Scenario E (Exceeded Retry Limit: retryCount >= 3)',
    input: {
      transaction: {
        id: 'eval_dec_e',
        merchantId: 'mcht_eval',
        customerId: 'cust_eval_e',
        amount: 2499,
        currency: 'INR',
        paymentMethod: 'CARD_DECLINED',
        failureCode: 'CARD_DECLINED',
        failureReason: 'Card issuer declined the payment request',
        retryCount: 3,
        createdAt: new Date(),
      },
      customer: {
        totalTransactions: 3,
        successfulTransactions: 0,
        failedTransactions: 3,
        successRate: 0.0,
        failureRate: 1.0,
        consecutiveFailures: 3,
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
        diagnosisCode: 'CARD_DECLINED',
        failureCategory: 'FINANCIAL_HARD',
        severity: 'HIGH',
        isLikelyTemporary: false,
        confidence: 0.95,
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      },
    },
    expectedDecision: 'STOP',
  },
];

export async function runRecoveryDecisionEvaluation(): Promise<void> {
  console.log('====================================================');
  console.log('⚖️ RecoverAI Recovery Decision Engine Evaluation');
  console.log('====================================================\n');

  let passed = 0;
  const results: DecisionEvaluationItem[] = [];

  for (const item of EVALUATION_CASES) {
    const result = PolicyEngine.evaluate(item.input);
    const pass = result.decision === item.expectedDecision;
    if (pass) passed++;

    results.push({
      scenarioId: item.id,
      scenarioName: item.name,
      expectedDecision: item.expectedDecision,
      actualDecision: result.decision,
      confidence: result.confidence,
      businessPriority: result.businessPriority,
      pass,
      reason: result.reason,
      rulesApplied: result.rulesApplied,
      policyOverride: result.policyOverride,
    });

    console.log(`[${pass ? '✅ PASS' : '❌ FAIL'}] ${item.name}`);
    console.log(`       Decision : ${result.decision} (Expected: ${item.expectedDecision})`);
    console.log(`       Priority : ${result.businessPriority} | Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`       Rules    : ${result.rulesApplied.join(', ')}`);
    console.log(`       Reason   : ${result.reason}`);
    console.log('');
  }

  const rate = ((passed / EVALUATION_CASES.length) * 100).toFixed(1);
  console.log('----------------------------------------------------');
  console.log(`Recovery Decision Policy Alignment: ${passed}/${EVALUATION_CASES.length} (${rate}%)`);
  console.log('----------------------------------------------------\n');

  // Live Batch Decision Evaluation against PostgreSQL
  try {
    console.log('📊 Executing Live PostgreSQL Batch Decision Evaluation (Limit: 50)...');
    const service = new DecisionService();
    const summary = await service.runBatchDecisions(50, false);

    console.log('\nLive Dataset Recovery Decision Summary:');
    console.log(`  - Failed Transactions Evaluated : ${summary.processed}`);
    console.log(`  - Successful Decision Decisions : ${summary.successful}`);
    console.log(`  - Errors / Failures             : ${summary.failed}`);
    console.log('  - Decision Distribution:');
    console.log(`      * RETRY    : ${summary.retry}`);
    console.log(`      * REMIND   : ${summary.remind}`);
    console.log(`      * ESCALATE : ${summary.escalate}`);
    console.log(`      * WAIT     : ${summary.wait}`);
    console.log(`      * STOP     : ${summary.stop}`);
    console.log(`  - Hard Safety Rule Overrides    : ${summary.policyOverrides}`);
    console.log(`  - AIDecision Records Persisted  : ${summary.persistedDecisions}`);
    console.log(`  - AuditLog Records Created      : ${summary.auditLogsCreated}`);
    console.log(`  - Revenue at Risk Evaluated     : ₹${summary.revenueAtRisk.toLocaleString()}`);
    console.log(`  - Potential Recovery Value      : ₹${summary.potentialRecoveryValue.toLocaleString()}`);
    console.log(`  - Processing Duration           : ${summary.durationMs}ms`);
    console.log('\n⚠️ NOTE: Phase 5 produces recovery policies only. No actual payments were executed or retried.');
    console.log('====================================================\n');
  } catch (err) {
    console.warn('⚠️ Could not run live database decision batch:', err);
  }
}

if (process.argv[1]?.includes('evaluation-runner')) {
  runRecoveryDecisionEvaluation()
    .catch((e) => {
      console.error('Decision evaluation runner error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
