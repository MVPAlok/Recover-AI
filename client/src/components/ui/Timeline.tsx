import React from 'react';
import {
  XCircle,
  Activity,
  Brain,
  ShieldCheck,
  PlayCircle,
  Radio,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { TransactionDetail } from '../../types';
import { formatINR } from './MetricCard';

interface TimelineProps {
  transaction: TransactionDetail;
}

export const Timeline: React.FC<TimelineProps> = ({ transaction }) => {
  const latestAttempt = transaction.recoveryAttempts[transaction.recoveryAttempts.length - 1];
  const isRecovered = latestAttempt?.status === 'SUCCESS';
  const isFailed = latestAttempt?.status === 'FAILED';

  const steps = [
    {
      title: 'Payment Failure Ingestion',
      subtitle: `${formatINR(transaction.amount)} failed via ${transaction.paymentMethod || 'Gateway'}`,
      description: transaction.failureReason || transaction.failureCode || 'Transaction declined by bank/network',
      status: 'FAILED' as const,
      timestamp: transaction.createdAt,
      icon: XCircle,
      active: true,
      accent: 'rose',
    },
    {
      title: 'AI Detection & Probability Scoring',
      subtitle: transaction.detection
        ? `Recovery Likelihood: ${transaction.detection.recoveryProbability}% (${transaction.detection.riskLevel} Risk)`
        : 'Detection pending evaluation',
      description: transaction.detection?.reasoning || 'Evaluating customer payment patterns and failure codes.',
      status: transaction.detection ? 'COMPLETED' : 'PENDING',
      timestamp: transaction.detection?.createdAt,
      icon: Activity,
      active: Boolean(transaction.detection),
      accent: 'indigo',
    },
    {
      title: 'Root-Cause Failure Diagnosis',
      subtitle: transaction.diagnosis
        ? `Diagnosis: ${transaction.diagnosis.diagnosisCode || 'Temporary Infrastructure Failure'}`
        : 'Diagnosis agent pending',
      description: transaction.diagnosis?.reasoning || transaction.failureReason || 'Analyzing root cause signals.',
      status: transaction.diagnosis ? 'COMPLETED' : 'PENDING',
      timestamp: transaction.diagnosis?.createdAt,
      icon: Brain,
      active: Boolean(transaction.diagnosis),
      accent: 'purple',
    },
    {
      title: 'Recovery Strategy Policy Decision',
      subtitle: transaction.decision
        ? `Policy Approved: ${transaction.decision.decision} (Confidence: ${transaction.decision.confidenceScore}%)`
        : 'Decision pending formulation',
      description: transaction.decision?.reasoning || 'Evaluating safety guardrails and retry limits.',
      status: transaction.decision ? 'COMPLETED' : 'PENDING',
      timestamp: transaction.decision?.createdAt,
      icon: ShieldCheck,
      active: Boolean(transaction.decision),
      accent: 'emerald',
    },
    {
      title: 'Controlled Recovery Execution',
      subtitle: latestAttempt
        ? `Attempt #${latestAttempt.attemptNumber} via Razorpay Test Mode (${latestAttempt.actionType})`
        : 'Ready for execution',
      description: latestAttempt?.reason || 'Dispatched execution through recovery provider.',
      status: latestAttempt ? 'COMPLETED' : 'PENDING',
      timestamp: latestAttempt?.executedAt || latestAttempt?.createdAt,
      icon: PlayCircle,
      active: Boolean(latestAttempt),
      accent: 'blue',
    },
    {
      title: 'Razorpay Gateway Webhook Event',
      subtitle: transaction.razorpayOrderId
        ? `Order Ref: ${transaction.razorpayOrderId}`
        : 'Awaiting webhook callback confirmation',
      description: isRecovered
        ? 'payment.captured event verified with raw-body HMAC SHA-256'
        : isFailed
        ? 'payment.failed event processed'
        : 'Listening on /api/webhooks/razorpay',
      status: latestAttempt?.status === 'EXECUTED' ? 'PENDING' : latestAttempt ? 'COMPLETED' : 'PENDING',
      timestamp: latestAttempt?.executedAt || latestAttempt?.createdAt,
      icon: Radio,
      active: Boolean(latestAttempt && latestAttempt.status !== 'PENDING'),
      accent: isRecovered ? 'emerald' : isFailed ? 'rose' : 'amber',
    },
    {
      title: 'Financial Recovery Outcome',
      subtitle: isRecovered
        ? `SUCCESS — ${formatINR(latestAttempt.amountRecovered)} Revenue Saved`
        : isFailed
        ? 'Recovery Failed (No funds recovered)'
        : 'Recovery in progress',
      description: isRecovered
        ? 'Revenue recovered successfully into merchant balance'
        : 'Transaction state synchronized with audit trail',
      status: isRecovered ? 'COMPLETED' : isFailed ? 'FAILED' : 'PENDING',
      timestamp: latestAttempt?.executedAt || latestAttempt?.createdAt,
      icon: isRecovered ? CheckCircle2 : isFailed ? XCircle : Clock,
      active: Boolean(latestAttempt && (isRecovered || isFailed)),
      accent: isRecovered ? 'emerald' : isFailed ? 'rose' : 'amber',
    },
  ];

  return (
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
      {steps.map((step, idx) => {
        const Icon = step.icon;

        const accentColors: Record<string, string> = {
          rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };

        return (
          <div key={idx} className="relative group">
            {/* Step Icon */}
            <div
              className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-transform group-hover:scale-110 ${
                step.active ? accentColors[step.accent] : 'bg-slate-900 text-slate-600 border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

            {/* Step Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              step.active
                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                : 'bg-slate-900/40 border-slate-800/60 opacity-60'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold text-white tracking-wide">{step.title}</span>
                {step.timestamp && (
                  <span className="text-[11px] text-slate-400">
                    {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="text-xs font-semibold text-slate-300 mb-1">{step.subtitle}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
