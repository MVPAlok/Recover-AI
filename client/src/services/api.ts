import {
  Merchant,
  DashboardOverviewMetrics,
  RecoveryOpportunity,
  TransactionSummary,
  TransactionDetail,
  RecoverySummary,
  AnalyticsData,
  AuditLogItem,
  RazorpayGatewayStatus,
  SystemHealthData,
} from '../types';

let currentMerchantId: string | null = localStorage.getItem('recoverai_active_merchant_id');

export interface OnboardingProfile {
  businessName: string;
  email: string;
  currency: string;
  gatewayKey?: string;
  policyProfile?: 'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE';
}

export function setOnboardingProfile(profile: OnboardingProfile | null) {
  if (profile) {
    sessionStorage.setItem('recoverai_onboarding_profile', JSON.stringify(profile));
  } else {
    sessionStorage.removeItem('recoverai_onboarding_profile');
  }
}

export function getOnboardingProfile(): OnboardingProfile | null {
  try {
    const raw = sessionStorage.getItem('recoverai_onboarding_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveMerchantId(merchantId: string | null) {
  currentMerchantId = merchantId;
  if (merchantId) {
    localStorage.setItem('recoverai_active_merchant_id', merchantId);
  } else {
    localStorage.removeItem('recoverai_active_merchant_id');
  }
}

export function clearSession() {
  currentMerchantId = null;
  localStorage.removeItem('recoverai_active_merchant_id');
  sessionStorage.removeItem('recoverai_onboarding_profile');
}

export function getActiveMerchantId(): string | null {
  return currentMerchantId;
}

export async function checkBackendHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchReadiness() {
  const res = await fetch('/api/ready');
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch('/api/metrics');
  const json = await res.json();
  return json.data;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (currentMerchantId) {
    headers['x-merchant-id'] = currentMerchantId;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok || json.success === false) {
    const errorMsg = json?.error?.message || json?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return json.data as T;
}

export async function fetchMerchants(): Promise<Merchant[]> {
  return request<Merchant[]>('/api/dashboard/merchants');
}

export async function fetchOverview(): Promise<DashboardOverviewMetrics> {
  return request<DashboardOverviewMetrics>('/api/dashboard/overview');
}

export async function fetchRecoveryOpportunities(limit: number = 6): Promise<RecoveryOpportunity[]> {
  return request<RecoveryOpportunity[]>(`/api/dashboard/recovery-opportunities?limit=${limit}`);
}

export async function fetchTransactions(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  recoveryStatus?: string;
  needsAttention?: boolean;
  decision?: string;
  risk?: string;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<{ items: TransactionSummary[]; total: number; page: number; limit: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus);
  if (params.recoveryStatus) searchParams.set('recoveryStatus', params.recoveryStatus);
  if (params.needsAttention) searchParams.set('needsAttention', 'true');
  if (params.decision) searchParams.set('decision', params.decision);
  if (params.risk) searchParams.set('risk', params.risk);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const res = await fetch(`/api/transactions?${searchParams.toString()}`, {
    headers: currentMerchantId ? { 'x-merchant-id': currentMerchantId } : {},
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json?.error?.message || 'Failed to fetch transactions');
  }

  return {
    items: json.data,
    total: json.meta.total,
    page: json.meta.page,
    limit: json.meta.limit,
    totalPages: json.meta.totalPages,
  };
}

export async function fetchTransactionDetail(id: string): Promise<TransactionDetail> {
  return request<TransactionDetail>(`/api/transactions/${id}`);
}

export async function executeRecoveryAttempt(transactionId: string, decisionId?: string, executionMode?: string) {
  return request<any>(`/api/recovery-executor/${transactionId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ decisionId, executionMode }),
  });
}

export async function triggerDecision(transactionId: string, includeLLMAdvisory = false) {
  return request<any>(`/api/recovery-decision/${transactionId}/decide`, {
    method: 'POST',
    body: JSON.stringify({ includeLLMAdvisory }),
  });
}

export async function triggerDiagnosis(transactionId: string) {
  return request<any>(`/api/diagnosis/${transactionId}/analyze`, {
    method: 'POST',
  });
}

export async function triggerDetection(transactionId: string) {
  return request<any>(`/api/detection/${transactionId}/analyze`, {
    method: 'POST',
  });
}

export async function enqueueRecoveryAttempt(transactionId: string, decisionId?: string, executionMode?: string) {
  return request(`/api/recovery-executor/${transactionId}/enqueue`, {
    method: 'POST',
    body: JSON.stringify({ decisionId, executionMode }),
  });
}

export async function fetchRecoveries(params: {
  page?: number;
  limit?: number;
  status?: string;
  actionType?: string;
  needsAttention?: boolean;
  search?: string;
} = {}): Promise<{ items: RecoverySummary[]; total: number; page: number; limit: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.actionType) searchParams.set('actionType', params.actionType);
  if (params.needsAttention) searchParams.set('needsAttention', 'true');
  if (params.search) searchParams.set('search', params.search);

  const res = await fetch(`/api/recoveries?${searchParams.toString()}`, {
    headers: currentMerchantId ? { 'x-merchant-id': currentMerchantId } : {},
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json?.error?.message || 'Failed to fetch recoveries');
  }

  return {
    items: json.data,
    total: json.meta.total,
    page: json.meta.page,
    limit: json.meta.limit,
    totalPages: json.meta.totalPages,
  };
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  return request<AnalyticsData>('/api/analytics/overview');
}

export async function fetchAuditLogs(params: {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  transactionId?: string;
} = {}): Promise<{ items: AuditLogItem[]; total: number; page: number; limit: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.entityType) searchParams.set('entityType', params.entityType);
  if (params.action) searchParams.set('action', params.action);
  if (params.transactionId) searchParams.set('transactionId', params.transactionId);

  const res = await fetch(`/api/audit-log?${searchParams.toString()}`, {
    headers: currentMerchantId ? { 'x-merchant-id': currentMerchantId } : {},
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json?.error?.message || 'Failed to fetch audit logs');
  }

  return {
    items: json.data,
    total: json.meta.total,
    page: json.meta.page,
    limit: json.meta.limit,
    totalPages: json.meta.totalPages,
  };
}

export async function fetchRazorpayGatewayStatus(): Promise<RazorpayGatewayStatus> {
  return request<RazorpayGatewayStatus>('/api/integrations/razorpay/status');
}

export async function fetchSystemHealth(): Promise<SystemHealthData> {
  const res = await fetch('/api/system/health', {
    headers: currentMerchantId ? { 'x-merchant-id': currentMerchantId } : {},
  });
  const json = await res.json();
  if (!res.ok && json.status === 'critical') {
    return json;
  }
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to fetch system health');
  }
  return json;
}
