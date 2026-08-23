import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCw,
  Play,
  Brain,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Sparkles,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  fetchTransactionDetail,
  executeRecoveryAttempt,
  triggerDecision,
  triggerDiagnosis,
} from '../services/api';
import { TransactionDetail } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
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
          text: `Recovery action executed successfully: ${res.action} -> ${res.status} (${res.outcomeCode || 'ORDER_CREATED'})`,
        });
      } else {
        setExecutionMessage({
          type: 'error',
          text: `Recovery execution ${res?.status || 'halted'}: ${res?.message || res?.outcomeCode || 'Action blocked by safety policy'}`,
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
        text: 'Google Gemini AI diagnosis & recovery policy re-evaluated in real time!',
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transactions
        </button>
        <ErrorBanner message={error || 'Transaction not found'} onRetry={loadDetail} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/transactions')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Transaction Lifecycle
              </h1>
              <StatusBadge type="transaction" value={transaction.status} />
              {transaction.paymentStatus && (
                <StatusBadge type="payment" value={transaction.paymentStatus} />
              )}
              {transaction.recoveryStatus && (
                <StatusBadge type="recoveryState" value={transaction.recoveryStatus} />
              )}
            </div>
            <span className="text-xs font-mono text-slate-400">ID: {transaction.id}</span>
          </div>
        </div>

        {/* Recovery Action Buttons */}
        {transaction.status === 'FAILED' && (
          <div className="flex items-center gap-3">
            <button
              disabled={reEvaluating || executing}
              onClick={handleReevaluate}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              <RotateCw className={`w-3.5 h-3.5 text-indigo-400 ${reEvaluating ? 'animate-spin' : ''}`} />
              {reEvaluating ? 'Analyzing...' : 'Re-Evaluate AI Policy'}
            </button>

            <button
              disabled={executing || transaction.retryCount >= 3}
              onClick={handleExecuteRecovery}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white shadow-lg shadow-emerald-600/20 transition-all"
            >
              {executing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Execute Recovery Action
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {executionMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            executionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {executionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          {executionMessage.text}
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Lifecycle Timeline (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Lifecycle Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Autonomous Recovery Lifecycle
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  End-to-end trace from initial gateway failure to cryptographic payment reconciliation.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                {(transaction.recoveryAttempts || []).length} Execution Attempts
              </span>
            </div>

            <Timeline transaction={transaction} />
          </div>

          {/* Card: Traceability & Correlation Chain */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Traceability & Correlation Chain
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Transaction ID</span>
                <span className="text-slate-200">{transaction.id}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Customer ID</span>
                <span className="text-slate-200">{transaction.customerId}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Razorpay Order ID</span>
                <span className="text-slate-200">{transaction.razorpayOrderId || 'None (Pre-Order)'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Razorpay Payment ID</span>
                <span className="text-slate-200">{transaction.razorpayPaymentId || 'None (Pending)'}</span>
              </div>
            </div>
          </div>

          {/* Card: Audit Trail Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Immutable Audit Trail
            </h3>

            {(!transaction.auditLogs || transaction.auditLogs.length === 0) ? (
              <p className="text-xs text-slate-500">No audit events recorded for this transaction yet.</p>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {(transaction.auditLogs || []).map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-slate-200 font-semibold">{log.action}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Actor: <span className="text-indigo-300">{log.actor || 'SYSTEM'}</span> | Entity: {log.entityType}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Explainability & Customer Details */}
        <div className="space-y-6">
          {/* Card: Financial Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction Amount</span>
            <div className="text-3xl font-extrabold text-white">{formatINR(transaction.amount)}</div>

            <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Status:</span>
                <StatusBadge type="payment" value={transaction.paymentStatus || 'FAILED'} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recovery Status:</span>
                <StatusBadge type="recoveryState" value={transaction.recoveryStatus || 'NOT_STARTED'} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-semibold text-slate-200">{transaction.paymentMethod || 'Card / UPI'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Retry Counter:</span>
                <span className="font-semibold text-slate-200">{transaction.retryCount} of 3 max</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-300">{new Date(transaction.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card: AI Explainability Engine */}
          <div className="bg-gradient-to-b from-indigo-950/30 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">AI Diagnostic Engine</h3>
              </div>
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>

            {/* AI Model Transparency Badge */}
            <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-[11px] font-bold text-white block">
                    {transaction.diagnosis?.isFallback ? 'Deterministic Fallback Engine' : 'Google Gemini AI'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Model: {transaction.diagnosis?.modelName || 'gemini-3.5-flash-lite'}
                  </span>
                </div>
              </div>
              {transaction.diagnosis?.latencyMs && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {transaction.diagnosis.latencyMs}ms
                </span>
              )}
            </div>

            {/* Probability & Confidence Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Recovery Likelihood</span>
                <span className="text-xl font-bold text-emerald-400">
                  {transaction.detection?.recoveryProbability || 50}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {transaction.detection?.riskLevel || 'MEDIUM'} Risk
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Model Confidence</span>
                <span className="text-xl font-bold text-indigo-400">
                  {transaction.detection?.confidenceScore || 85}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">High Certainty</span>
              </div>
            </div>

            {/* Approved Policy */}
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">Approved Policy Decision</span>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="font-semibold text-white text-xs">Action:</span>
                {transaction.decision?.decision ? (
                  <StatusBadge type="decision" value={transaction.decision.decision} />
                ) : (
                  <span className="text-slate-400 text-xs font-semibold">RETRY</span>
                )}
              </div>
            </div>

            {/* Positive Factors */}
            <div>
              <span className="text-[11px] uppercase font-bold text-emerald-400 block mb-1.5">Positive Signals</span>
              <div className="space-y-1.5">
                {(transaction.detection?.positiveFactors || ['Strong historical payment rate', 'Temporary network failure code']).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <span className="text-[11px] uppercase font-bold text-rose-400 block mb-1.5">Risk Factors</span>
              <div className="space-y-1.5">
                {(transaction.detection?.riskFactors || ['Recent payment decline']).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-rose-400 font-bold">×</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Reasoning Text */}
            {transaction.decision?.reasoning && (
              <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-indigo-300 block mb-1">Reasoning Synthesis:</span>
                {transaction.decision.reasoning}
              </div>
            )}
          </div>

          {/* Card: Customer Historical Context */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Customer Profile
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-slate-200">{transaction.customer?.name || 'Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-slate-200">{transaction.customer?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Success Rate:</span>
                <span className="font-semibold text-emerald-400">
                  {transaction.customer?.successRate !== undefined ? transaction.customer.successRate.toFixed(1) : '100'}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Transactions:</span>
                <span className="font-semibold text-slate-200">{transaction.customer?.totalTransactions ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
