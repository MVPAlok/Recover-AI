import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { fetchAnalytics } from '../services/api';
import { AnalyticsData } from '../types';
import { MetricCard, formatINR } from '../components/ui/MetricCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';

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
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Recovery Analytics & Intelligence</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Real-time failure categorization, AI decision efficacy, and recovered revenue breakdown.
        </p>
      </div>

      {/* Top Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Overall Recovery Rate"
          value={`${overview.overallRecoveryRate}%`}
          subtitle="Revenue Saved / Revenue at Risk"
          icon={TrendingUp}
          badge={{ text: 'Real Data', variant: 'emerald' }}
        />
        <MetricCard
          title="Total Recovered"
          value={formatINR(overview.totalRecoveredRevenue)}
          subtitle={`From ${overview.successfulRecoveriesCount} successful attempts`}
          icon={ShieldCheck}
          badge={{ text: 'PostgreSQL Sum', variant: 'indigo' }}
        />
        <MetricCard
          title="Avg Transaction Value"
          value={formatINR(overview.averageTransactionValue)}
          subtitle="Across all failed payments"
          icon={BarChart3}
        />
      </div>

      {/* 2-Column Analytics Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Failure Cause Distribution</h3>
              <p className="text-xs text-slate-400">Breakdown of gateway decline codes</p>
            </div>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="space-y-3 pt-2">
            {failures.map((item) => (
              <div key={item.failureCode} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300 font-mono">{item.failureCode}</span>
                  <span className="text-slate-400">
                    {item.count} orders ({item.percentage.toFixed(1)}%) • {formatINR(item.amount)}
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Decision Policy Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Policy Distribution</h3>
              <p className="text-xs text-slate-400">Approved recovery actions determined by Phase 5</p>
            </div>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-3 pt-2">
            {decisions.map((item) => {
              const colors: Record<string, string> = {
                RETRY: 'bg-emerald-500',
                REMIND: 'bg-indigo-500',
                ESCALATE: 'bg-purple-500',
                WAIT: 'bg-amber-500',
                STOP: 'bg-slate-600',
              };

              return (
                <div key={item.decision} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-200 font-bold">{item.decision}</span>
                    <span className="text-slate-400">
                      {item.count} decisions ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors[item.decision] || 'bg-indigo-500'}`}
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
