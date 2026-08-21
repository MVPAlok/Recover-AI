/**
 * Distributions, Taxonomy, and Profiles for RecoverAI Synthetic Data Engine.
 */

export enum CustomerProfileType {
  RELIABLE = 'RELIABLE',
  MIXED = 'MIXED',
  HIGH_FAILURE = 'HIGH_FAILURE',
  HIGH_VALUE = 'HIGH_VALUE',
}

export interface CustomerProfileConfig {
  type: CustomerProfileType;
  weight: number; // Probability weight
  successProbability: number; // Base success rate
  amountMultiplierRange: [number, number]; // Multiplier for transaction amounts
  avgTransactionsRange: [number, number]; // Min-max typical transactions
}

export const CUSTOMER_PROFILES: CustomerProfileConfig[] = [
  {
    type: CustomerProfileType.RELIABLE,
    weight: 50,
    successProbability: 0.92,
    amountMultiplierRange: [0.8, 1.2],
    avgTransactionsRange: [6, 15],
  },
  {
    type: CustomerProfileType.MIXED,
    weight: 30,
    successProbability: 0.70,
    amountMultiplierRange: [0.7, 1.3],
    avgTransactionsRange: [4, 12],
  },
  {
    type: CustomerProfileType.HIGH_FAILURE,
    weight: 10,
    successProbability: 0.35,
    amountMultiplierRange: [0.5, 1.1],
    avgTransactionsRange: [3, 8],
  },
  {
    type: CustomerProfileType.HIGH_VALUE,
    weight: 10,
    successProbability: 0.88,
    amountMultiplierRange: [3.0, 8.0],
    avgTransactionsRange: [5, 12],
  },
];

export const PAYMENT_METHODS = [
  { method: 'UPI', weight: 55 },
  { method: 'CREDIT_CARD', weight: 20 },
  { method: 'DEBIT_CARD', weight: 15 },
  { method: 'NET_BANKING', weight: 5 },
  { method: 'WALLET', weight: 5 },
];

export interface FailureDetail {
  code: string;
  reason: string;
  weight: number;
  typicalPaymentMethods: string[];
}

export const FAILURE_TAXONOMY: FailureDetail[] = [
  {
    code: 'BANK_TIMEOUT',
    reason: 'Bank gateway timed out during payment authorization',
    weight: 20,
    typicalPaymentMethods: ['NET_BANKING', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD'],
  },
  {
    code: 'GATEWAY_TIMEOUT',
    reason: 'Payment gateway processing timed out',
    weight: 15,
    typicalPaymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'UPI'],
  },
  {
    code: 'NETWORK_ERROR',
    reason: 'Network connection interrupted during transaction processing',
    weight: 10,
    typicalPaymentMethods: ['UPI', 'WALLET', 'CREDIT_CARD'],
  },
  {
    code: 'UPI_FAILURE',
    reason: 'UPI payment request failed or timed out on user device',
    weight: 20,
    typicalPaymentMethods: ['UPI'],
  },
  {
    code: 'AUTHENTICATION_FAILURE',
    reason: 'Card 3D-Secure / OTP verification failed',
    weight: 15,
    typicalPaymentMethods: ['CREDIT_CARD', 'DEBIT_CARD'],
  },
  {
    code: 'INSUFFICIENT_FUNDS',
    reason: 'Account or credit card limit has insufficient funds',
    weight: 10,
    typicalPaymentMethods: ['DEBIT_CARD', 'NET_BANKING', 'CREDIT_CARD', 'UPI'],
  },
  {
    code: 'CARD_DECLINED',
    reason: 'Card issuer declined the payment request',
    weight: 5,
    typicalPaymentMethods: ['CREDIT_CARD', 'DEBIT_CARD'],
  },
  {
    code: 'EXPIRED_CARD',
    reason: 'Card expiration date has passed',
    weight: 5,
    typicalPaymentMethods: ['CREDIT_CARD', 'DEBIT_CARD'],
  },
];

export const FAILURE_CODE_TO_REASON_MAP: Record<string, string> = Object.fromEntries(
  FAILURE_TAXONOMY.map((f) => [f.code, f.reason])
);

export interface PriceTier {
  tier: 'MICRO' | 'MID' | 'HIGH' | 'ENTERPRISE';
  weight: number;
  standardAmounts: number[];
}

export const REALISTIC_PRICE_TIERS: PriceTier[] = [
  {
    tier: 'MICRO',
    weight: 45,
    standardAmounts: [199, 299, 399, 499, 699, 799, 899, 999],
  },
  {
    tier: 'MID',
    weight: 35,
    standardAmounts: [1299, 1499, 1999, 2499, 2999, 3499, 4499, 4999],
  },
  {
    tier: 'HIGH',
    weight: 15,
    standardAmounts: [6999, 7500, 8999, 9999, 12500, 15000, 18500, 24999],
  },
  {
    tier: 'ENTERPRISE',
    weight: 5,
    standardAmounts: [34999, 49999, 59999, 75000, 89999, 115000, 150000],
  },
];

export enum RecoveryScenarioType {
  SCENARIO_A_STRONG_CUSTOMER_TEMP_FAILURE = 'SCENARIO_A_STRONG_CUSTOMER_TEMP_FAILURE',
  SCENARIO_B_REPEATED_FAILURE_INSUFFICIENT_FUNDS = 'SCENARIO_B_REPEATED_FAILURE_INSUFFICIENT_FUNDS',
  SCENARIO_C_AUTHENTICATION_FAILURE = 'SCENARIO_C_AUTHENTICATION_FAILURE',
  SCENARIO_D_GATEWAY_TIMEOUT = 'SCENARIO_D_GATEWAY_TIMEOUT',
  SCENARIO_E_REPEATED_RETRY_LIMIT = 'SCENARIO_E_REPEATED_RETRY_LIMIT',
}
