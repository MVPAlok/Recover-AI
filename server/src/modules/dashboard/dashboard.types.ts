import { TransactionStatus, RecoveryDecision, RecoveryStatus } from '@prisma/client';

export interface DashboardOverviewMetrics {
  revenueAtRisk: number;
  recoveredRevenue: number;
  failedPayments: number;
  recoverablePayments: number;
  recoveryRate: number; // percentage (0 - 100)
  totalTransactions: number;
  successfulTransactions: number;
  merchant: {
    id: string;
    name: string;
    email: string;
  };
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
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  decision: RecoveryDecision;
  recoveryStatus: RecoveryStatus | 'READY';
  createdAt: string;
}

export interface TransactionFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TransactionStatus;
  decision?: RecoveryDecision;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
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
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
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

export interface RecoveryFilterParams {
  page?: number;
  limit?: number;
  status?: RecoveryStatus;
  actionType?: RecoveryDecision;
  search?: string;
}

export interface AnalyticsOverview {
  totalRevenueAtRisk: number;
  totalRecoveredRevenue: number;
  overallRecoveryRate: number;
  averageTransactionValue: number;
  successfulRecoveriesCount: number;
  failedRecoveriesCount: number;
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

export interface RazorpayGatewayStatus {
  mode: 'TEST MODE';
  isLive: false;
  apiConnected: boolean;
  webhookHealthy: boolean;
  lastWebhookAt?: string | null;
  lastEventType?: string | null;
  totalWebhooksProcessed: number;
}
