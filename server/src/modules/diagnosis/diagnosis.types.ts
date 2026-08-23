import { RecoveryDecision } from '@prisma/client';
import { FailureCategory } from '../detection/detection.types.js';

export type DiagnosisCode =
  | 'TEMPORARY_BANK_FAILURE'
  | 'TEMPORARY_GATEWAY_FAILURE'
  | 'NETWORK_FAILURE'
  | 'UPI_PROCESSING_FAILURE'
  | 'CUSTOMER_AUTHENTICATION_FAILURE'
  | 'INSUFFICIENT_FUNDS'
  | 'CARD_DECLINED'
  | 'EXPIRED_PAYMENT_INSTRUMENT'
  | 'UNKNOWN_PAYMENT_FAILURE';

export type DiagnosisSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type RecommendedNextStep =
  | 'EVALUATE_RETRY'
  | 'EVALUATE_REMINDER'
  | 'EVALUATE_ESCALATION'
  | 'WAIT_FOR_RETRY_WINDOW'
  | 'NO_RECOVERY_RECOMMENDED'
  | 'NEEDS_MORE_INFORMATION';

export interface DiagnosisResult {
  transactionId: string;
  merchantId: string;
  customerId: string;
  diagnosisCode: DiagnosisCode;
  failureCategory: FailureCategory;
  confidence: number;
  severity: DiagnosisSeverity;
  isLikelyTemporary: boolean;
  evidence: string[];
  reasoning: string;
  recommendedNextStep: RecommendedNextStep;
  preliminaryRecoveryDecision: RecoveryDecision;
  diagnosedAt: string;
  modelName: string;
  promptVersion: string;
  isFallback?: boolean;
  latencyMs?: number;
}

export interface SanitizedTransactionContext {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  failureCode: string | null;
  failureReason: string | null;
  retryCount: number;
  createdAt: string;
}

export interface SanitizedCustomerContext {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  consecutiveFailures: number;
  averageTransactionAmount: number;
  lifetimeSpend: number;
  hasHistory: boolean;
}

export interface SanitizedDetectionContext {
  recoveryProbability: number;
  riskLevel: string;
  recoverable: boolean;
  factors: string[];
  reasoningSummary: string;
}

export interface DiagnosisContext {
  transaction: SanitizedTransactionContext;
  customerHistory: SanitizedCustomerContext;
  detection: SanitizedDetectionContext | null;
}

export interface BatchDiagnosisSummary {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  lowSeverity: number;
  mediumSeverity: number;
  highSeverity: number;
  persistedDecisions: number;
  durationMs: number;
  results?: Array<{
    transactionId: string;
    diagnosisCode: DiagnosisCode;
    failureCategory: FailureCategory;
    confidence: number;
    severity: DiagnosisSeverity;
    recommendedNextStep: RecommendedNextStep;
  }>;
  errors?: Array<{
    transactionId: string;
    error: string;
  }>;
}

export interface DiagnosisEvaluationItem {
  scenarioId: string;
  scenarioName: string;
  expectedDiagnosisCode: DiagnosisCode | string;
  actualDiagnosisCode: DiagnosisCode;
  expectedCategory: FailureCategory;
  actualCategory: FailureCategory;
  expectedNextStep: RecommendedNextStep | string;
  actualNextStep: RecommendedNextStep;
  confidence: number;
  pass: boolean;
  reasoning: string;
}

export interface DiagnosisEvaluationReport {
  timestamp: string;
  modelName: string;
  totalEvaluated: number;
  passed: number;
  failed: number;
  alignmentPercentage: number;
  results: DiagnosisEvaluationItem[];
}
