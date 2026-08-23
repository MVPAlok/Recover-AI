export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type PaymentStatus =
  | 'UNKNOWN'
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';
export type TransactionRecoveryStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'RECOVERED'
  | 'NOT_RECOVERED'
  | 'CANCELLED'
  | 'REQUIRES_REVIEW';
export type RecoveryDecision = 'RETRY' | 'REMIND' | 'ESCALATE' | 'WAIT' | 'STOP';
export type RecoveryStatus = 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type WebhookProcessingStatus =
  | 'RECEIVED'
  | 'VERIFIED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTER';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type UserRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'SUPPORT' | 'VIEWER';

export interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  capturedAmount?: number | null;
  verified: boolean;
  reconciled: boolean;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  createdAt?: string;
}

export interface DashboardOverviewMetrics {
  revenueAtRisk: number;
  recoveredRevenue: number;
  failedPayments: number;
  recoverablePayments: number;
  recoveryRate: number;
  executionSuccessRate?: number;
  totalTransactions: number;
  successfulTransactions: number;
  environment?: string;
  gatewayProvider?: string;
  merchant: Merchant;
}

export interface RecoveryOpportunity {
  id: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  failureCode?: string | null;
  failureReason?: string | null;
  recoveryProbability: number;
  riskLevel: RiskLevel;
  decision: RecoveryDecision;
  recoveryStatus: TransactionRecoveryStatus | RecoveryStatus | 'READY';
  createdAt: string;
}

export interface TransactionSummary {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentStatus?: PaymentStatus;
  recoveryStatus?: TransactionRecoveryStatus;
  failureCode?: string | null;
  failureReason?: string | null;
  retryCount: number;
  recoveryProbability: number;
  riskLevel: RiskLevel;
  decision?: RecoveryDecision | null;
  createdAt: string;
}

export interface TransactionDetail {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentStatus?: PaymentStatus;
  recoveryStatus?: TransactionRecoveryStatus;
  paymentMethod?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  retryCount: number;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number;
  };
  detection?: {
    id: string;
    recoveryProbability: number;
    confidenceScore: number;
    riskLevel: RiskLevel;
    reasoning?: string | null;
    positiveFactors: string[];
    riskFactors: string[];
    createdAt: string;
  } | null;
  diagnosis?: {
    id: string;
    diagnosisCode?: string;
    failureCategory?: string;
    severity?: string;
    isLikelyTemporary?: boolean;
    confidence?: number;
    reasoning?: string | null;
    evidence: string[];
    modelName?: string;
    isFallback?: boolean;
    latencyMs?: number;
    createdAt: string;
  } | null;
  decision?: {
    id: string;
    decision: RecoveryDecision;
    recoveryProbability: number;
    confidenceScore: number;
    reasoning?: string | null;
    ruleTrail?: string[];
    createdAt: string;
  } | null;
  recoveryAttempts: Array<{
    id: string;
    attemptNumber: number;
    actionType: RecoveryDecision;
    status: RecoveryStatus;
    executionStatus?: RecoveryStatus;
    reason?: string | null;
    amountRecovered: number;
    scheduledAt?: string | null;
    executedAt?: string | null;
    createdAt: string;
  }>;
  payments?: PaymentItem[];
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    actor?: string | null;
    details?: Record<string, unknown> | null;
    createdAt: string;
  }>;
}

export interface RecoverySummary {
  id: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  actionType: RecoveryDecision;
  status: RecoveryStatus;
  executionStatus?: RecoveryStatus;
  recoveryStatus?: TransactionRecoveryStatus;
  reason?: string | null;
  amountRecovered: number;
  executedAt?: string | null;
  createdAt: string;
}

export interface FailureBreakdownItem {
  failureCode: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface DecisionBreakdownItem {
  decision: RecoveryDecision;
  count: number;
  percentage: number;
}

export interface RecoveryOutcomeItem {
  status: RecoveryStatus;
  count: number;
  amountRecovered: number;
}

export interface AnalyticsData {
  overview: {
    totalRevenueAtRisk: number;
    totalRecoveredRevenue: number;
    overallRecoveryRate: number;
    averageTransactionValue: number;
    successfulRecoveriesCount: number;
    failedRecoveriesCount: number;
  };
  failures: FailureBreakdownItem[];
  decisions: DecisionBreakdownItem[];
  outcomes: RecoveryOutcomeItem[];
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
  transaction?: {
    id: string;
    amount: number;
    status: TransactionStatus;
  } | null;
}

export interface RazorpayGatewayStatus {
  totalWebhooks: number;
  processedCount?: number;
  failedCount?: number;
  successRate?: number;
  lastWebhookAt: string | null;
  lastEventType: string | null;
  lastStatus?: string | null;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'not_configured' | 'test_mode' | 'unknown';
export type OverallHealthStatus = 'healthy' | 'degraded' | 'critical';

export interface ServiceHealthItem {
  status: HealthStatus;
  latencyMs?: number;
  message: string;
  details?: Record<string, unknown>;
  model?: string;
  fallbackActive?: boolean;
  fallbackRate?: number;
  mode?: string;
  keyPrefix?: string;
  lastProcessedAt?: string | null;
  lastEventId?: string | null;
  errorRate?: number;
  totalEvents24h?: number;
  queueDepth?: number;
  activeJobs?: number;
  waitingJobs?: number;
  failedJobs?: number;
  concurrency?: number;
}

export interface OperationalMetrics {
  lastWebhookSecondsAgo: number | null;
  queueDepth: number;
  failedJobs: number;
  aiFallbackRate: number;
  webhookErrorRate: number;
}

export interface SystemHealthData {
  success: boolean;
  status: OverallHealthStatus;
  environment: 'TEST_MODE' | 'PRODUCTION';
  timestamp: string;
  services: {
    postgresql: ServiceHealthItem;
    redis: ServiceHealthItem;
    gemini: ServiceHealthItem;
    razorpay: ServiceHealthItem;
    webhookWorker: ServiceHealthItem;
    recoveryWorker: ServiceHealthItem;
  };
  metrics: OperationalMetrics;
}
