import { PolicyEngine } from '../policy-engine.js';
import { DecisionValidator } from '../decision-validator.js';
import { DecisionInput } from '../decision.types.js';

function createMockInput(overrides: Partial<DecisionInput> = {}): DecisionInput {
  return {
    transaction: {
      id: 'tx_test_123',
      merchantId: 'mcht_test_1',
      customerId: 'cust_test_1',
      amount: 2499,
      currency: 'INR',
      paymentMethod: 'UPI',
      failureCode: 'BANK_TIMEOUT',
      failureReason: 'Bank gateway timed out during payment authorization',
      retryCount: 0,
      createdAt: new Date(),
      ...(overrides.transaction || {}),
    },
    customer: {
      totalTransactions: 10,
      successfulTransactions: 9,
      failedTransactions: 1,
      successRate: 0.9,
      failureRate: 0.1,
      consecutiveFailures: 1,
      lifetimeSpend: 25000,
      averageTransactionAmount: 2500,
      hasHistory: true,
      ...(overrides.customer || {}),
    },
    detection: {
      recoveryProbability: 0.92,
      riskLevel: 'LOW',
      recoverable: true,
      confidenceScore: 0.9,
      factors: ['Strong customer history', 'Temporary timeout'],
      reasoningSummary: 'High recovery potential for transient bank timeout',
      ...(overrides.detection || {}),
    },
    diagnosis: {
      diagnosisCode: 'TEMPORARY_BANK_FAILURE',
      failureCategory: 'TEMPORARY_INFRASTRUCTURE',
      severity: 'LOW',
      isLikelyTemporary: true,
      confidence: 0.92,
      recommendedNextStep: 'EVALUATE_RETRY',
      evidence: ['Bank timeout code', 'Previous successful payments'],
      reasoning: 'Transient bank processing error',
      ...(overrides.diagnosis || {}),
    },
    llmAdvisory: overrides.llmAdvisory ?? null,
  };
}

export async function runRecoveryDecisionUnitTests(): Promise<void> {
  console.log('====================================================');
  console.log('🧪 Running Recovery Decision Engine Unit Tests...');
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

  // 1. Strong Temporary Failure -> RETRY
  {
    const input = createMockInput();
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'RETRY' &&
      result.rulesApplied.includes('TEMPORARY_FAILURE_RETRY_POLICY') &&
      result.blockedActions.includes('STOP'),
      'Strong temporary failure correctly evaluates to RETRY',
      JSON.stringify(result)
    );
  }

  // 2. Authentication Failure -> REMIND
  {
    const input = createMockInput({
      transaction: {
        id: 'tx_auth_1',
        merchantId: 'mcht_1',
        customerId: 'cust_1',
        amount: 1499,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'AUTHENTICATION_FAILURE',
        failureReason: '3D Secure OTP verification failed',
        retryCount: 0,
        createdAt: new Date(),
      },
      diagnosis: {
        diagnosisCode: 'CUSTOMER_AUTHENTICATION_FAILURE',
        failureCategory: 'CUSTOMER_AUTHENTICATION',
        severity: 'MEDIUM',
        isLikelyTemporary: false,
        confidence: 0.88,
        recommendedNextStep: 'EVALUATE_REMINDER',
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'REMIND' &&
      result.rulesApplied.includes('CUSTOMER_AUTHENTICATION_REQUIRED') &&
      result.blockedActions.includes('RETRY'),
      'Authentication failure correctly evaluates to REMIND',
      JSON.stringify(result)
    );
  }

  // 3. Repeated Insufficient Funds -> STOP
  {
    const input = createMockInput({
      transaction: {
        id: 'tx_funds_1',
        merchantId: 'mcht_1',
        customerId: 'cust_1',
        amount: 3000,
        currency: 'INR',
        paymentMethod: 'DEBIT_CARD',
        failureCode: 'INSUFFICIENT_FUNDS',
        failureReason: 'Account has insufficient funds',
        retryCount: 2,
        createdAt: new Date(),
      },
      diagnosis: {
        diagnosisCode: 'INSUFFICIENT_FUNDS',
        failureCategory: 'FINANCIAL_HARD',
        severity: 'HIGH',
        isLikelyTemporary: false,
        confidence: 0.95,
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'STOP' &&
      result.rulesApplied.includes('REPEATED_INSUFFICIENT_FUNDS') &&
      result.blockedActions.includes('RETRY'),
      'Repeated insufficient funds (retryCount >= 2) evaluates to STOP',
      JSON.stringify(result)
    );
  }

  // 4. Max Retry Limit Exceeded -> STOP
  {
    const input = createMockInput({
      transaction: {
        id: 'tx_retry_max',
        merchantId: 'mcht_1',
        customerId: 'cust_1',
        amount: 2499,
        currency: 'INR',
        paymentMethod: 'UPI',
        failureCode: 'BANK_TIMEOUT',
        failureReason: 'Bank timeout',
        retryCount: 3,
        createdAt: new Date(),
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'STOP' &&
      result.rulesApplied.includes('MAX_RETRY_LIMIT_EXCEEDED'),
      'Retry count >= 3 forces STOP regardless of failure type',
      JSON.stringify(result)
    );
  }

  // 5. Expired Payment Instrument -> STOP
  {
    const input = createMockInput({
      diagnosis: {
        diagnosisCode: 'EXPIRED_PAYMENT_INSTRUMENT',
        failureCategory: 'INSTRUMENT_EXPIRATION',
        severity: 'HIGH',
        isLikelyTemporary: false,
        confidence: 0.99,
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'STOP' &&
      result.rulesApplied.includes('EXPIRED_PAYMENT_INSTRUMENT') &&
      result.blockedActions.includes('RETRY'),
      'Expired payment instrument forces STOP',
      JSON.stringify(result)
    );
  }

  // 6. Unknown Diagnosis + Low Confidence -> ESCALATE
  {
    const input = createMockInput({
      detection: {
        recoveryProbability: 0.40,
        riskLevel: 'HIGH',
        recoverable: false,
        confidenceScore: 0.45,
      },
      diagnosis: {
        diagnosisCode: 'UNKNOWN_PAYMENT_FAILURE',
        failureCategory: 'UNKNOWN',
        severity: 'MEDIUM',
        isLikelyTemporary: false,
        confidence: 0.40,
        recommendedNextStep: 'NEEDS_MORE_INFORMATION',
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'ESCALATE' &&
      result.rulesApplied.includes('UNKNOWN_FAILURE_ESCALATION'),
      'Unknown failure with low confidence escalates for review',
      JSON.stringify(result)
    );
  }

  // 7. Conflicting Detection/Diagnosis Signals -> WAIT
  {
    const input = createMockInput({
      detection: {
        recoveryProbability: 0.35,
        riskLevel: 'HIGH',
        recoverable: false,
        confidenceScore: 0.65,
      },
      diagnosis: {
        diagnosisCode: 'TEMPORARY_GATEWAY_FAILURE',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        severity: 'LOW',
        isLikelyTemporary: true,
        confidence: 0.85,
        recommendedNextStep: 'EVALUATE_RETRY',
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'WAIT' &&
      result.rulesApplied.includes('CONFLICTING_SIGNALS_POLICY'),
      'Conflicting detection/diagnosis signals safely default to WAIT',
      JSON.stringify(result)
    );
  }

  // 8. High-Value Transaction Does Not Override Safety Rules
  {
    const input = createMockInput({
      transaction: {
        id: 'tx_high_val',
        merchantId: 'mcht_1',
        customerId: 'cust_1',
        amount: 85000,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'EXPIRED_CARD',
        failureReason: 'Card expired',
        retryCount: 0,
        createdAt: new Date(),
      },
      diagnosis: {
        diagnosisCode: 'EXPIRED_PAYMENT_INSTRUMENT',
        failureCategory: 'INSTRUMENT_EXPIRATION',
        severity: 'HIGH',
        isLikelyTemporary: false,
        confidence: 0.99,
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.businessPriority === 'HIGH' && result.decision === 'STOP',
      'High economic value sets HIGH priority but adheres to hard safety STOP',
      JSON.stringify(result)
    );
  }

  // 9. 98% Recovery Probability + retryCount >= 3 -> STOP
  {
    const input = createMockInput({
      transaction: {
        id: 'tx_super_prob_max_retry',
        merchantId: 'mcht_1',
        customerId: 'cust_1',
        amount: 1000,
        currency: 'INR',
        paymentMethod: 'UPI',
        failureCode: 'BANK_TIMEOUT',
        failureReason: 'Timeout',
        retryCount: 4,
        createdAt: new Date(),
      },
      detection: {
        recoveryProbability: 0.98,
        riskLevel: 'LOW',
        recoverable: true,
        confidenceScore: 0.95,
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'STOP' &&
      result.rulesApplied.includes('MAX_RETRY_LIMIT_EXCEEDED'),
      '98% recovery probability does not bypass max retry limit',
      JSON.stringify(result)
    );
  }

  // 10. Explainability Contains Factual Details & Rules
  {
    const input = createMockInput();
    const result = PolicyEngine.evaluate(input);
    assert(
      typeof result.reason === 'string' &&
      result.reason.length > 20 &&
      result.rulesApplied.length > 0 &&
      Array.isArray(result.blockedActions),
      'Decision output provides full explainability factors and rule trail',
      JSON.stringify(result)
    );
  }

  // 11. LLM Recommends RETRY but Policy Forces STOP with Override Audit
  {
    const input = createMockInput({
      transaction: {
        id: 'tx_llm_override',
        merchantId: 'mcht_1',
        customerId: 'cust_1',
        amount: 2499,
        currency: 'INR',
        paymentMethod: 'UPI',
        failureCode: 'BANK_TIMEOUT',
        failureReason: 'Timeout',
        retryCount: 3,
        createdAt: new Date(),
      },
      llmAdvisory: {
        recommendedAction: 'RETRY',
        confidence: 0.95,
        reasoning: 'Customer is very loyal, suggest another retry',
        supportingFactors: ['High lifetime spend'],
      },
    });
    const result = PolicyEngine.evaluate(input);
    assert(
      result.decision === 'STOP' &&
      result.policyOverride === 'MAX_RETRY_LIMIT_EXCEEDED' &&
      result.rulesApplied.includes('LLM_ADVISORY_OVERRIDDEN') &&
      result.reason.includes('OVERRIDE: MAX_RETRY_LIMIT_EXCEEDED'),
      'LLM advisory recommendation is overridden by authoritative safety rule with audit trail',
      JSON.stringify(result)
    );
  }

  // 12. DecisionValidator Schema Rejection for Malformed LLM Output
  {
    let rejected = false;
    try {
      DecisionValidator.validateLLMRecommendation({
        recommendedAction: 'INVALID_ACTION',
        confidence: 1.5,
        reasoning: 'short',
        supportingFactors: [],
      });
    } catch {
      rejected = true;
    }
    assert(rejected, 'DecisionValidator correctly rejects malformed LLM recommendation schema');
  }

  console.log(`\n🎉 All ${passed}/${total} Recovery Decision Unit Tests Passed Successfully!\n`);
}

if (process.argv[1]?.includes('recovery-decision.test')) {
  runRecoveryDecisionUnitTests().catch((e) => {
    console.error('Unit tests encountered a critical failure:', e);
    process.exit(1);
  });
}
