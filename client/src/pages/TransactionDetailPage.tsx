import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Brain,
  Play,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { fetchTransactionDetail, executeRecoveryAttempt } from '../services/api';
import { TransactionDetail } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatINR } from '../components/ui/MetricCard';
import { Timeline } from '../components/ui/Timeline';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export const TransactionDetailPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadDetail = async () => {
    if (!transactionId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTransactionDetail(transactionId);
      setTransaction(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction not found';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [transactionId]);

  const handleExecuteRecovery = async () => {
    if (!transaction) return;
    try {
      setExecuting(true);
      setExecutionMessage(null);
      await executeRecoveryAttempt(transaction.id, transaction.decision?.id);
      setExecutionMessage({
        type: 'success',
        text: 'Recovery execution dispatched successfully via Razorpay Test Mode!',
      });
      // Reload details after 1s
      setTimeout(() => {
        loadDetail();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Recovery execution failed';
      setExecutionMessage({ type: 'error', text: msg });
    } finally {
      setExecuting(false);
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Transaction Lifecycle
              </h1>
              <StatusBadge type="transaction" value={transaction.status} />
            </div>
            <span className="text-xs font-mono text-slate-400">ID: {transaction.id}</span>
          </div>
        </div>

        {/* Recovery Action Button */}
        {transaction.status === 'FAILED' && (
          <div className="flex items-center gap-3">
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
                  Autonomous Recovery Flow
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  End-to-end trace from initial gateway failure to AI policy resolution.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                {transaction.recoveryAttempts.length} Execution Attempts
              </span>
            </div>

            <Timeline transaction={transaction} />
          </div>

          {/* Card: Audit Trail Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Immutable Audit Trail
            </h3>

            {transaction.auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No audit events recorded for this transaction yet.</p>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {transaction.auditLogs.map((log) => (
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
                <h3 className="text-sm font-bold text-white">AI Decision Explainability</h3>
              </div>
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
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

          {/* Card: Customer Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Customer Profile
            </span>

            <div className="space-y-1">
              <div className="text-sm font-bold text-white">{transaction.customer.name}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {transaction.customer.email}
              </div>
              {transaction.customer.phone && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {transaction.customer.phone}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg">
                <span className="text-slate-500 block text-[10px]">Total Orders</span>
                <span className="font-bold text-slate-200">{transaction.customer.totalTransactions}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg">
                <span className="text-slate-500 block text-[10px]">Success Rate</span>
                <span className="font-bold text-emerald-400">{transaction.customer.successRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
