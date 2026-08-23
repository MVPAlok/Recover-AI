export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type RecoveryDecision = 'RETRY' | 'REMIND' | 'ESCALATE' | 'WAIT' | 'STOP';
export type RecoveryStatus = 'PENDING' | 'EXECUTED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface DashboardOverviewMetrics {
  revenueAtRisk: number;
  recoveredRevenue: number;
  failedPayments: number;
  recoverablePayments: number;
  recoveryRate: number;
  totalTransactions: number;
  successfulTransactions: number;
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
  recoveryStatus: RecoveryStatus | 'READY';
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
  failureCode?: string | null;
  failureReason?: string | null;
  retryCount: number;
  recoveryProbability: number;
  riskLevel: RiskLevel;
  decision?: RecoveryDecision | null;
  recoveryStatus?: RecoveryStatus | null;
  createdAt: string;
}

export interface TransactionDetail {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
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
    reason?: string | null;
    amountRecovered: number;
    scheduledAt?: string | null;
    executedAt?: string | null;
    createdAt: string;
  }>;
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
  reason?: string | null;
  amountRecovered: number;
  attemptNumber: number;
  decisionProbability?: number | null;
  scheduledAt?: string | null;
  executedAt?: string | null;
  createdAt: string;
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
  failures: Array<{
    failureCode: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  decisions: Array<{
    decision: RecoveryDecision;
    count: number;
    percentage: number;
  }>;
  outcomes: Array<{
    status: RecoveryStatus;
    count: number;
    amountRecovered: number;
  }>;
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
  mode: 'TEST MODE';
  isLive: false;
  apiConnected: boolean;
  webhookHealthy: boolean;
  lastWebhookAt?: string | null;
  lastEventType?: string | null;
  totalWebhooksProcessed: number;
}
