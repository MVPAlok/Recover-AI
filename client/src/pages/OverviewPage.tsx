import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Zap,
  Sparkles,
  RotateCw,
  Activity,
} from 'lucide-react';
import { MetricCard, formatINR } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { SystemHealthCard } from '../components/ui/SystemHealthCard';
import { fetchOverview, fetchRecoveryOpportunities, fetchRazorpayGatewayStatus } from '../services/api';
import { DashboardOverviewMetrics, RecoveryOpportunity, RazorpayGatewayStatus } from '../types';

export const OverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardOverviewMetrics | null>(null);
  const [opportunities, setOpportunities] = useState<RecoveryOpportunity[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<RazorpayGatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
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
      setSecondsAgo(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard overview';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
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
      {/* Top Welcome & Workflow Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold tracking-wide">
              AUTONOMOUS RECOVERY AGENT
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold tracking-wide">
              TEST MODE (SANDBOX)
            </span>
            <span className="text-xs text-slate-400 font-mono">v1.0-hardened</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Revenue Recovery Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            RecoverAI detects failed payments, diagnoses root causes via Google Gemini, and executes automated recovery policies strictly in Razorpay Test Mode.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Updated {secondsAgo}s ago</span>
          </button>

          <button
            onClick={() => navigate('/transactions')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-600/20"
          >
            <Sparkles className="w-4 h-4" />
            Explore Transactions
          </button>
        </div>
      </div>

      {/* Primary KPI Hero Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue at Risk"
          value={formatINR(metrics?.revenueAtRisk || 0)}
          subtitle="From failed transactions"
          icon={ShieldAlert}
          badge={{ text: `${metrics?.failedPayments || 0} Failures`, variant: 'rose' }}
        />

        <MetricCard
          title="Verified Test Recovery"
          value={formatINR(metrics?.recoveredRevenue || 0)}
          subtitle="Confirmed via Webhook"
          icon={CheckCircle2}
          badge={{ text: 'PostgreSQL Ledger', variant: 'emerald' }}
        />

        <MetricCard
          title="Recovery Rate"
          value={`${metrics?.recoveryRate || 0}%`}
          subtitle="Recovered / Revenue at Risk"
          icon={TrendingUp}
          trend={`${metrics?.recoverablePayments || 0} Recoverable`}
        />

        <MetricCard
          title="Execution Success"
          value={`${metrics?.executionSuccessRate || 0}%`}
          subtitle="Attempts dispatched successfully"
          icon={Activity}
          badge={{ text: `${metrics?.successfulTransactions || 0} Successes`, variant: 'indigo' }}
        />
      </div>

      {/* Gateway & Pipeline Operational Status */}
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
            <span className="font-bold text-slate-200">{gatewayStatus?.totalWebhooks || 0} Events</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Processed / Success</span>
            <span className="font-bold text-emerald-400">{gatewayStatus?.successRate || 100}%</span>
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

      {/* Real-time System Infrastructure Health */}
      <SystemHealthCard />

      {/* High-Potential Recovery Opportunities */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              High-Probability Recovery Opportunities
            </h3>
            <p className="text-xs text-slate-400">
              Transactions flagged by AI with the highest probability of successful recovery.
            </p>
          </div>
          <button
            onClick={() => navigate('/transactions?status=FAILED')}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all failed
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {opportunities.length === 0 ? (
          <EmptyState
            title="No Active Recovery Opportunities"
            description="All eligible failed transactions have been processed or resolved."
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Transaction</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Failure Code</th>
                    <th className="py-3.5 px-4">Recovery Likelihood</th>
                    <th className="py-3.5 px-4">AI Policy</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {opportunities.map((opp) => (
                    <tr
                      key={opp.id}
                      onClick={() => navigate(`/transactions/${opp.id}`)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-200">
                        {opp.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{opp.customerName}</div>
                        <div className="text-[11px] text-slate-400">{opp.customerEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {formatINR(opp.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                          {opp.failureCode || 'GENERIC_DECLINE'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400">{opp.recoveryProbability}%</span>
                          <StatusBadge type="risk" value={opp.riskLevel} />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge type="decision" value={opp.decision} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/transactions/${opp.id}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                        >
                          Review & Execute
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
