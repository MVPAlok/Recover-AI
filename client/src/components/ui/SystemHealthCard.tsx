import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RotateCw,
  Database,
  Server,
  Brain,
  ShieldCheck,
  Radio,
  Layers,
  AlertTriangle,
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

    const timerInterval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    const refreshInterval = setInterval(() => {
      loadHealth(false);
    }, 20000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(refreshInterval);
    };
  }, [loadHealth]);

  const renderStatus = (status: HealthStatus, labelOverride?: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="text-secondary font-mono text-[10px] sm:text-xs font-bold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            {labelOverride || 'OPERATIONAL'}
          </span>
        );
      case 'degraded':
        return (
          <span className="text-tertiary font-mono text-[10px] sm:text-xs font-bold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
            {labelOverride || 'DEGRADED'}
          </span>
        );
      case 'unavailable':
        return (
          <span className="text-error font-mono text-[10px] sm:text-xs font-bold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-error" />
            {labelOverride || 'OFFLINE'}
          </span>
        );
      case 'test_mode':
        return (
          <span className="text-primary font-mono text-[10px] sm:text-xs font-bold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {labelOverride || 'TEST MODE'}
          </span>
        );
      default:
        return (
          <span className="text-on-surface-variant/70 font-mono text-[10px] sm:text-xs">
            {labelOverride || 'UNKNOWN'}
          </span>
        );
    }
  };

  const renderServiceRow = (
    name: string,
    icon: React.ReactNode,
    service?: ServiceHealthItem,
    detailText?: string
  ) => {
    if (!service) return null;

    return (
      <div className="flex justify-between items-center bg-surface/50 p-2.5 sm:p-3 rounded border border-white/5 font-mono text-xs hover:border-white/10 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-primary/70">{icon}</span>
          <span className="text-on-surface font-semibold truncate text-[11px] sm:text-xs">{name}</span>
          {service.latencyMs !== undefined && service.latencyMs > 0 && (
            <span className="text-[10px] text-on-surface-variant/70 hidden sm:inline">
              ({service.latencyMs}ms)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {detailText && <span className="text-[10px] text-on-surface-variant/60 hidden md:inline">{detailText}</span>}
          {renderStatus(service.status, name === 'Razorpay Gateway' ? 'TEST MODE' : undefined)}
        </div>
      </div>
    );
  };

  if (loading && !health) {
    return (
      <div className={`bg-surface-container-highest/40 border border-white/10 rounded-xl p-4 sm:p-6 backdrop-blur-md space-y-3 ${className}`}>
        <Skeleton className="h-5 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-10 rounded" />
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className={`bg-surface-container-highest/40 border border-error/30 rounded-xl p-4 sm:p-6 backdrop-blur-md space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-error text-xs font-bold font-mono tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            SYSTEM TELEMETRY UNAVAILABLE
          </div>
          <button
            onClick={() => loadHealth(true)}
            className="text-xs font-mono px-3 py-1 rounded bg-surface/50 text-on-surface border border-white/10 hover:border-primary/40 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const s = health?.services;
  const m = health?.metrics;

  return (
    <div className={`bg-surface-container-highest/40 border border-white/10 rounded-xl p-4 sm:p-6 backdrop-blur-md space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs sm:text-sm text-primary tracking-wider uppercase font-bold">
            SYSTEM TELEMETRY
          </span>
          <span className="font-mono text-[10px] text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20 font-bold">
            {health?.status === 'healthy' ? 'OPERATIONAL' : 'DEGRADED'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-on-surface-variant/70">
          <span className="flex items-center gap-1.5 text-[10px]">
            <Clock className="w-3 h-3 text-on-surface-variant/60" />
            {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
          </span>
          <button
            onClick={() => loadHealth(true)}
            disabled={refreshing}
            className="p-1 rounded bg-surface/50 text-on-surface border border-white/10 hover:border-primary/40 transition-all disabled:opacity-50"
            title="Refresh System Health"
          >
            <RotateCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Services Breakdown Grid */}
      <div className="space-y-2">
        {renderServiceRow(
          'PostgreSQL (Primary)',
          <Database className="w-3.5 h-3.5" />,
          s?.postgresql,
          'Financial Ledger'
        )}

        {renderServiceRow(
          'Redis Cache & Queue',
          <Server className="w-3.5 h-3.5" />,
          s?.redis,
          'Upstash'
        )}

        {renderServiceRow(
          'Google Gemini LLM',
          <Brain className="w-3.5 h-3.5" />,
          s?.gemini,
          s?.gemini.fallbackActive ? 'Fallback Active' : 'gemini-3.5-flash-lite'
        )}

        {renderServiceRow(
          'Razorpay Gateway',
          <ShieldCheck className="w-3.5 h-3.5" />,
          s?.razorpay,
          'Test Mode Sandbox'
        )}

        {renderServiceRow(
          'Webhook Workers',
          <Radio className="w-3.5 h-3.5" />,
          s?.webhookWorker,
          s?.webhookWorker.totalEvents24h ? `${s.webhookWorker.totalEvents24h} events` : 'Standing by'
        )}

        {renderServiceRow(
          'Recovery Workers',
          <Layers className="w-3.5 h-3.5" />,
          s?.recoveryWorker,
          `Queue: ${s?.recoveryWorker.queueDepth ?? 0}`
        )}
      </div>

      {/* Operational Metrics Sub-bar */}
      {m && (
        <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
          <div className="p-2 rounded bg-surface/40 border border-white/5">
            <span className="text-[9px] uppercase text-on-surface-variant/70 block">Last Webhook</span>
            <span className="text-xs font-bold text-on-surface mt-0.5 block">
              {m.lastWebhookSecondsAgo !== null ? `${m.lastWebhookSecondsAgo}s ago` : 'None'}
            </span>
          </div>

          <div className="p-2 rounded bg-surface/40 border border-white/5">
            <span className="text-[9px] uppercase text-on-surface-variant/70 block">Queue Depth</span>
            <span className="text-xs font-bold text-on-surface mt-0.5 block">
              {m.queueDepth}
            </span>
          </div>

          <div className="p-2 rounded bg-surface/40 border border-white/5">
            <span className="text-[9px] uppercase text-on-surface-variant/70 block">AI Fallback</span>
            <span className="text-xs font-bold text-secondary mt-0.5 block">
              {m.aiFallbackRate.toFixed(1)}%
            </span>
          </div>

          <div className="p-2 rounded bg-surface/40 border border-white/5">
            <span className="text-[9px] uppercase text-on-surface-variant/70 block">Webhook Errors</span>
            <span className="text-xs font-bold text-secondary mt-0.5 block">
              {m.webhookErrorRate.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
