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

function parseReasoning(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.reasoning) return parsed.reasoning;
      if (parsed.diagnosisCode) {
        return `Root cause: ${parsed.diagnosisCode} (${parsed.failureCategory || 'INFRASTRUCTURE'}). ${parsed.recommendedNextStep ? `Recommended: ${parsed.recommendedNextStep}` : ''}`;
      }
    } catch {
      // ignore
    }
  }
  return raw;
}

export const Timeline: React.FC<TimelineProps> = ({ transaction }) => {
  const attempts = transaction.recoveryAttempts || [];
  const latestAttempt = attempts[attempts.length - 1];
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
      description: parseReasoning(transaction.detection?.reasoning) || 'Evaluating customer payment patterns and failure codes.',
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
      description: parseReasoning(transaction.diagnosis?.reasoning) || transaction.failureReason || 'Analyzing root cause signals.',
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
      description: parseReasoning(transaction.decision?.reasoning) || 'Evaluating safety guardrails and retry limits.',
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
      status: (latestAttempt && (isRecovered || isFailed)) ? 'COMPLETED' : 'PENDING',
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
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-[2px] before:bg-outline-variant/30">
      {steps.map((step, idx) => {
        const Icon = step.icon;

        const accentColors: Record<string, string> = {
          rose: 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]',
          emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.25)]',
          indigo: 'bg-primary-container/20 text-primary-fixed-dim border-primary/40 shadow-[0_0_10px_rgba(91,91,247,0.25)]',
          purple: 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.25)]',
          blue: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]',
          amber: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
        };

        return (
          <div key={idx} className="relative group">
            {/* Step Icon */}
            <div
              className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all group-hover:scale-110 ${
                step.active ? accentColors[step.accent] : 'bg-surface-container-high text-outline border-outline-variant/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

            {/* Step Card */}
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              step.active
                ? 'bg-surface-container-lowest/80 border-outline-variant/30 backdrop-blur-xl hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5'
                : 'bg-surface-container-lowest/40 border-outline-variant/20 opacity-50'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold font-geist text-on-surface tracking-wide uppercase">{step.title}</span>
                {step.timestamp && (
                  <span className="font-mono text-[11px] text-outline">
                    {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="text-xs font-semibold font-geist text-primary-fixed-dim mb-1">{step.subtitle}</div>
              <p className="text-xs font-mono text-on-surface-variant leading-relaxed">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
