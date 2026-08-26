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
      <div className="space-y-8">
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
    <div className="space-y-8 pb-12">
      {/* 1. Standardized Header Hierarchy with 32px Spacing Rhythm */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTag label="01 / RECOVERY CONTROL" />
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono rounded bg-surface/50 hover:bg-surface/80 text-on-surface-variant hover:text-white border border-white/10 transition-all"
              title="Refresh Telemetry"
            >
              <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}</span>
            </button>
            <ActionButton onClick={() => navigate('/transactions')}>
              EXPLORE TRANSACTIONS
            </ActionButton>
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-5xl font-bold font-geist text-on-surface tracking-tight">
            REVENUE RECOVERY OPERATIONS
          </h1>
          <p className="text-xs sm:text-sm font-geist text-on-surface-variant/80 max-w-2xl mt-2 leading-relaxed">
            Real-time intelligence across transaction failures, Gemini AI root-cause diagnostics, and cryptographic payment reconciliation.
          </p>
        </div>
      </div>

      {/* 2. Dominant Primary System Panel (Surface 1) */}
      <SystemPanel borderVariant="primary" className="p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <span className="font-mono text-xs sm:text-sm font-bold text-primary uppercase tracking-wider">
            PRIMARY RECOVERY LEDGER
          </span>
          <StatusIndicator status="OPERATIONAL" label="AUTONOMOUS AGENT ACTIVE" />
        </div>

        {/* 4 Core Financial Metrics in Confident Large Display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono">
          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-on-surface-variant/70 uppercase">REVENUE AT RISK</div>
            <div className="text-2xl sm:text-4xl text-on-surface font-bold font-geist tracking-tight">
              {formatINR(metrics?.revenueAtRisk || 0)}
            </div>
            <div className="text-[10px] text-error flex items-center gap-1.5 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-error" /> {metrics?.failedPayments || 0} Failed Payments
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-on-surface-variant/70 uppercase">VERIFIED RECOVERY</div>
            <div className="text-2xl sm:text-4xl text-secondary font-bold font-geist tracking-tight">
              {formatINR(metrics?.recoveredRevenue || 0)}
            </div>
            <div className="text-[10px] text-secondary flex items-center gap-1.5 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> PostgreSQL Ledger Reconciled
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-on-surface-variant/70 uppercase">RECOVERY RATE</div>
            <div className="text-2xl sm:text-4xl text-primary font-bold font-geist tracking-tight">
              {metrics?.recoveryRate || 0}%
            </div>
            <div className="text-[10px] text-primary flex items-center gap-1.5 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {metrics?.recoverablePayments || 0} Recoverable
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs text-on-surface-variant/70 uppercase">EXECUTION SUCCESS</div>
            <div className="text-2xl sm:text-4xl text-on-surface font-bold font-geist tracking-tight">
              {metrics?.executionSuccessRate || 0}%
            </div>
            <div className="text-[10px] text-on-surface-variant/70 flex items-center gap-1.5 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> {metrics?.successfulTransactions || 0} Captured Orders
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-white/10" />

        {/* Inline Subsystem Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded bg-surface/50 border border-white/5 flex justify-between items-center">
            <span className="text-on-surface-variant/70 text-[11px]">GATEWAY</span>
            <StatusIndicator status="OPERATIONAL" label="RAZORPAY TEST" />
          </div>
          <div className="p-3 rounded bg-surface/50 border border-white/5 flex justify-between items-center">
            <span className="text-on-surface-variant/70 text-[11px]">DIAGNOSIS</span>
            <StatusIndicator status="OPERATIONAL" label="GEMINI 3.5" />
          </div>
          <div className="p-3 rounded bg-surface/50 border border-white/5 flex justify-between items-center">
            <span className="text-on-surface-variant/70 text-[11px]">DECISION</span>
            <StatusIndicator status="OPERATIONAL" label="DETERMINISTIC" />
          </div>
          <div className="p-3 rounded bg-surface/50 border border-white/5 flex justify-between items-center">
            <span className="text-on-surface-variant/70 text-[11px]">SETTLEMENT</span>
            <StatusIndicator status="VERIFIED" label="HMAC SHA-256" />
          </div>
        </div>
      </SystemPanel>

      {/* 3. 6-Stage Visual Recovery Pipeline */}
      <div className="space-y-3 font-mono">
        <div className="flex justify-between items-center">
          <span className="text-xs text-primary font-bold uppercase tracking-wider">
            AUTONOMOUS 6-STAGE RECOVERY LIFECYCLE
          </span>
          <span className="text-[10px] text-on-surface-variant/60">
            TRANSACTION &rarr; EVIDENCE
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="p-3.5 rounded bg-surface/50 border border-white/5 space-y-1">
            <div className="text-primary text-[10px] font-bold">01 / DETECT</div>
            <div className="text-white font-bold font-geist">Payment Failure</div>
            <div className="text-[10px] text-on-surface-variant/60 font-mono">Webhook Ingested</div>
          </div>

          <div className="p-3.5 rounded bg-surface/50 border border-white/5 space-y-1">
            <div className="text-primary text-[10px] font-bold">02 / DIAGNOSE</div>
            <div className="text-white font-bold font-geist">Root-Cause AI</div>
            <div className="text-[10px] text-on-surface-variant/60 font-mono">Google Gemini LLM</div>
          </div>

          <div className="p-3.5 rounded bg-surface/50 border border-white/5 space-y-1">
            <div className="text-primary text-[10px] font-bold">03 / DECIDE</div>
            <div className="text-white font-bold font-geist">RETRY / WAIT</div>
            <div className="text-[10px] text-on-surface-variant/60 font-mono">Hard Safety Rules</div>
          </div>

          <div className="p-3.5 rounded bg-surface/50 border border-white/5 space-y-1">
            <div className="text-primary text-[10px] font-bold">04 / EXECUTE</div>
            <div className="text-white font-bold font-geist">Attempt #1</div>
            <div className="text-[10px] text-on-surface-variant/60 font-mono">BullMQ + Redis</div>
          </div>

          <div className="p-3.5 rounded bg-surface/50 border border-white/5 space-y-1">
            <div className="text-secondary text-[10px] font-bold">05 / VERIFY</div>
            <div className="text-white font-bold font-geist">Captured Webhook</div>
            <div className="text-[10px] text-on-surface-variant/60 font-mono">HMAC SHA-256</div>
          </div>

          <div className="p-3.5 rounded bg-surface/50 border border-secondary/30 bg-secondary/5 space-y-1">
            <div className="text-secondary text-[10px] font-bold">06 / RECOVER</div>
            <div className="text-secondary font-bold font-geist">Reconciled</div>
            <div className="text-[10px] text-secondary/80 font-mono">PostgreSQL Ledger</div>
          </div>
        </div>
      </div>

      {/* 4. 2-Column Section: High-Probability Opportunities (Left) + Architecture Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* High-Probability Recovery Opportunities (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between font-mono">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                02 / HIGH-PROBABILITY RECOVERY OPPORTUNITIES
              </span>
              <p className="text-[11px] text-on-surface-variant/70 font-geist mt-0.5">
                Transactions flagged with high mathematical likelihood of autonomous recovery.
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
                  <thead className="bg-surface/80 text-on-surface-variant/70 border-b border-white/10 text-[10px] uppercase font-mono font-bold tracking-wider">
                    <tr>
                      <th className="py-4 px-5">TX ID</th>
                      <th className="py-4 px-5">CUSTOMER</th>
                      <th className="py-4 px-5">AMOUNT</th>
                      <th className="py-4 px-5">FAILURE CODE</th>
                      <th className="py-4 px-5">PROBABILITY</th>
                      <th className="py-4 px-5">POLICY</th>
                      <th className="py-4 px-5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-on-surface-variant">
                    {opportunities.map((opp) => (
                      <tr
                        key={opp.id}
                        onClick={() => navigate(`/transactions/${opp.id}`)}
                        className="hover:bg-surface/50 cursor-pointer transition-colors group"
                      >
                        <td className="py-4 px-5 font-mono font-bold text-white group-hover:text-primary">
                          {opp.id}
                        </td>
                        <td className="py-4 px-5">
                          <div className="text-on-surface font-semibold font-geist">{opp.customerName}</div>
                          <div className="text-[10px] font-mono text-on-surface-variant/60">{opp.customerEmail}</div>
                        </td>
                        <td className="py-4 px-5 font-mono font-bold text-white">
                          {formatINR(opp.amount)}
                        </td>
                        <td className="py-4 px-5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-surface/50 border border-white/5 text-on-surface">
                            {opp.failureCode || 'GENERIC_DECLINE'}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono">
                          <span className="text-secondary font-bold">{opp.recoveryProbability}%</span>
                        </td>
                        <td className="py-4 px-5 font-mono">
                          <span className="text-primary font-bold text-[10px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                            {opp.decision}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right font-mono">
                          <span className="text-[10px] text-primary group-hover:underline font-bold">
                            INSPECT &rarr;
                          </span>
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
        <div className="space-y-4 font-mono">
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
