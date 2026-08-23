import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCw,
  Send,
  UserCheck,
  PauseCircle,
  Ban,
} from 'lucide-react';
import { RecoveryDecision, RecoveryStatus, RiskLevel, PaymentStatus, TransactionRecoveryStatus } from '../../types';

interface StatusBadgeProps {
  type: 'transaction' | 'decision' | 'recovery' | 'payment' | 'recoveryState' | 'execution' | 'risk';
  value?: string | null;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value = '', className = '' }) => {
  const normalized = (value || '').toUpperCase();

  // Transaction Status
  if (type === 'transaction') {
    if (normalized === 'SUCCESS') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Success
        </span>
      );
    }
    if (normalized === 'FAILED') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    }
    if (normalized === 'REFUNDED') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 ${className}`}>
          <RotateCw className="w-3.5 h-3.5" />
          Refunded
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        Pending
      </span>
    );
  }

  // Payment Status
  if (type === 'payment') {
    switch (normalized as PaymentStatus) {
      case 'CAPTURED':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
            <CheckCircle2 className="w-3 h-3" />
            CAPTURED
          </span>
        );
      case 'AUTHORIZED':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 ${className}`}>
            <Clock className="w-3 h-3" />
            AUTHORIZED
          </span>
        );
      case 'UNPAID':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 ${className}`}>
            <Clock className="w-3 h-3" />
            UNPAID
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
    }
  }

  // Recovery State (Financial Outcome)
  if (type === 'recoveryState') {
    switch (normalized as TransactionRecoveryStatus) {
      case 'RECOVERED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            RECOVERED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 ${className}`}>
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            IN PROGRESS
          </span>
        );
      case 'REQUIRES_REVIEW':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            NEEDS REVIEW
          </span>
        );
      case 'NOT_RECOVERED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
            <XCircle className="w-3.5 h-3.5" />
            NOT RECOVERED
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
            NOT STARTED
          </span>
        );
    }
  }

  // Recovery Decision
  if (type === 'decision') {
    switch (normalized as RecoveryDecision) {
      case 'RETRY':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 ${className}`}>
            <RotateCw className="w-3.5 h-3.5" />
            RETRY
          </span>
        );
      case 'REMIND':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 ${className}`}>
            <Send className="w-3.5 h-3.5" />
            REMIND
          </span>
        );
      case 'ESCALATE':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 ${className}`}>
            <UserCheck className="w-3.5 h-3.5" />
            ESCALATE
          </span>
        );
      case 'WAIT':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 ${className}`}>
            <PauseCircle className="w-3.5 h-3.5" />
            WAIT
          </span>
        );
      case 'STOP':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
            <Ban className="w-3.5 h-3.5" />
            STOP
          </span>
        );
    }
  }

  // Recovery Execution Status
  if (type === 'recovery' || type === 'execution') {
    switch (normalized as RecoveryStatus) {
      case 'SUCCESS':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Executed
          </span>
        );
      case 'FAILED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
            <Ban className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case 'EXECUTING':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 ${className}`}>
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            Executing
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 ${className}`}>
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
    }
  }

  // Risk Level
  if (type === 'risk') {
    switch (normalized as RiskLevel) {
      case 'LOW':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
            Low Risk
          </span>
        );
      case 'HIGH':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
            High Risk
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
            Medium Risk
          </span>
        );
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 ${className}`}>
      {value}
    </span>
  );
};
