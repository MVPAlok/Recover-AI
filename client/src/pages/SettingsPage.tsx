import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Database,
  Cpu,
  Server,
  Activity,
  RotateCw,
  BarChart2,
} from 'lucide-react';
import { fetchRazorpayGatewayStatus, fetchOverview, fetchReadiness, fetchMetrics } from '../services/api';
import { RazorpayGatewayStatus, DashboardOverviewMetrics } from '../types';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export const SettingsPage: React.FC = () => {
  const [gatewayStatus, setGatewayStatus] = useState<RazorpayGatewayStatus | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewMetrics | null>(null);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setRefreshing(true);
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
      setRefreshing(false);
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            System Settings & Observability
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time infrastructure health, sandbox security isolation, and active merchant profiles.
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition-colors"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Health
        </button>
      </div>

      {/* Live Infrastructure Readiness Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Infrastructure Readiness
            </h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
              readiness?.status === 'READY'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {readiness?.status || 'UNKNOWN'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* PostgreSQL */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Database className="w-4 h-4 text-indigo-400" />
                PostgreSQL (Neon)
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  readiness?.checks?.postgres?.status === 'UP'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {readiness?.checks?.postgres?.status || 'DOWN'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{readiness?.checks?.postgres?.message}</p>
            {readiness?.checks?.postgres?.latencyMs && (
              <span className="text-[10px] font-mono text-slate-500">
                Latency: {readiness.checks.postgres.latencyMs}ms
              </span>
            )}
          </div>

          {/* Redis */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Server className="w-4 h-4 text-purple-400" />
                Upstash Redis Queue
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  readiness?.checks?.redis?.status === 'UP'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {readiness?.checks?.redis?.status || 'DISABLED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{readiness?.checks?.redis?.message}</p>
            {readiness?.checks?.redis?.latencyMs && (
              <span className="text-[10px] font-mono text-slate-500">
                Latency: {readiness.checks.redis.latencyMs}ms
              </span>
            )}
          </div>

          {/* Google Gemini */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Google Gemini LLM
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  readiness?.checks?.geminiAi?.status === 'UP'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {readiness?.checks?.geminiAi?.status || 'FALLBACK'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{readiness?.checks?.geminiAi?.message}</p>
            <span className="text-[10px] font-mono text-slate-500">
              Model: {readiness?.checks?.geminiAi?.details?.model || 'gemini-3.5-flash-lite'}
            </span>
          </div>

          {/* Razorpay Test */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Zap className="w-4 h-4 text-amber-400" />
                Razorpay Sandbox
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  readiness?.checks?.razorpayTest?.status === 'UP'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {readiness?.checks?.razorpayTest?.status || 'CONFIGURED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{readiness?.checks?.razorpayTest?.message}</p>
            <span className="text-[10px] font-mono text-amber-300">
              Mode: STRICT TEST MODE ONLY
            </span>
          </div>
        </div>
      </div>

      {/* Operational Metrics Summary */}
      {metrics && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Operational Telemetry
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">API Requests</span>
              <span className="text-base font-bold text-white">{metrics.requests?.total || 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Avg Latency</span>
              <span className="text-base font-bold text-indigo-400">{metrics.requests?.avgLatencyMs || 0}ms</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Webhooks Ingested</span>
              <span className="text-base font-bold text-emerald-400">{metrics.webhooks?.total || 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">AI Latency</span>
              <span className="text-base font-bold text-purple-400">{metrics.aiDiagnosis?.avgLatencyMs || 0}ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Integration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Razorpay Webhook Listener
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold font-mono">
            TEST MODE
          </span>
        </div>

        <p className="text-xs text-slate-400">
          RecoverAI is strictly coupled with Razorpay Test Mode (<code className="text-slate-300">rzp_test_...</code>). Live payments, production capture, and live cards are strictly prohibited and fail closed.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">API Authentication</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Test Mode Key Configured
            </div>
            <span className="text-[11px] text-slate-400">Credentials kept securely server-side</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Webhook Security</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              HMAC SHA-256 Verified
            </div>
            <span className="text-[11px] text-slate-400">Timing-safe signature verification enabled</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1 text-slate-300 font-mono">
          <div>Webhook Endpoint: <span className="text-indigo-400 font-sans">/api/webhooks/razorpay</span></div>
          <div>Total Webhooks: <span className="text-white">{gatewayStatus?.totalWebhooks || 0} events</span></div>
          <div>Processed: <span className="text-emerald-400">{gatewayStatus?.processedCount || 0} events</span></div>
          <div>Last Event: <span className="text-amber-400">{gatewayStatus?.lastEventType || 'None'}</span></div>
        </div>
      </div>

      {/* Merchant Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Merchant Profile & Scope
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Merchant Name</span>
            <div className="text-sm font-bold text-white">{overview?.merchant.name}</div>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Merchant Email</span>
            <div className="text-slate-300 font-mono">{overview?.merchant.email}</div>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Merchant UUID</span>
            <div className="text-slate-400 font-mono text-[11px]">{overview?.merchant.id}</div>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Role / Access Level</span>
            <div className="text-emerald-400 font-semibold">{overview?.merchant.role || 'ADMIN'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
