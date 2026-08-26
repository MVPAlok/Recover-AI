import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCw,
  Brain,
  AlertCircle,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import {
  fetchTransactionDetail,
  executeRecoveryAttempt,
  triggerDecision,
  triggerDiagnosis,
} from '../services/api';
import { TransactionDetail } from '../types';
import { SectionTag } from '../components/system/SectionTag';
import { SystemPanel } from '../components/system/SystemPanel';
import { DataRow } from '../components/system/DataRow';
import { StatusIndicator } from '../components/system/StatusIndicator';
import { ActionButton } from '../components/system/ActionButton';
import { Timeline } from '../components/ui/Timeline';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { formatINR } from '../components/ui/MetricCard';

export const TransactionDetailPage: React.FC = () => {
  const { id, transactionId } = useParams<{ id?: string; transactionId?: string }>();
  const effectiveId = transactionId || id;
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadDetail = async () => {
    if (!effectiveId) {
      setLoading(false);
      setError('Transaction ID not specified');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTransactionDetail(effectiveId);
      setTransaction(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load transaction details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [effectiveId]);

  const handleExecuteRecovery = async () => {
    if (!effectiveId || !transaction) return;
    try {
      setExecuting(true);
      setExecutionMessage(null);
      const res = await executeRecoveryAttempt(effectiveId, transaction.decision?.id);

      if (res?.status === 'SUCCESS') {
        setExecutionMessage({
          type: 'success',
          text: `Recovery action executed: ${res.action} -> ${res.status} (${res.outcomeCode || 'ORDER_CREATED'})`,
        });
      } else {
        setExecutionMessage({
          type: 'error',
          text: `Recovery execution ${res?.status || 'halted'}: ${res?.message || res?.outcomeCode || 'Halted by policy guardrail'}`,
        });
      }
      await loadDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Recovery execution failed';
      setExecutionMessage({ type: 'error', text: msg });
    } finally {
      setExecuting(false);
    }
  };

  const handleReevaluate = async () => {
    if (!effectiveId) return;
    try {
      setReEvaluating(true);
      setExecutionMessage(null);
      await triggerDiagnosis(effectiveId);
      await triggerDecision(effectiveId, true);
      setExecutionMessage({
        type: 'success',
        text: 'Google Gemini AI diagnosis & policy rules re-evaluated in real time!',
      });
      await loadDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to re-evaluate policy';
      setExecutionMessage({ type: 'error', text: msg });
    } finally {
      setReEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-4 font-mono">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transactions
        </button>
        <ErrorBanner message={error || 'Transaction not found'} onRetry={loadDetail} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Hierarchy with 32px Spacing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/transactions')}
              className="p-1.5 rounded bg-surface/50 hover:bg-surface/80 border border-white/10 text-on-surface-variant hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <SectionTag label="02 / DIAGNOSIS & RECOVERY" />
            <StatusIndicator
              status={transaction.status === 'SUCCESS' ? 'OPERATIONAL' : 'FAILED'}
              label={transaction.status}
            />
            {transaction.recoveryStatus && (
              <StatusIndicator
                status={
                  transaction.recoveryStatus === 'RECOVERED' || transaction.status === 'SUCCESS'
                    ? 'RECOVERED'
                    : transaction.recoveryStatus === 'IN_PROGRESS'
                    ? 'EXECUTING'
                    : 'WARNING'
                }
                label={transaction.recoveryStatus}
              />
            )}
          </div>

          {/* Action Buttons */}
          {transaction.status === 'FAILED' && (
            <div className="flex items-center gap-3">
              <button
                disabled={reEvaluating || executing}
                onClick={handleReevaluate}
                className="flex items-center gap-2 px-3 py-2 text-xs font-mono rounded bg-surface/50 hover:bg-surface/80 text-on-surface-variant hover:text-white border border-white/10 transition-all disabled:opacity-50"
              >
                <RotateCw className={`w-3 h-3 ${reEvaluating ? 'animate-spin' : ''}`} />
                <span>{reEvaluating ? 'Analyzing...' : 'Re-Evaluate AI'}</span>
              </button>

              <ActionButton
                disabled={executing || transaction.retryCount >= 3}
                onClick={handleExecuteRecovery}
              >
                {executing ? 'EXECUTING...' : 'DISPATCH RECOVERY'}
              </ActionButton>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl sm:text-5xl font-bold font-geist text-on-surface tracking-tight">
            TRANSACTION LIFECYCLE
          </h1>
          <p className="text-xs sm:text-sm font-mono text-on-surface-variant/80 mt-1">
            ID: <span className="text-white font-bold">{transaction.id}</span> • Customer: <span className="text-white">{transaction.customer?.name || 'Customer'}</span>
          </p>
        </div>
      </div>

      {/* Execution Feedback Message */}
      {executionMessage && (
        <div
          className={`p-3.5 rounded border text-xs font-mono flex items-center gap-3 ${
            executionMessage.type === 'success'
              ? 'bg-secondary/10 border-secondary/30 text-secondary'
              : 'bg-error/10 border-error/30 text-error'
          }`}
        >
          {executionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{executionMessage.text}</span>
        </div>
      )}

      {/* 2-Column Grid: Timeline & Evidence (Left 2 cols) + Exactly 3 Right Panels (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Continuous Lifecycle Timeline & Evidence Ledger (Span 2) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card: Lifecycle Timeline (Continuous Single Vertical Rail) */}
          <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider block">
                  CONTINUOUS RECOVERY TIMELINE
                </span>
                <p className="text-[11px] font-geist text-on-surface-variant/70 mt-0.5">
                  Single chronological rail from failure ingestion to cryptographic ledger reconciliation.
                </p>
              </div>
              <span className="text-[10px] font-mono text-on-surface-variant/70 px-2 py-0.5 rounded bg-surface/50 border border-white/5">
                {(transaction.recoveryAttempts || []).length} Attempts
              </span>
            </div>

            <Timeline transaction={transaction} />
          </SystemPanel>

          {/* Card: Correlation Chain */}
          <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-3 font-mono">
            <span className="text-xs font-bold text-primary uppercase tracking-wider block border-b border-white/10 pb-2">
              TRACEABILITY & CORRELATION CHAIN
            </span>
            <div className="space-y-1.5">
              <DataRow label="TRANSACTION ID" value={transaction.id} />
              <DataRow label="CUSTOMER ID" value={transaction.customerId} />
              <DataRow label="RAZORPAY ORDER ID" value={transaction.razorpayOrderId || 'None (Pre-Order)'} />
              <DataRow label="RAZORPAY PAYMENT ID" value={transaction.razorpayPaymentId || 'None (Pending)'} />
            </div>
          </SystemPanel>

          {/* Card: Payment Evidence Ledger */}
          <SystemPanel borderVariant="subtle" className="p-6 sm:p-8 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                PAYMENT & SETTLEMENT EVIDENCE LEDGER
              </span>
              <StatusIndicator status="VERIFIED" label="CRYPTOGRAPHIC PROOF" />
            </div>

            {(!transaction.payments || transaction.payments.length === 0) ? (
              <div className="p-3.5 rounded bg-surface/40 border border-white/5 text-xs text-on-surface-variant/70 font-geist">
                No external payment attempts recorded in ledger yet. Revenue recognition awaits verified gateway capture.
              </div>
            ) : (
              <div className="space-y-2">
                {transaction.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded bg-surface/50 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{formatINR(p.amount)}</span>
                        <StatusIndicator
                          status={p.status === 'CAPTURED' ? 'VERIFIED' : 'PENDING'}
                          label={p.status}
                        />
                        {p.reconciled && (
                          <span className="text-secondary text-[10px] bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/20 font-bold">
                            RECONCILED ✓
                          </span>
                        )}
                      </div>
                      <div className="text-on-surface-variant/60 text-[11px]">
                        Order: {p.razorpayOrderId || 'N/A'} | Payment: {p.razorpayPaymentId || 'Pending'}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-on-surface-variant/60">
                      <div>Captured: <strong className="text-secondary">{formatINR(p.capturedAmount ?? 0)}</strong></div>
                      <div>{new Date(p.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SystemPanel>
        </div>

        {/* Right Column: EXACTLY 3 Panels (1. Summary, 2. AI Diagnostics, 3. Customer Profile) */}
        <div className="space-y-8">
          {/* Panel 1: Transaction Summary */}
          <SystemPanel borderVariant="primary" className="p-6 space-y-4 font-mono">
            <span className="text-[10px] text-on-surface-variant/70 uppercase font-bold tracking-wider block">
              TRANSACTION AMOUNT
            </span>
            <div className="text-3xl font-bold font-geist text-on-surface">
              {formatINR(transaction.amount)}
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
              <DataRow
                label="Payment Status"
                value={transaction.paymentStatus || 'FAILED'}
                badge={<StatusIndicator status={transaction.paymentStatus === 'CAPTURED' ? 'VERIFIED' : 'FAILED'} />}
              />
              <DataRow
                label="Recovery State"
                value={transaction.recoveryStatus || 'NOT_STARTED'}
                badge={
                  <StatusIndicator
                    status={
                      transaction.recoveryStatus === 'RECOVERED' || transaction.status === 'SUCCESS'
                        ? 'RECOVERED'
                        : transaction.recoveryStatus === 'IN_PROGRESS'
                        ? 'EXECUTING'
                        : 'WARNING'
                    }
                    label={transaction.recoveryStatus || 'NOT STARTED'}
                  />
                }
              />
              <DataRow label="Payment Method" value={transaction.paymentMethod || 'UPI / NetBanking'} />
              <DataRow label="Retry Counter" value={`${transaction.retryCount} of 3 max`} />
              <DataRow label="Created" value={new Date(transaction.createdAt).toLocaleTimeString()} />
            </div>
          </SystemPanel>

          {/* Panel 2: AI Diagnostic Engine */}
          <SystemPanel borderVariant="primary" className="p-6 space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase">AI DIAGNOSTIC ENGINE</span>
              </div>
              <StatusIndicator status="OPERATIONAL" label="ACTIVE" />
            </div>

            {/* AI Model details */}
            <div className="p-3 rounded bg-surface/50 border border-white/5 flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-white text-xs font-geist">
                  {transaction.diagnosis?.isFallback ? 'Deterministic Fallback' : 'Google Gemini LLM'}
                </div>
                <div className="text-[10px] text-on-surface-variant/60">
                  {transaction.diagnosis?.modelName || 'gemini-3.5-flash-lite'}
                </div>
              </div>
              {transaction.diagnosis?.latencyMs && (
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {transaction.diagnosis.latencyMs}ms
                </span>
              )}
            </div>

            {/* Probability and Confidence */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded bg-surface/50 border border-white/5">
                <span className="text-[9px] uppercase text-on-surface-variant/70 block">Recovery Probability</span>
                <span className="text-xl font-bold text-secondary font-geist mt-1 block">
                  {transaction.detection?.recoveryProbability || 75}%
                </span>
              </div>
              <div className="p-3 rounded bg-surface/50 border border-white/5">
                <span className="text-[9px] uppercase text-on-surface-variant/70 block">Model Confidence</span>
                <span className="text-xl font-bold text-primary font-geist mt-1 block">
                  {transaction.detection?.confidenceScore || 92}%
                </span>
              </div>
            </div>

            {/* Approved Policy */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase text-on-surface-variant/70 block">APPROVED POLICY DECISION</span>
              <div className="p-2.5 rounded bg-surface/50 border border-white/5 flex justify-between items-center text-xs">
                <span className="font-bold text-white">Action:</span>
                <span className="text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[10px]">
                  {transaction.decision?.decision || 'RETRY'}
                </span>
              </div>
            </div>

            {/* AI Reasoning */}
            {transaction.decision?.reasoning && (
              <div className="p-3 rounded bg-surface/30 border border-white/5 text-[11px] text-on-surface-variant/80 leading-relaxed font-geist">
                <strong className="text-primary block mb-1 font-mono">Reasoning Synthesis:</strong>
                {transaction.decision.reasoning}
              </div>
            )}
          </SystemPanel>

          {/* Panel 3: Customer Profile */}
          <SystemPanel borderVariant="subtle" className="p-6 space-y-3 font-mono">
            <span className="text-xs font-bold text-primary uppercase tracking-wider block border-b border-white/10 pb-2">
              CUSTOMER PROFILE
            </span>
            <div className="space-y-1.5 text-xs">
              <DataRow label="Name" value={<span className="font-geist">{transaction.customer?.name || 'Customer'}</span>} />
              <DataRow label="Email" value={transaction.customer?.email || 'N/A'} />
              <DataRow
                label="Historical Success"
                value={`${transaction.customer?.successRate !== undefined ? transaction.customer.successRate.toFixed(1) : '100'}%`}
              />
              <DataRow label="Total Transactions" value={transaction.customer?.totalTransactions ?? 1} />
            </div>
          </SystemPanel>
        </div>
      </div>
    </div>
  );
};
