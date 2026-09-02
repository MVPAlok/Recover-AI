import React from 'react';
import { TransactionDetail } from '../../types';
import { formatINR } from './MetricCard';
import { StatusIndicator } from '../system/StatusIndicator';

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
        return `Root cause: ${parsed.diagnosisCode} (${parsed.failureCategory || 'INFRASTRUCTURE'}). ${
          parsed.recommendedNextStep ? `Recommended: ${parsed.recommendedNextStep}` : ''
        }`;
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
  const isRecovered = latestAttempt?.status === 'SUCCESS' || transaction.recoveryStatus === 'RECOVERED' || transaction.status === 'SUCCESS';
  const isFailed = latestAttempt?.status === 'FAILED';

  const steps = [
    {
      num: '01',
      tag: 'DETECT',
      title: 'Payment Failure Ingestion',
      subtitle: `${formatINR(transaction.amount)} via ${transaction.paymentMethod || 'Gateway'}`,
      description: transaction.failureReason || transaction.failureCode || 'Transaction declined by issuer/network stream.',
      status: 'FAILED',
      statusText: 'INGESTED',
      timestamp: transaction.createdAt,
      active: true,
    },
    {
      num: '02',
      tag: 'SCORING',
      title: 'Statistical Probability Scoring',
      subtitle: transaction.detection
        ? `Likelihood: ${transaction.detection.recoveryProbability}% (${transaction.detection.riskLevel} Risk)`
        : transaction.decision
        ? `Likelihood: ${transaction.decision.confidenceScore}% (${transaction.decision.decision === 'STOP' ? 'HIGH' : 'LOW'} Risk)`
        : 'Scoring evaluation queued',
      description: parseReasoning(transaction.detection?.reasoning) || (transaction.decision ? `Statistical evaluation completed: ${parseReasoning(transaction.decision.reasoning)}` : 'Correlating customer lifetime success patterns with decline code.'),
      status: transaction.detection || transaction.decision ? 'OPERATIONAL' : 'PENDING',
      statusText: transaction.detection
        ? `${transaction.detection.recoveryProbability}% PROBABILITY`
        : transaction.decision
        ? `${transaction.decision.confidenceScore}% PROBABILITY`
        : 'QUEUED',
      timestamp: transaction.detection?.createdAt || transaction.decision?.createdAt,
      active: Boolean(transaction.detection || transaction.decision),
    },
    {
      num: '03',
      tag: 'DIAGNOSE',
      title: 'Google Gemini AI Diagnostics',
      subtitle: transaction.diagnosis
        ? `Root Cause: ${transaction.diagnosis.diagnosisCode || 'Temporary Gateway Spike'}`
        : 'Diagnosis agent standby',
      description: parseReasoning(transaction.diagnosis?.reasoning) || transaction.failureReason || 'Analyzing root cause telemetry and signals.',
      status: transaction.diagnosis ? 'OPERATIONAL' : 'PENDING',
      statusText: transaction.diagnosis ? 'GEMINI 3.5' : 'STANDBY',
      timestamp: transaction.diagnosis?.createdAt,
      active: Boolean(transaction.diagnosis),
    },
    {
      num: '04',
      tag: 'DECIDE',
      title: 'Policy Decision Formulation',
      subtitle: transaction.decision
        ? `Approved Action: ${transaction.decision.decision} (Confidence: ${transaction.decision.confidenceScore}%)`
        : 'Formulating policy action',
      description: parseReasoning(transaction.decision?.reasoning) || 'Evaluating deterministic safety guardrails and retry caps.',
      status: transaction.decision ? 'OPERATIONAL' : 'PENDING',
      statusText: transaction.decision ? transaction.decision.decision : 'PENDING',
      timestamp: transaction.decision?.createdAt,
      active: Boolean(transaction.decision),
    },
    {
      num: '05',
      tag: 'EXECUTE',
      title: 'Asynchronous Recovery Execution',
      subtitle: latestAttempt
        ? `Attempt #${latestAttempt.attemptNumber} via Razorpay Test Sandbox (${latestAttempt.actionType})`
        : 'Ready for execution dispatch',
      description: latestAttempt?.reason || 'Dispatched execution through BullMQ background workers.',
      status: latestAttempt ? (latestAttempt.status === 'SUCCESS' ? 'OPERATIONAL' : latestAttempt.status === 'PENDING' ? 'EXECUTING' : 'FAILED') : 'PENDING',
      statusText: latestAttempt ? latestAttempt.status : 'STANDBY',
      timestamp: latestAttempt?.executedAt || latestAttempt?.createdAt,
      active: Boolean(latestAttempt),
    },
    {
      num: '06',
      tag: 'VERIFY',
      title: 'Razorpay Webhook Verification',
      subtitle: transaction.razorpayOrderId
        ? `Order: ${transaction.razorpayOrderId}`
        : 'Awaiting webhook callback signature',
      description: isRecovered
        ? 'payment.captured event verified cryptographically with HMAC SHA-256'
        : isFailed
        ? 'payment.failed event confirmed by webhook worker'
        : 'Listening on endpoint /api/webhooks/razorpay',
      status: isRecovered ? 'VERIFIED' : isFailed ? 'FAILED' : 'PENDING',
      statusText: isRecovered ? 'HMAC VERIFIED' : isFailed ? 'FAILED' : 'LISTENING',
      timestamp: latestAttempt?.executedAt || latestAttempt?.createdAt,
      active: Boolean(latestAttempt && latestAttempt.status !== 'PENDING'),
    },
    {
      num: '07',
      tag: 'RECOVER',
      title: 'Financial Ledger Reconciliation',
      subtitle: isRecovered
        ? `RECONCILED — ${formatINR(latestAttempt?.amountRecovered || transaction.amount)} Recovered`
        : isFailed
        ? 'Recovery Unsuccessful (No funds touched)'
        : 'Settlement confirmation pending',
      description: isRecovered
        ? 'Revenue verified and synchronized with merchant ledger balance in PostgreSQL.'
        : 'Transaction state committed to immutable audit trail.',
      status: isRecovered ? 'RECOVERED' : isFailed ? 'FAILED' : 'PENDING',
      statusText: isRecovered ? 'RECONCILED' : isFailed ? 'TERMINATED' : 'WAITING',
      timestamp: latestAttempt?.executedAt || latestAttempt?.createdAt,
      active: Boolean(isRecovered || (latestAttempt && isFailed)),
    },
  ];

  return (
    <div className="relative pl-7 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
      {steps.map((step) => {
        return (
          <div key={step.num} className="relative group font-mono">
            {/* Rail Node Indicator */}
            <div
              className={`absolute -left-7 sm:-left-8 top-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all ${
                step.active
                  ? 'bg-[#070B17] border-primary/50 text-primary shadow-[0_0_8px_rgba(193,193,255,0.2)]'
                  : 'bg-[#070B17] border-white/10 text-on-surface-variant/40'
              }`}
            >
              {step.num}
            </div>

            {/* Continuous Rail Step Row (Surface 2) */}
            <div
              className={`p-3.5 sm:p-4 rounded-lg border transition-all ${
                step.active
                  ? 'bg-surface/50 border-white/10 hover:border-white/20'
                  : 'bg-surface/20 border-white/5 opacity-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-primary/70 font-bold tracking-widest uppercase">
                    {step.tag}
                  </span>
                  <span className="text-xs font-bold font-geist text-on-surface">
                    {step.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <StatusIndicator status={step.status} label={step.statusText} />
                  {step.timestamp && (
                    <span className="text-[10px] text-on-surface-variant/50 hidden sm:inline">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-primary/90 font-medium mb-1 font-geist">
                {step.subtitle}
              </div>

              <p className="text-xs text-on-surface-variant/70 leading-relaxed font-geist">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
