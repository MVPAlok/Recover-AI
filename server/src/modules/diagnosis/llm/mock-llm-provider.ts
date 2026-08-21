import { z } from 'zod';
import { LLMProvider } from './llm-provider.js';
import { RawDiagnosisLLMOutput } from '../diagnosis-schema.js';

export class MockLLMProvider implements LLMProvider {
  public readonly name = 'mock-llm-provider';
  public readonly model = 'mock-diagnosis-v1';

  async generateStructuredOutput<T>(
    _systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    let mockResult: RawDiagnosisLLMOutput;

    // Detect failure codes and retry count from the formatted prompt
    const isBankTimeout = userPrompt.includes('Failure Code: BANK_TIMEOUT');
    const isGatewayTimeout = userPrompt.includes('Failure Code: GATEWAY_TIMEOUT');
    const isNetworkError = userPrompt.includes('Failure Code: NETWORK_ERROR');
    const isUpiFailure = userPrompt.includes('Failure Code: UPI_FAILURE');
    const isAuthFailure = userPrompt.includes('Failure Code: AUTHENTICATION_FAILURE');
    const isInsufficientFunds = userPrompt.includes('Failure Code: INSUFFICIENT_FUNDS');
    const isCardDeclined = userPrompt.includes('Failure Code: CARD_DECLINED');
    const isExpiredCard = userPrompt.includes('Failure Code: EXPIRED_CARD');

    const retryMatch = userPrompt.match(/Retry Count:\s*(\d+)/);
    const retryCount = retryMatch ? parseInt(retryMatch[1], 10) : 0;

    if (isBankTimeout) {
      mockResult = {
        diagnosisCode: 'TEMPORARY_BANK_FAILURE',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        confidence: 0.92,
        severity: retryCount >= 3 ? 'HIGH' : 'LOW',
        isLikelyTemporary: true,
        evidence: [
          'Failure code indicates bank gateway processing timed out during authorization.',
          'Customer history indicates positive payment track record.',
          `Retry count is currently ${retryCount}.`,
        ],
        reasoning:
          'The failure is consistent with a transient bank authorization timeout rather than an invalid account or customer drop-off.',
        recommendedNextStep: retryCount >= 3 ? 'NO_RECOVERY_RECOMMENDED' : 'EVALUATE_RETRY',
      };
    } else if (isGatewayTimeout) {
      mockResult = {
        diagnosisCode: 'TEMPORARY_GATEWAY_FAILURE',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        confidence: 0.90,
        severity: retryCount >= 3 ? 'HIGH' : 'LOW',
        isLikelyTemporary: true,
        evidence: [
          'Payment gateway timed out while processing the authorization request.',
          'Payment instrument remains in good standing.',
        ],
        reasoning:
          'Gateway timeout is an infrastructure-level transient lag. Automated retry within a short window is advisable.',
        recommendedNextStep: retryCount >= 3 ? 'NO_RECOVERY_RECOMMENDED' : 'EVALUATE_RETRY',
      };
    } else if (isNetworkError || isUpiFailure) {
      mockResult = {
        diagnosisCode: isUpiFailure ? 'UPI_PROCESSING_FAILURE' : 'NETWORK_FAILURE',
        failureCategory: 'TEMPORARY_INFRASTRUCTURE',
        confidence: 0.86,
        severity: retryCount >= 3 ? 'HIGH' : 'LOW',
        isLikelyTemporary: true,
        evidence: [
          'Network packet or UPI app connection dropped during payment session.',
          'No indication of credit limit or account invalidity.',
        ],
        reasoning:
          'Transient connection drop during transaction processing. Suitable for smart automated retry.',
        recommendedNextStep: retryCount >= 3 ? 'NO_RECOVERY_RECOMMENDED' : 'EVALUATE_RETRY',
      };
    } else if (isAuthFailure) {
      mockResult = {
        diagnosisCode: 'CUSTOMER_AUTHENTICATION_FAILURE',
        failureCategory: 'CUSTOMER_AUTHENTICATION',
        confidence: 0.89,
        severity: 'MEDIUM',
        isLikelyTemporary: false,
        evidence: [
          'Customer did not complete the 3D-Secure / OTP verification challenge.',
          'Underlying card instrument is active and valid.',
        ],
        reasoning:
          'Customer-actionable drop-off during authentication. Technical retry alone will likely fail without re-engaging the customer with an updated payment link.',
        recommendedNextStep: 'EVALUATE_REMINDER',
      };
    } else if (isInsufficientFunds) {
      mockResult = {
        diagnosisCode: 'INSUFFICIENT_FUNDS',
        failureCategory: 'FINANCIAL_HARD',
        confidence: 0.91,
        severity: 'HIGH',
        isLikelyTemporary: false,
        evidence: [
          'Account balance or card limit was insufficient to cover the transaction amount.',
          'Issuer returned a hard liquidity decline.',
        ],
        reasoning:
          'Hard financial decline due to lack of funds. Immediate automated retry will incur unnecessary gateway failure penalties.',
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      };
    } else if (isExpiredCard) {
      mockResult = {
        diagnosisCode: 'EXPIRED_PAYMENT_INSTRUMENT',
        failureCategory: 'INSTRUMENT_EXPIRATION',
        confidence: 0.96,
        severity: 'HIGH',
        isLikelyTemporary: false,
        evidence: [
          'Card expiration date has passed.',
          'Instrument cannot process further authorizations.',
        ],
        reasoning:
          'The payment instrument has reached its expiration date and cannot process authorizations. Retrying will not succeed.',
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      };
    } else if (isCardDeclined) {
      mockResult = {
        diagnosisCode: 'CARD_DECLINED',
        failureCategory: 'FINANCIAL_HARD',
        confidence: 0.85,
        severity: 'HIGH',
        isLikelyTemporary: false,
        evidence: [
          'Issuing bank declined authorization request.',
          'Potential security restriction or limits on account.',
        ],
        reasoning:
          'Card issuer declined authorization. Direct retries should be paused pending customer verification.',
        recommendedNextStep: 'NO_RECOVERY_RECOMMENDED',
      };
    } else {
      mockResult = {
        diagnosisCode: 'UNKNOWN_PAYMENT_FAILURE',
        failureCategory: 'UNKNOWN',
        confidence: 0.45,
        severity: 'HIGH',
        isLikelyTemporary: false,
        evidence: ['Failure code and metadata are unlisted or missing.'],
        reasoning:
          'Diagnostic metadata is insufficient to establish root cause. Further investigation required.',
        recommendedNextStep: 'NEEDS_MORE_INFORMATION',
      };
    }

    return schema.parse(mockResult);
  }
}
