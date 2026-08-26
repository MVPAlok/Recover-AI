import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCw } from 'lucide-react';
import { fetchOverview, fetchRecoveryOpportunities, fetchRazorpayGatewayStatus } from '../services/api';
import { DashboardOverviewMetrics, RecoveryOpportunity, RazorpayGatewayStatus } from '../types';
import { SectionTag } from '../components/system/SectionTag';
import { SystemPanel } from '../components/system/SystemPanel';
import { DataRow } from '../components/system/DataRow';
import { StatusIndicator } from '../components/system/StatusIndicator';
import { ActionButton } from '../components/system/ActionButton';
import { SystemHealthCard } from '../components/ui/SystemHealthCard';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { formatINR } from '../components/ui/MetricCard';

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
        <CardSkeleton />
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
    <div className="space-y-8 pb-12 font-mono">
      {/* Header: 01 / RECOVERY CONTROL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <SectionTag label="01 / RECOVERY CONTROL" />
            <StatusIndicator status="OPERATIONAL" label="AUTONOMOUS AGENT ACTIVE" />
            <span className="text-[10px] text-primary/70 border border-primary/20 bg-primary/5 px-2 py-0.5 rounded">
              SANDBOX: RAZORPAY TEST MODE
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-geist text-on-surface tracking-tight">
            REVENUE RECOVERY OPERATIONS
          </h1>
          <p className="text-xs text-on-surface-variant/80 max-w-2xl leading-relaxed">
            Real-time telemetry across transaction failures, Gemini AI root-cause diagnostics, and cryptographic payment reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded bg-surface/50 hover:bg-surface/80 text-on-surface-variant hover:text-white border border-white/10 transition-all"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}</span>
          </button>
          <ActionButton onClick={() => navigate('/transactions')}>
            EXPLORE TRANSACTIONS
          </ActionButton>
        </div>
      </div>

      {/* Primary Dominant System Panel (Unified Recovery Financial State + Engine Status) */}
      <SystemPanel borderVariant="primary" className="p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <span className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wider">
            RECOVERY SYSTEM LEDGER & PIPELINE STATE
          </span>
          <span className="text-[10px] text-on-surface-variant/60 font-mono">
            LAST 30 DAYS EVALUATION
          </span>
        </div>

        {/* 4 Core Financial Metrics in Clean Technical Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-on-surface-variant/70">REVENUE AT RISK</div>
            <div className="text-xl sm:text-2xl md:text-3xl text-on-surface font-bold font-geist">
              {formatINR(metrics?.revenueAtRisk || 0)}
            </div>
            <div className="text-[10px] text-error flex items-center gap-1">
              <span>●</span> {metrics?.failedPayments || 0} Failed Payments
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-on-surface-variant/70">VERIFIED RECOVERY</div>
            <div className="text-xl sm:text-2xl md:text-3xl text-secondary font-bold font-geist">
              {formatINR(metrics?.recoveredRevenue || 0)}
            </div>
            <div className="text-[10px] text-secondary flex items-center gap-1">
              <span>●</span> PostgreSQL Ledger Verified
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-on-surface-variant/70">RECOVERY RATE</div>
            <div className="text-xl sm:text-2xl md:text-3xl text-primary font-bold font-geist">
              {metrics?.recoveryRate || 0}%
            </div>
            <div className="text-[10px] text-primary flex items-center gap-1">
              <span>●</span> {metrics?.recoverablePayments || 0} Recoverable
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-on-surface-variant/70">EXECUTION SUCCESS</div>
            <div className="text-xl sm:text-2xl md:text-3xl text-on-surface font-bold font-geist">
              {metrics?.executionSuccessRate || 0}%
            </div>
            <div className="text-[10px] text-on-surface-variant/70 flex items-center gap-1">
              <span>●</span> {metrics?.successfulTransactions || 0} Captured
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-white/10" />

        {/* System State Overview Rows */}
        <div className="space-y-2">
          <div className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider mb-2">
            OPERATIONAL SUBSYSTEMS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded bg-surface/50 border border-white/5 flex justify-between items-center">
              <span className="text-on-surface-variant/70 text-[11px]">GATEWAY</span>
              <StatusIndicator status="OPERATIONAL" label="RAZORPAY TEST" />
            </div>
            <div className="p-2.5 rounded bg-surface/50 border border-white/5 flex justify-between items-center">
              <span className="text-on-surface-variant/70 text-[11px]">DIAGNOSIS</span>
              <StatusIndicator status="OPERATIONAL" label="GEMINI 3.5" />
            </div>
            <div className="p-2.5 rounded bg-surface/50 border border-white/5 flex justify-between items-center">
              <span className="text-on-surface-variant/70 text-[11px]">DECISION</span>
              <StatusIndicator status="OPERATIONAL" label="DETERMINISTIC" />
            </div>
            <div className="p-2.5 rounded bg-surface/50 border border-white/5 flex justify-between items-center">
              <span className="text-on-surface-variant/70 text-[11px]">SETTLEMENT</span>
              <StatusIndicator status="VERIFIED" label="HMAC SHA-256" />
            </div>
          </div>
        </div>
      </SystemPanel>

      {/* 6-Stage Recovery Pipeline Flow Visualizer */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-primary font-bold uppercase tracking-wider">
            AUTONOMOUS 6-STAGE RECOVERY LIFECYCLE
          </span>
          <span className="text-[10px] text-on-surface-variant/60">
            TRANSACTION &rarr; EVIDENCE
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="p-3 rounded bg-surface-container-high/60 border border-white/5 space-y-1">
            <div className="text-primary text-[10px] font-bold">01 / DETECT</div>
            <div className="text-white font-bold">Payment Failure</div>
            <div className="text-[10px] text-on-surface-variant/60">Webhook Ingested</div>
          </div>

          <div className="p-3 rounded bg-surface-container-high/60 border border-white/5 space-y-1">
            <div className="text-primary text-[10px] font-bold">02 / DIAGNOSE</div>
            <div className="text-white font-bold">Root-Cause AI</div>
            <div className="text-[10px] text-on-surface-variant/60">Google Gemini LLM</div>
          </div>

          <div className="p-3 rounded bg-surface-container-high/60 border border-white/5 space-y-1">
            <div className="text-primary text-[10px] font-bold">03 / DECIDE</div>
            <div className="text-white font-bold">RETRY / WAIT</div>
            <div className="text-[10px] text-on-surface-variant/60">Hard Safety Rules</div>
          </div>

          <div className="p-3 rounded bg-surface-container-high/60 border border-white/5 space-y-1">
            <div className="text-primary text-[10px] font-bold">04 / EXECUTE</div>
            <div className="text-white font-bold">Attempt #1</div>
            <div className="text-[10px] text-on-surface-variant/60">BullMQ + Redis</div>
          </div>

          <div className="p-3 rounded bg-surface-container-high/60 border border-white/5 space-y-1">
            <div className="text-secondary text-[10px] font-bold">05 / VERIFY</div>
            <div className="text-white font-bold">Captured Webhook</div>
            <div className="text-[10px] text-on-surface-variant/60">HMAC SHA-256</div>
          </div>

          <div className="p-3 rounded bg-surface-container-high/60 border border-secondary/30 bg-secondary/5 space-y-1">
            <div className="text-secondary text-[10px] font-bold">06 / RECOVER</div>
            <div className="text-secondary font-bold">Reconciled</div>
            <div className="text-[10px] text-secondary/80">PostgreSQL Ledger</div>
          </div>
        </div>
      </div>

      {/* 2-Column: High-Probability Opportunities (Left) + System Architecture Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High-Probability Recovery Opportunities (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                02 / HIGH-PROBABILITY RECOVERY OPPORTUNITIES
              </span>
              <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                Transactions flagged with high mathematical likelihood of recovery.
              </p>
            </div>
            <button
              onClick={() => navigate('/transactions?status=FAILED')}
              className="text-[11px] text-primary hover:text-white flex items-center gap-1 transition-colors"
            >
              All Failed &rarr;
            </button>
          </div>

          {opportunities.length === 0 ? (
            <EmptyState
              title="No Active Recovery Opportunities"
              description="All eligible failed transactions have been processed or resolved."
            />
          ) : (
            <div className="bg-surface-container-high/80 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/80 text-on-surface-variant/70 border-b border-white/10 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">TX ID</th>
                      <th className="py-3 px-4">CUSTOMER</th>
                      <th className="py-3 px-4">AMOUNT</th>
                      <th className="py-3 px-4">FAILURE</th>
                      <th className="py-3 px-4">PROBABILITY</th>
                      <th className="py-3 px-4">POLICY</th>
                      <th className="py-3 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-on-surface-variant">
                    {opportunities.map((opp) => (
                      <tr
                        key={opp.id}
                        onClick={() => navigate(`/transactions/${opp.id}`)}
                        className="hover:bg-surface/50 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 font-bold text-white group-hover:text-primary">
                          {opp.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-on-surface font-semibold">{opp.customerName}</div>
                          <div className="text-[10px] text-on-surface-variant/60">{opp.customerEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {formatINR(opp.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-surface/50 border border-white/5 text-on-surface text-[10px]">
                            {opp.failureCode || 'GENERIC_DECLINE'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-secondary font-bold">{opp.recoveryProbability}%</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-primary font-bold text-[10px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                            {opp.decision}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/transactions/${opp.id}`);
                            }}
                            className="text-[10px] text-primary hover:text-white border border-primary/30 hover:bg-primary hover:text-surface-dim px-2.5 py-1 rounded transition-all font-bold"
                          >
                            INSPECT &rarr;
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

        {/* System Architecture Telemetry (Right Column) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-primary font-bold uppercase tracking-wider">
              07 / ARCHITECTURE
            </span>
            <span className="text-[10px] text-secondary font-bold">
              ● READY
            </span>
          </div>

          <SystemHealthCard />

          {/* Gateway Telemetry Box */}
          <div className="bg-surface-container-highest/40 border border-white/10 rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-[10px] border-b border-white/10 pb-2">
              <span className="text-on-surface-variant/70 uppercase font-bold">GATEWAY INGESTION</span>
              <span className="text-secondary font-bold">{gatewayStatus?.successRate || 100}% PROCESSED</span>
            </div>
            <DataRow label="WEBHOOK EVENTS" value={`${gatewayStatus?.totalWebhooks || 0} Ingested`} />
            <DataRow
              label="LAST EVENT"
              value={gatewayStatus?.lastWebhookAt ? new Date(gatewayStatus.lastWebhookAt).toLocaleTimeString() : 'Listening'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
