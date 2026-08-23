import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  RotateCw,
  Database,
  Server,
  Brain,
  ShieldCheck,
  Radio,
  Layers,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { fetchSystemHealth } from '../../services/api';
import { SystemHealthData, ServiceHealthItem, HealthStatus } from '../../types';
import { Skeleton } from './Skeleton';

interface SystemHealthCardProps {
  className?: string;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ className = '' }) => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const isFetchingRef = useRef(false);

  const loadHealth = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const data = await fetchSystemHealth();
      setHealth(data);
      setSecondsAgo(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to retrieve system health';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadHealth();

    // Increment "seconds ago" timer
    const timerInterval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    // Auto-refresh every 20 seconds
    const refreshInterval = setInterval(() => {
      loadHealth(false);
    }, 20000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(refreshInterval);
    };
  }, [loadHealth]);

  const renderStatusBadge = (status: HealthStatus, labelOverride?: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {labelOverride || 'Healthy'}
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            {labelOverride || 'Degraded'}
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3 text-rose-400" />
            {labelOverride || 'Unavailable'}
          </span>
        );
      case 'test_mode':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            {labelOverride || 'TEST MODE'}
          </span>
        );
      case 'not_configured':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            {labelOverride || 'Not Configured'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {labelOverride || 'Unknown'}
          </span>
        );
    }
  };

  const renderServiceRow = (
    name: string,
    icon: React.ReactNode,
    service?: ServiceHealthItem,
    extraBadge?: React.ReactNode,
    detailText?: string
  ) => {
    if (!service) return null;

    return (
      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors hover:border-slate-700/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200 truncate">{name}</span>
              {extraBadge}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {detailText || service.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {service.latencyMs !== undefined && service.latencyMs > 0 && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
              {service.latencyMs}ms
            </span>
          )}
          {renderStatusBadge(
            service.status,
            name === 'Razorpay' ? 'TEST MODE' : undefined
          )}
        </div>
      </div>
    );
  };

  if (loading && !health) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className={`bg-slate-900 border border-rose-900/50 rounded-xl p-5 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 text-sm font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            System Health Unavailable
          </div>
          <button
            onClick={() => loadHealth(true)}
            className="text-xs font-semibold px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Retry
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Unable to establish communication with the health monitoring subsystem.
        </p>
      </div>
    );
  }

  const s = health?.services;
  const m = health?.metrics;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            System Infrastructure Health
          </h2>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
              health?.status === 'healthy'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : health?.status === 'degraded'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {health?.status === 'healthy'
              ? 'OPERATIONAL'
              : health?.status === 'degraded'
              ? 'DEGRADED'
              : 'CRITICAL'}
          </span>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center text-xs text-slate-400">
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-slate-500" />
            {secondsAgo === 0 ? 'Updated just now' : `Updated ${secondsAgo}s ago`}
          </span>
          <button
            onClick={() => loadHealth(true)}
            disabled={refreshing}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh System Health"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Degraded Callout (if active) */}
      {health?.status === 'degraded' && (
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Degraded Telemetry Detected: </span>
            {s?.gemini.fallbackActive && 'Gemini fallback engine active. '}
            {s?.redis.status === 'degraded' && 'Redis queue running in degraded mode. '}
            {s?.webhookWorker.status === 'degraded' && `Webhook error rate at ${s.webhookWorker.errorRate}%. `}
            {s?.recoveryWorker.failedJobs !== undefined && s.recoveryWorker.failedJobs > 0 && `${s.recoveryWorker.failedJobs} recovery jobs in error queue.`}
          </div>
        </div>
      )}

      {/* Services Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {renderServiceRow(
          'PostgreSQL',
          <Database className="w-4 h-4 text-indigo-400" />,
          s?.postgresql,
          undefined,
          s?.postgresql.status === 'healthy'
            ? 'Source of financial truth connected'
            : s?.postgresql.message
        )}

        {renderServiceRow(
          'Redis Queue',
          <Server className="w-4 h-4 text-rose-400" />,
          s?.redis,
          undefined,
          s?.redis.status === 'healthy'
            ? 'Queue & cache broker active'
            : s?.redis.message
        )}

        {renderServiceRow(
          'Google Gemini',
          <Brain className="w-4 h-4 text-purple-400" />,
          s?.gemini,
          s?.gemini.fallbackActive ? (
            <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/60">
              Fallback
            </span>
          ) : undefined,
          s?.gemini.fallbackActive
            ? `Fallback active (${s.gemini.fallbackRate}% over 24h)`
            : `${s?.gemini.model || 'gemini-3.5-flash-lite'} active`
        )}

        {renderServiceRow(
          'Razorpay',
          <ShieldCheck className="w-4 h-4 text-cyan-400" />,
          s?.razorpay,
          undefined,
          'Test Mode Sandbox (Real money isolated)'
        )}

        {renderServiceRow(
          'Webhook Worker',
          <Radio className="w-4 h-4 text-emerald-400" />,
          s?.webhookWorker,
          undefined,
          s?.webhookWorker.totalEvents24h === 0
            ? 'No traffic in last 24h (Standing by)'
            : `${s?.webhookWorker.totalEvents24h} events processed (${s?.webhookWorker.errorRate}% err)`
        )}

        {renderServiceRow(
          'Recovery Worker',
          <Layers className="w-4 h-4 text-blue-400" />,
          s?.recoveryWorker,
          undefined,
          `Queue: ${s?.recoveryWorker.queueDepth ?? 0} | Failed: ${s?.recoveryWorker.failedJobs ?? 0}`
        )}
      </div>

      {/* Operational Metrics Sub-bar */}
      {m && (
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Webhook</span>
            <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block">
              {m.lastWebhookSecondsAgo !== null ? `${m.lastWebhookSecondsAgo}s ago` : 'None yet'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Queue Depth</span>
            <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block">
              {m.queueDepth}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Failed Jobs</span>
            <span
              className={`text-xs font-mono font-bold mt-0.5 block ${
                m.failedJobs > 0 ? 'text-rose-400' : 'text-slate-200'
              }`}
            >
              {m.failedJobs}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">AI Fallback</span>
            <span
              className={`text-xs font-mono font-bold mt-0.5 block ${
                m.aiFallbackRate > 0 ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {m.aiFallbackRate.toFixed(1)}%
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Webhook Errors</span>
            <span
              className={`text-xs font-mono font-bold mt-0.5 block ${
                m.webhookErrorRate > 0 ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {m.webhookErrorRate.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
