import { FeatureExtractor } from '../feature-extractor.js';
import { ScoringEngine } from '../scoring-engine.js';
import { RecoveryDecision } from '@prisma/client';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runUnitTests() {
  console.log('🧪 Running Detection & Scoring Engine Unit Tests...\n');

  // Test 1: Scenario A - Strong customer + BANK_TIMEOUT + 0 retries
  {
    const features = FeatureExtractor.extract(
      {
        amount: 2499,
        currency: 'INR',
        paymentMethod: 'UPI',
        failureCode: 'BANK_TIMEOUT',
        failureReason: 'Bank gateway timed out',
        retryCount: 0,
        createdAt: new Date(),
      },
      [
        { amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 30 * 86400000) },
        { amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
        { amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 10 * 86400000) },
      ]
    );

    const result = ScoringEngine.evaluate('tx_a', 'mcht_1', 'cust_1', features);
    assert(result.riskLevel === 'LOW', 'Scenario A must have LOW risk');
    assert(result.recoverable === true, 'Scenario A must be recoverable');
    assert(result.recoveryProbability >= 0.75, 'Scenario A recovery probability must be >= 0.75');
    assert(result.recommendedDecision === RecoveryDecision.RETRY, 'Scenario A must recommend RETRY');
    console.log('  ✓ Unit Test 1: Scenario A (Strong Customer + Bank Timeout) passed.');
  }

  // Test 2: Scenario B - Repeated failures + INSUFFICIENT_FUNDS + 2 retries
  {
    const features = FeatureExtractor.extract(
      {
        amount: 2499,
        currency: 'INR',
        paymentMethod: 'DEBIT_CARD',
        failureCode: 'INSUFFICIENT_FUNDS',
        failureReason: 'Insufficient funds',
        retryCount: 2,
        createdAt: new Date(),
      },
      [
        { amount: 2499, status: 'FAILED', createdAt: new Date(Date.now() - 20 * 86400000) },
        { amount: 2499, status: 'FAILED', createdAt: new Date(Date.now() - 10 * 86400000) },
      ]
    );

    const result = ScoringEngine.evaluate('tx_b', 'mcht_1', 'cust_1', features);
    assert(result.riskLevel === 'HIGH', 'Scenario B must have HIGH risk');
    assert(result.recoverable === false, 'Scenario B must be not recoverable');
    assert(result.recoveryProbability < 0.45, 'Scenario B recovery probability must be < 0.45');
    assert(result.recommendedDecision === RecoveryDecision.STOP, 'Scenario B must recommend STOP');
    console.log('  ✓ Unit Test 2: Scenario B (Repeated Failures + Insufficient Funds) passed.');
  }

  // Test 3: Scenario C - Strong customer + AUTHENTICATION_FAILURE
  {
    const features = FeatureExtractor.extract(
      {
        amount: 1499,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'AUTHENTICATION_FAILURE',
        failureReason: 'OTP verification failed',
        retryCount: 0,
        createdAt: new Date(),
      },
      [
        { amount: 1499, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
        { amount: 1499, status: 'SUCCESS', createdAt: new Date(Date.now() - 10 * 86400000) },
      ]
    );

    const result = ScoringEngine.evaluate('tx_c', 'mcht_1', 'cust_1', features);
    assert(result.recoverable === true, 'Scenario C must be recoverable');
    assert(result.riskLevel === 'LOW' || result.riskLevel === 'MEDIUM', 'Scenario C risk must be LOW or MEDIUM');
    console.log('  ✓ Unit Test 3: Scenario C (Authentication Failure) passed.');
  }

  // Test 4: Scenario D - Strong customer + GATEWAY_TIMEOUT + 0 retries
  {
    const features = FeatureExtractor.extract(
      {
        amount: 4999,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'GATEWAY_TIMEOUT',
        failureReason: 'Gateway timeout',
        retryCount: 0,
        createdAt: new Date(),
      },
      [
        { amount: 4999, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
        { amount: 4999, status: 'SUCCESS', createdAt: new Date(Date.now() - 10 * 86400000) },
      ]
    );

    const result = ScoringEngine.evaluate('tx_d', 'mcht_1', 'cust_1', features);
    assert(result.riskLevel === 'LOW', 'Scenario D must have LOW risk');
    assert(result.recommendedDecision === RecoveryDecision.RETRY, 'Scenario D must recommend RETRY');
    console.log('  ✓ Unit Test 4: Scenario D (Gateway Timeout) passed.');
  }

  // Test 5: Scenario E - Retry limit reached (retryCount >= 3)
  {
    const features = FeatureExtractor.extract(
      {
        amount: 2499,
        currency: 'INR',
        paymentMethod: 'UPI',
        failureCode: 'BANK_TIMEOUT',
        failureReason: 'Bank timeout',
        retryCount: 3,
        createdAt: new Date(),
      },
      [
        { amount: 2499, status: 'SUCCESS', createdAt: new Date(Date.now() - 20 * 86400000) },
      ]
    );

    const result = ScoringEngine.evaluate('tx_e', 'mcht_1', 'cust_1', features);
    assert(result.riskLevel === 'HIGH', 'Scenario E must have HIGH risk');
    assert(result.recoveryProbability <= 0.30, 'Scenario E probability must be capped at <= 0.30');
    assert(result.recommendedDecision === RecoveryDecision.STOP, 'Scenario E must recommend STOP');
    console.log('  ✓ Unit Test 5: Scenario E (Retry Count >= 3 Penalty & Cap) passed.');
  }

  // Test 6: Edge Case - Expired Card
  {
    const features = FeatureExtractor.extract(
      {
        amount: 999,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'EXPIRED_CARD',
        failureReason: 'Card expired',
        retryCount: 0,
        createdAt: new Date(),
      },
      []
    );

    const result = ScoringEngine.evaluate('tx_exp', 'mcht_1', 'cust_1', features);
    assert(result.riskLevel === 'HIGH', 'Expired Card must be HIGH risk');
    assert(result.recoverable === false, 'Expired Card must be non-recoverable');
    console.log('  ✓ Unit Test 6: Edge Case (Expired Card) passed.');
  }

  // Test 7: Edge Case - High Value Payment without Bias
  {
    const features = FeatureExtractor.extract(
      {
        amount: 150000,
        currency: 'INR',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'CARD_DECLINED',
        failureReason: 'Issuer declined',
        retryCount: 2,
        createdAt: new Date(),
      },
      []
    );

    const result = ScoringEngine.evaluate('tx_high_val', 'mcht_1', 'cust_1', features);
    assert(result.riskLevel === 'HIGH', 'High value payment with hard decline must not be biased to LOW risk');
    assert(result.recoverable === false, 'High value payment with hard decline must not be recoverable');
    console.log('  ✓ Unit Test 7: Edge Case (High Value Payment Unbiased) passed.');
  }

  // Test 8: Explainability Factors Completeness
  {
    const features = FeatureExtractor.extract(
      {
        amount: 3499,
        currency: 'INR',
        paymentMethod: 'UPI',
        failureCode: 'UPI_FAILURE',
        failureReason: 'UPI app timeout',
        retryCount: 0,
        createdAt: new Date(),
      },
      [
        { amount: 3499, status: 'SUCCESS', createdAt: new Date(Date.now() - 10 * 86400000) },
      ]
    );

    const result = ScoringEngine.evaluate('tx_exp', 'mcht_1', 'cust_1', features);
    assert(result.factors.length >= 3, 'Must contain at least 3 structured factors');
    assert(result.reasoningSummary.length > 20, 'Reasoning summary must be non-empty');
    assert(result.confidenceScore >= 0.30 && result.confidenceScore <= 0.95, 'Confidence score must be bounded');
    console.log('  ✓ Unit Test 8: Explainability Factors & Confidence Bounds passed.');
  }

  console.log('\n🎉 All 8 Unit Tests Passed Successfully!\n');
}

runUnitTests().catch((err) => {
  console.error('❌ Unit test suite failed:', err);
  process.exit(1);
});
