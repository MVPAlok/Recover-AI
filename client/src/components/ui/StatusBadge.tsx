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
import { RecoveryDecision, RecoveryStatus, RiskLevel } from '../../types';

interface StatusBadgeProps {
  type: 'transaction' | 'decision' | 'recovery' | 'risk';
  value: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, className = '' }) => {
  const normalized = value?.toUpperCase();

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
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        Pending
      </span>
    );
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
  if (type === 'recovery') {
    switch (normalized as RecoveryStatus | 'READY') {
      case 'SUCCESS':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Recovered
          </span>
        );
      case 'EXECUTED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 ${className}`}>
            <RotateCw className="w-3.5 h-3.5" />
            Executed
          </span>
        );
      case 'PENDING':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'CANCELLED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
            <Ban className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case 'FAILED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
            <XCircle className="w-3.5 h-3.5" />
            Attempt Failed
          </span>
        );
      case 'READY':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            Ready for Recovery
          </span>
        );
    }
  }

  // Risk Level
  if (type === 'risk') {
    switch (normalized as RiskLevel) {
      case 'LOW':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
            Low Risk
          </span>
        );
      case 'MEDIUM':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
            Medium Risk
          </span>
        );
      case 'HIGH':
      default:
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
            High Risk
          </span>
        );
    }
  }

  return <span className={`px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 ${className}`}>{value}</span>;
};
