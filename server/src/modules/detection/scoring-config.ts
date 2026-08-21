import { FailureCategory } from './detection.types.js';

export const FAILURE_CATEGORY_MAP: Record<string, FailureCategory> = {
  BANK_TIMEOUT: 'TEMPORARY_INFRASTRUCTURE',
  GATEWAY_TIMEOUT: 'TEMPORARY_INFRASTRUCTURE',
  NETWORK_ERROR: 'TEMPORARY_INFRASTRUCTURE',
  UPI_FAILURE: 'TEMPORARY_INFRASTRUCTURE',
  AUTHENTICATION_FAILURE: 'CUSTOMER_AUTHENTICATION',
  INSUFFICIENT_FUNDS: 'FINANCIAL_HARD',
  CARD_DECLINED: 'FINANCIAL_HARD',
  EXPIRED_CARD: 'INSTRUMENT_EXPIRATION',
};

export const SCORING_CONFIG = {
  MODEL_NAME: 'deterministic-scoring-v1',

  // Base score starting point
  BASE_SCORE: 0.50,

  // Failure category additive modifiers
  CATEGORY_MODIFIERS: {
    TEMPORARY_INFRASTRUCTURE: 0.25,
    CUSTOMER_AUTHENTICATION: 0.12,
    FINANCIAL_HARD: -0.30,
    INSTRUMENT_EXPIRATION: -0.35,
    UNKNOWN: -0.10,
  } as Record<FailureCategory, number>,

  // Retry count penalty schedule
  RETRY_PENALTIES: {
    0: 0.05,    // First attempt bonus
    1: 0.00,    // Single previous retry neutral
    2: -0.15,   // Moderate retry penalty
    3: -0.40,   // Severe retry penalty
  },

  // Hard safety rules
  MAX_RETRY_LIMIT: 3,
  MAX_RETRY_PROBABILITY_CAP: 0.30, // Caps recovery probability if retryCount >= 3
  REPEATED_INSUFFICIENT_FUNDS_PENALTY: -0.20, // Applied when INSUFFICIENT_FUNDS repeats

  // Customer historical reliability multiplier
  CUSTOMER_RELIABILITY_WEIGHT: 0.30,
  MIN_TRANSACTIONS_FOR_FULL_RELIABILITY: 4,

  // Risk & Recoverability classification thresholds
  THRESHOLDS: {
    HIGH_PROBABILITY: 0.75, // Risk: LOW, Decision: RETRY
    MEDIUM_PROBABILITY: 0.45, // Risk: MEDIUM, Decision: WAIT/REMIND
    RECOVERABLE_CUTOFF: 0.45, // >= 0.45 considered recoverable
  },

  // Payment method confidence additions
  PAYMENT_METHOD_CONFIDENCE: {
    UPI: 0.10,
    CREDIT_CARD: 0.10,
    DEBIT_CARD: 0.08,
    NET_BANKING: 0.08,
    WALLET: 0.05,
    DEFAULT: 0.02,
  } as Record<string, number>,
};
