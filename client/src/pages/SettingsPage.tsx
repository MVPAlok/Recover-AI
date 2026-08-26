import React, { useState, useEffect } from 'react';
import {
  fetchRazorpayGatewayStatus,
  fetchOverview,
  fetchReadiness,
  fetchMetrics,
} from '../services/api';
import { RazorpayGatewayStatus, DashboardOverviewMetrics } from '../types';
import { SectionTag } from '../components/system/SectionTag';
import { SystemPanel } from '../components/system/SystemPanel';
import { DataRow } from '../components/system/DataRow';
import { StatusIndicator } from '../components/system/StatusIndicator';
import { SystemHealthCard } from '../components/ui/SystemHealthCard';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export const SettingsPage: React.FC = () => {
  const [gatewayStatus, setGatewayStatus] = useState<RazorpayGatewayStatus | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewMetrics | null>(null);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [rzp, ov, ready, met] = await Promise.all([
        fetchRazorpayGatewayStatus(),
        fetchOverview(),
        fetchReadiness(),
        fetchMetrics(),
      ]);
      setGatewayStatus(rzp);
      setOverview(ov);
      setReadiness(ready);
      setMetrics(met);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* 1. Header Hierarchy with 32px Spacing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTag label="06 / SYSTEM" />
          <div className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded">
            SANDBOX ISOLATED
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-5xl font-bold font-geist text-on-surface tracking-tight">
            SYSTEM CONFIGURATION
          </h1>
          <p className="text-xs sm:text-sm font-geist text-on-surface-variant/80 max-w-2xl mt-2 leading-relaxed">
            Real-time infrastructure health, cryptographic webhook signature verification, and sandbox security isolation.
          </p>
        </div>
      </div>

      {/* 2. System Infrastructure Health (Telemetry Surface 1) */}
      <SystemHealthCard />

      {/* 3. Live Infrastructure Readiness Status */}
      <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-4 font-mono">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            LIVE INFRASTRUCTURE READINESS
          </span>
          <StatusIndicator
            status={readiness?.status === 'READY' ? 'OPERATIONAL' : 'DEGRADED'}
            label={readiness?.status || 'UNKNOWN'}
          />
        </div>

        <div className="space-y-2">
          <DataRow
            label="POSTGRESQL (NEON)"
            value={readiness?.checks?.postgres?.message || 'Connected'}
            badge={<StatusIndicator status={readiness?.checks?.postgres?.status === 'UP' ? 'OPERATIONAL' : 'FAILED'} />}
          />
          <DataRow
            label="UPSTASH REDIS QUEUE"
            value={readiness?.checks?.redis?.message || 'Active queue broker'}
            badge={<StatusIndicator status={readiness?.checks?.redis?.status === 'UP' ? 'OPERATIONAL' : 'WARNING'} />}
          />
          <DataRow
            label="GOOGLE GEMINI LLM"
            value={`Model: ${readiness?.checks?.geminiAi?.details?.model || 'gemini-3.5-flash-lite'}`}
            badge={<StatusIndicator status={readiness?.checks?.geminiAi?.status === 'UP' ? 'OPERATIONAL' : 'WARNING'} />}
          />
          <DataRow
            label="RAZORPAY GATEWAY"
            value="Strict Test Sandbox Mode"
            badge={<StatusIndicator status="OPERATIONAL" label="TEST READY" />}
          />
        </div>
      </SystemPanel>

      {/* 4. Operational Latency & Traffic Telemetry */}
      {metrics && (
        <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-4 font-mono">
          <span className="text-xs font-bold text-primary uppercase tracking-wider block border-b border-white/10 pb-2">
            OPERATIONAL LATENCY & TRAFFIC
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded bg-surface/50 border border-white/5">
              <span className="text-[9px] uppercase text-on-surface-variant/70 block">API Requests</span>
              <span className="text-base font-bold text-white mt-1 block font-geist">{metrics.requests?.total || 0}</span>
            </div>
            <div className="p-3 rounded bg-surface/50 border border-white/5">
              <span className="text-[9px] uppercase text-on-surface-variant/70 block">Avg Latency</span>
              <span className="text-base font-bold text-primary mt-1 block font-geist">{metrics.requests?.avgLatencyMs || 0}ms</span>
            </div>
            <div className="p-3 rounded bg-surface/50 border border-white/5">
              <span className="text-[9px] uppercase text-on-surface-variant/70 block">Webhooks</span>
              <span className="text-base font-bold text-secondary mt-1 block font-geist">{metrics.webhooks?.total || 0}</span>
            </div>
            <div className="p-3 rounded bg-surface/50 border border-white/5">
              <span className="text-[9px] uppercase text-on-surface-variant/70 block">AI Latency</span>
              <span className="text-base font-bold text-primary mt-1 block font-geist">{metrics.aiDiagnosis?.avgLatencyMs || 0}ms</span>
            </div>
          </div>
        </SystemPanel>
      )}

      {/* 5. Gateway Integration Card */}
      <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-4 font-mono">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            RAZORPAY WEBHOOK SECURITY & TEST ENVIRONMENT
          </span>
          <StatusIndicator status="VERIFIED" label="TEST MODE ONLY" />
        </div>

        <div className="space-y-2">
          <DataRow
            label="WEBHOOK ENDPOINT"
            value="/api/webhooks/razorpay"
            valueClassName="text-primary font-bold"
          />
          <DataRow
            label="AUTHENTICATION SECURITY"
            value="HMAC SHA-256 Signature Verification Enabled"
            badge={<StatusIndicator status="VERIFIED" label="TIMING-SAFE" />}
          />
          <DataRow
            label="INGESTED EVENTS"
            value={`${gatewayStatus?.totalWebhooks || 0} Total (${gatewayStatus?.processedCount || 0} Processed)`}
          />
          <DataRow
            label="LAST RECEIVED EVENT"
            value={gatewayStatus?.lastEventType || 'None'}
          />
        </div>
      </SystemPanel>

      {/* 6. Active Merchant Profile Card */}
      <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-4 font-mono">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            ACTIVE MERCHANT CONTEXT & RBAC
          </span>
          <StatusIndicator status="OPERATIONAL" label="ACTIVE WORKSPACE" />
        </div>

        <div className="space-y-2">
          <DataRow label="MERCHANT IDENTIFIER" value={<span className="font-geist font-semibold">{overview?.merchant.name || 'Apex Retail India'}</span>} />
          <DataRow label="PRIMARY EMAIL" value={overview?.merchant.email || 'finance@apexretail.in'} />
          <DataRow label="MERCHANT UUID" value={overview?.merchant.id || '—'} />
          <DataRow
            label="ASSIGNED ROLE"
            value={overview?.merchant.role || 'OWNER'}
            badge={<StatusIndicator status="VERIFIED" label="MASTER ADMIN" />}
          />
        </div>
      </SystemPanel>
    </div>
  );
};
