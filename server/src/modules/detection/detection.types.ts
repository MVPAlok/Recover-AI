import { RecoveryDecision } from '@prisma/client';

export type FailureCategory =
  | 'TEMPORARY_INFRASTRUCTURE'
  | 'CUSTOMER_AUTHENTICATION'
  | 'FINANCIAL_HARD'
  | 'INSTRUMENT_EXPIRATION'
  | 'UNKNOWN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DetectionFactor {
  factor: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description: string;
  scoreContribution: number;
}

export interface TransactionFeatures {
  amount: number;
  currency: string;
  paymentMethod: string | null;
  failureCode: string | null;
  failureReason: string | null;
  retryCount: number;
  transactionAgeHours: number;
}

export interface CustomerHistoryFeatures {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  failureRate: number;
  consecutiveFailures: number;
  averageTransactionAmount: number;
  historicalSpend: number;
  hasHistory: boolean;
}

export interface DetectionFeatures extends TransactionFeatures, CustomerHistoryFeatures {
  failureCategory: FailureCategory;
}

export interface ScoringBreakdown {
  baseScore: number;
  customerReliabilityModifier: number;
  failureCategoryModifier: number;
  retryModifier: number;
  paymentMethodModifier: number;
  consecutiveFailureModifier: number;
  amountContextModifier: number;
  rawScore: number;
  finalProbability: number;
}

export interface DetectionResult {
  transactionId: string;
  merchantId: string;
  customerId: string;
  recoverable: boolean;
  recoveryProbability: number;
  confidenceScore: number;
  riskLevel: RiskLevel;
  recommendedDecision: RecoveryDecision;
  features: DetectionFeatures;
  factors: DetectionFactor[];
  reasoningSummary: string;
  scoredAt: string;
  modelName: string;
}

export interface BatchDetectionSummary {
  success: boolean;
  processed: number;
  recoverable: number;
  notRecoverable: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  persistedDecisions: number;
  durationMs: number;
  results?: Array<{
    transactionId: string;
    recoveryProbability: number;
    riskLevel: RiskLevel;
    recoverable: boolean;
    decision: RecoveryDecision;
  }>;
}

export interface ScenarioEvaluationItem {
  scenarioId: string;
  scenarioName: string;
  expectedRiskLevel: RiskLevel | string;
  actualRiskLevel: RiskLevel;
  expectedRecoverable: boolean;
  actualRecoverable: boolean;
  recoveryProbability: number;
  confidenceScore: number;
  recommendedDecision: RecoveryDecision;
  pass: boolean;
  reasoning: string;
}

export interface EvaluationReport {
  timestamp: string;
  modelName: string;
  totalScenariosEvaluated: number;
  passedScenarios: number;
  failedScenarios: number;
  alignmentRatePercentage: number;
  scenarioResults: ScenarioEvaluationItem[];
}
