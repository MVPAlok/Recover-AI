import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { fetchRazorpayGatewayStatus, fetchOverview } from '../services/api';
import { RazorpayGatewayStatus, DashboardOverviewMetrics } from '../types';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export const SettingsPage: React.FC = () => {
  const [gatewayStatus, setGatewayStatus] = useState<RazorpayGatewayStatus | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [rzp, ov] = await Promise.all([fetchRazorpayGatewayStatus(), fetchOverview()]);
        setGatewayStatus(rzp);
        setOverview(ov);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load settings';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">System Settings & Gateway Status</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Configuration parameters, sandbox security isolation, and active merchant profiles.
        </p>
      </div>

      {/* Gateway Integration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Razorpay Gateway Integration</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold font-mono">
            {gatewayStatus?.mode || 'TEST MODE'}
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
          <div>Total Webhooks Processed: <span className="text-white">{gatewayStatus?.totalWebhooksProcessed} events</span></div>
          <div>Last Event: <span className="text-amber-400">{gatewayStatus?.lastEventType || 'None'}</span></div>
        </div>
      </div>

      {/* Merchant Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Merchant Profile & Scope</h3>
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
            <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Data Isolation Policy</span>
            <div className="text-emerald-400 font-semibold">Strict Multi-Tenant Row Isolation</div>
          </div>
        </div>
      </div>

      {/* Architecture & Pipeline Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 text-xs text-slate-400">
        <div className="flex items-center gap-2.5 mb-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pipeline Specifications</h3>
        </div>

        <p>
          RecoverAI integrates Phases 1 through 8: Synthetic Data Engine (1,000+ deterministic seed transactions), Detection Engine, Diagnosis Agent, Recovery Decision Policy Engine, Recovery Executor, Razorpay Test Mode Gateway Integration, and Redis Background Queues.
        </p>
      </div>
    </div>
  );
};
