import { RecoveryDecision } from '@prisma/client';
import { DiagnosisCode, DiagnosisSeverity, RecommendedNextStep } from '../diagnosis/diagnosis.types.js';
import { FailureCategory, RiskLevel } from '../detection/detection.types.js';

export type BusinessPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DecisionDetectionInput {
  recoveryProbability: number;
  riskLevel: RiskLevel | string;
  recoverable: boolean;
  confidenceScore: number;
  factors?: string[];
  reasoningSummary?: string;
}

export interface DecisionDiagnosisInput {
  diagnosisCode: DiagnosisCode | string;
  failureCategory: FailureCategory | string;
  severity: DiagnosisSeverity | string;
  isLikelyTemporary: boolean;
  confidence: number;
  recommendedNextStep: RecommendedNextStep | string;
  evidence?: string[];
  reasoning?: string;
}

export interface DecisionTransactionInput {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  failureCode: string | null;
  failureReason: string | null;
  retryCount: number;
  createdAt: Date | string;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
}

export interface DecisionCustomerInput {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  failureRate: number;
  consecutiveFailures: number;
  lifetimeSpend: number;
  averageTransactionAmount: number;
  hasHistory: boolean;
}

export interface DecisionInput {
  transaction: DecisionTransactionInput;
  customer: DecisionCustomerInput;
  detection: DecisionDetectionInput | null;
  diagnosis: DecisionDiagnosisInput | null;
  llmAdvisory?: LLMDecisionRecommendation | null;
}

export interface DecisionResult {
  transactionId: string;
  merchantId: string;
  customerId: string;
  decision: RecoveryDecision;
  confidence: number;
  reason: string;
  rulesApplied: string[];
  blockedActions: RecoveryDecision[];
  businessPriority: BusinessPriority;
  detectionProbability: number;
  diagnosisConfidence: number;
  policyOverride: string | null;
  llmRecommendation: RecoveryDecision | null;
  evaluatedAt: string;
  modelName: string;
  promptVersion?: string;
}

export interface LLMDecisionRecommendation {
  recommendedAction: RecoveryDecision;
  confidence: number;
  reasoning: string;
  supportingFactors: string[];
}

export interface BatchDecisionSummary {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  retry: number;
  remind: number;
  escalate: number;
  wait: number;
  stop: number;
  policyOverrides: number;
  persistedDecisions: number;
  auditLogsCreated: number;
  revenueAtRisk: number;
  potentialRecoveryValue: number;
  durationMs: number;
  results?: Array<{
    transactionId: string;
    decision: RecoveryDecision;
    confidence: number;
    businessPriority: BusinessPriority;
    reason: string;
  }>;
  errors?: Array<{
    transactionId: string;
    error: string;
  }>;
}

export interface DecisionEvaluationItem {
  scenarioId: string;
  scenarioName: string;
  expectedDecision: RecoveryDecision;
  actualDecision: RecoveryDecision;
  confidence: number;
  businessPriority: BusinessPriority;
  pass: boolean;
  reason: string;
  rulesApplied: string[];
  policyOverride: string | null;
}

export interface DecisionEvaluationReport {
  timestamp: string;
  modelName: string;
  totalEvaluated: number;
  passed: number;
  failed: number;
  alignmentPercentage: number;
  results: DecisionEvaluationItem[];
}
