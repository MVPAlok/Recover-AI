import React, { useState, useEffect } from 'react';
import { fetchAnalytics } from '../services/api';
import { AnalyticsData } from '../types';
import { SectionTag } from '../components/system/SectionTag';
import { SystemPanel } from '../components/system/SystemPanel';
import { StatusIndicator } from '../components/system/StatusIndicator';
import { CardSkeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { formatINR } from '../components/ui/MetricCard';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAnalytics();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorBanner message={error || 'Failed to load analytics data'} onRetry={loadAnalytics} />;
  }

  const { overview, failures, decisions } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Hierarchy with 32px Spacing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTag label="04 / INTELLIGENCE" />
          <div className="text-xs font-mono text-on-surface-variant/70 bg-surface/50 border border-white/10 px-3 py-1.5 rounded">
            SCOPE: <span className="text-white font-bold">ALL HISTORICAL SESSIONS</span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-5xl font-bold font-geist text-on-surface tracking-tight">
            RECOVERY ANALYTICS
          </h1>
          <p className="text-xs sm:text-sm font-geist text-on-surface-variant/80 max-w-2xl mt-2 leading-relaxed">
            Quantitative analysis of payment failure codes, AI policy distribution, and verified recovery efficiency.
          </p>
        </div>
      </div>

      {/* 2. Top Quantitative KPIs Panel (Surface 1) */}
      <SystemPanel borderVariant="primary" className="p-6 sm:p-8 font-mono">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs text-on-surface-variant/70 uppercase">OVERALL RECOVERY RATE</span>
            <div className="text-3xl sm:text-4xl font-bold font-geist text-primary tracking-tight">
              {overview.overallRecoveryRate}%
            </div>
            <div className="text-[10px] text-secondary flex items-center gap-1 pt-0.5">
              <span>●</span> Revenue Saved / Revenue at Risk
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs text-on-surface-variant/70 uppercase">TOTAL VERIFIED RECOVERY</span>
            <div className="text-3xl sm:text-4xl font-bold font-geist text-secondary tracking-tight">
              {formatINR(overview.totalRecoveredRevenue)}
            </div>
            <div className="text-[10px] text-on-surface-variant/70 pt-0.5">
              {overview.successfulRecoveriesCount} successful attempts reconciled
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs text-on-surface-variant/70 uppercase">AVG TRANSACTION VALUE</span>
            <div className="text-3xl sm:text-4xl font-bold font-geist text-white tracking-tight">
              {formatINR(overview.averageTransactionValue)}
            </div>
            <div className="text-[10px] text-on-surface-variant/70 pt-0.5">
              Across all ingested payment failures
            </div>
          </div>
        </div>
      </SystemPanel>

      {/* 3. 2-Column Structured Visualization Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-mono">
        {/* Failure Cause Breakdown */}
        <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                FAILURE CAUSE DECOMPOSITION
              </span>
              <p className="text-[11px] font-geist text-on-surface-variant/70 mt-0.5">
                Frequency and financial volume by gateway decline reason
              </p>
            </div>
            <span className="text-[10px] text-on-surface-variant/60">
              {failures.length} Categories
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {failures.map((item) => (
              <div key={item.failureCode} className="space-y-1.5 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-white text-[11px]">{item.failureCode}</span>
                  <span className="text-on-surface-variant/70 text-[10px]">
                    {item.count} orders ({item.percentage.toFixed(1)}%) • <strong className="text-secondary">{formatINR(item.amount)}</strong>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface/50 overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.max(4, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SystemPanel>

        {/* AI Decision Policy Distribution */}
        <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                AI POLICY DISTRIBUTION
              </span>
              <p className="text-[11px] font-geist text-on-surface-variant/70 mt-0.5">
                Recovery actions formulated by deterministic safety engine
              </p>
            </div>
            <StatusIndicator status="OPERATIONAL" label="DETERMINISTIC" />
          </div>

          <div className="space-y-4 pt-1">
            {decisions.map((item) => {
              const color =
                item.decision === 'RETRY'
                  ? 'bg-secondary'
                  : item.decision === 'REMIND'
                  ? 'bg-primary'
                  : item.decision === 'WAIT'
                  ? 'bg-tertiary'
                  : 'bg-error';

              return (
                <div key={item.decision} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-white font-bold text-[11px]">{item.decision}</span>
                    <span className="text-on-surface-variant/70 text-[10px]">
                      {item.count} decisions ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface/50 overflow-hidden border border-white/5">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SystemPanel>
      </div>
    </div>
  );
};
