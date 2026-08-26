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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.15)] ${className}`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Success
        </span>
      );
    }
    if (normalized === 'FAILED') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)] ${className}`}>
          <XCircle className="w-3 h-3 text-rose-400" />
          Failed
        </span>
      );
    }
    if (normalized === 'REFUNDED') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)] ${className}`}>
          <RotateCw className="w-3 h-3 text-purple-400" />
          Refunded
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 ${className}`}>
        <Clock className="w-3 h-3 text-amber-400" />
        Pending
      </span>
    );
  }

  // Payment Status
  if (type === 'payment') {
    switch (normalized as PaymentStatus) {
      case 'CAPTURED':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 ${className}`}>
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            CAPTURED
          </span>
        );
      case 'AUTHORIZED':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 ${className}`}>
            <Clock className="w-2.5 h-2.5 text-cyan-400" />
            AUTHORIZED
          </span>
        );
      case 'CREATED':
      case 'PENDING':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 ${className}`}>
            <Clock className="w-2.5 h-2.5 text-amber-400" />
            {normalized}
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30 ${className}`}>
            <XCircle className="w-2.5 h-2.5 text-rose-400" />
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
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.2)] ${className}`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            RECOVERED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-primary-container/20 text-primary-fixed-dim border border-primary/40 shadow-[0_0_10px_rgba(91,91,247,0.2)] ${className}`}>
            <RotateCw className="w-3 h-3 animate-spin text-primary" />
            IN PROGRESS
          </span>
        );
      case 'REQUIRES_REVIEW':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] ${className}`}>
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            NEEDS REVIEW
          </span>
        );
      case 'NOT_RECOVERED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30 ${className}`}>
            <XCircle className="w-3 h-3 text-rose-400" />
            NOT RECOVERED
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-surface-container-high text-outline border border-outline-variant/30 ${className}`}>
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
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${className}`}>
            <RotateCw className="w-3 h-3 text-emerald-400" />
            RETRY
          </span>
        );
      case 'REMIND':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-primary-container/20 text-primary-fixed-dim border border-primary/30 ${className}`}>
            <Send className="w-3 h-3 text-primary-fixed" />
            REMIND
          </span>
        );
      case 'ESCALATE':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30 ${className}`}>
            <UserCheck className="w-3 h-3 text-purple-400" />
            ESCALATE
          </span>
        );
      case 'WAIT':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 ${className}`}>
            <PauseCircle className="w-3 h-3 text-amber-400" />
            WAIT
          </span>
        );
      case 'STOP':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-surface-container-high text-outline border border-outline-variant/30 ${className}`}>
            <Ban className="w-3 h-3" />
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
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.15)] ${className}`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Executed
          </span>
        );
      case 'FAILED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 ${className}`}>
            <XCircle className="w-3 h-3 text-rose-400" />
            Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-surface-container text-outline border border-outline-variant/30 ${className}`}>
            <Ban className="w-3 h-3" />
            Cancelled
          </span>
        );
      case 'EXECUTING':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-primary-container/20 text-primary-fixed-dim border border-primary/30 ${className}`}>
            <RotateCw className="w-3 h-3 animate-spin text-primary" />
            Executing
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 ${className}`}>
            <Clock className="w-3 h-3 text-amber-400" />
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
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 ${className}`}>
            Low Risk
          </span>
        );
      case 'HIGH':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider uppercase bg-rose-500/10 text-rose-300 border border-rose-500/30 ${className}`}>
            High Risk
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 ${className}`}>
            Med Risk
          </span>
        );
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-container text-on-surface border border-outline-variant/30 ${className}`}>
      {value}
    </span>
  );
};
