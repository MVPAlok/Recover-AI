import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Sparkles,
} from 'lucide-react';
import { MetricCard, formatINR } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { fetchOverview, fetchRecoveryOpportunities, fetchRazorpayGatewayStatus } from '../services/api';
import { DashboardOverviewMetrics, RecoveryOpportunity, RazorpayGatewayStatus } from '../types';

export const OverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardOverviewMetrics | null>(null);
  const [opportunities, setOpportunities] = useState<RecoveryOpportunity[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<RazorpayGatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, oppsData, rzpData] = await Promise.all([
        fetchOverview(),
        fetchRecoveryOpportunities(6),
        fetchRazorpayGatewayStatus(),
      ]);
      setMetrics(overviewData);
      setOpportunities(oppsData);
      setGatewayStatus(rzpData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard overview';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner title="Dashboard Initialization Failed" message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* Top Welcome & Workflow Banner */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold tracking-wide">
              AUTONOMOUS RECOVERY AGENT
            </span>
            <span className="text-xs text-slate-400 font-mono">v1.0-prod</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Revenue Recovery Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            RecoverAI detects failed payment transactions, diagnoses root causes, and executes automated recovery policies via Razorpay Test Mode.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/transactions')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-600/20"
          >
            <Sparkles className="w-4 h-4" />
            Explore Transactions
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Primary KPI Hero Grid */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue at Risk"
          value={formatINR(metrics?.revenueAtRisk || 0)}
          subtitle="From failed transactions"
          icon={ShieldAlert}
          badge={{ text: `${metrics?.failedPayments || 0} Failures`, variant: 'rose' }}
        />

        <MetricCard
          title="Revenue Recovered"
          value={formatINR(metrics?.recoveredRevenue || 0)}
          subtitle="Saved by RecoverAI"
          icon={CheckCircle2}
          badge={{ text: 'Real PostgreSQL Sum', variant: 'emerald' }}
        />

        <MetricCard
          title="Recovery Rate"
          value={`${metrics?.recoveryRate || 0}%`}
          subtitle="Recovered / Revenue at Risk"
          icon={TrendingUp}
          trend={`${metrics?.recoverablePayments || 0} Recoverable`}
        />

        <MetricCard
          title="Failed Payments"
          value={metrics?.failedPayments || 0}
          subtitle={`Across ${metrics?.totalTransactions || 0} total transactions`}
          icon={AlertTriangle}
          badge={{ text: `${metrics?.successfulTransactions || 0} Successes`, variant: 'indigo' }}
        />
      </div>

      {/* ========================================================================= */}
      {/* Gateway & Pipeline Operational Status */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Razorpay Gateway Integration</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Operating in <span className="font-semibold text-amber-300">TEST MODE</span>. Webhook signature verification: HMAC SHA-256 (Timing-Safe).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-300 shrink-0">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Webhooks Ingested</span>
            <span className="font-bold text-slate-200">{gatewayStatus?.totalWebhooksProcessed || 0} Events</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Last Webhook</span>
            <span className="font-mono text-slate-300">
              {gatewayStatus?.lastWebhookAt
                ? new Date(gatewayStatus.lastWebhookAt).toLocaleTimeString()
                : 'Listening'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Section: Recovery Opportunities */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recovery Opportunities</h3>
            <p className="text-xs text-slate-400">
              Transactions identified by Phase 3 & 4 AI as high-probability recovery candidates.
            </p>
          </div>
          <button
            onClick={() => navigate('/transactions?status=FAILED')}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all failed transactions
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {opportunities.length === 0 ? (
          <EmptyState
            title="No Recovery Opportunities Found"
            description="All failed transactions have been processed or no pending high-probability failures exist."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                onClick={() => navigate(`/transactions/${opp.transactionId}`)}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Amount & Probability */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {formatINR(opp.amount)}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {opp.transactionId.slice(0, 16)}...
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-400 block">
                        {opp.recoveryProbability}%
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                        Recovery Likelihood
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="text-xs text-slate-300 mb-3 border-t border-slate-800/80 pt-3">
                    <div className="font-semibold text-slate-200">{opp.customerName}</div>
                    <div className="text-slate-400 text-[11px]">{opp.customerEmail}</div>
                  </div>

                  {/* Failure Cause */}
                  <div className="bg-slate-950/60 rounded-lg p-2.5 mb-4 border border-slate-800/60">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Failure Reason</div>
                    <div className="text-xs text-slate-300 font-medium truncate">
                      {opp.failureReason || opp.failureCode || 'Bank authorization timeout'}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Decision & Status */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Policy:</span>
                    <StatusBadge type="decision" value={opp.decision} />
                  </div>

                  <span className="text-[11px] font-semibold text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
