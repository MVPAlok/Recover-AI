import React from 'react';

export type SystemStatusType =
  | 'OPERATIONAL'
  | 'EXECUTING'
  | 'VERIFIED'
  | 'RECOVERED'
  | 'DEGRADED'
  | 'FAILED'
  | 'WARNING'
  | 'PENDING';

interface StatusIndicatorProps {
  status: SystemStatusType | string;
  label?: string;
  className?: string;
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className = '',
  pulse = false,
}) => {
  const norm = String(status).toUpperCase();

  let dotColor = 'bg-primary';
  let textColor = 'text-primary';
  let shouldPulse = pulse;

  if (['OPERATIONAL', 'HEALTHY', 'VERIFIED', 'RECOVERED', 'SUCCESS', 'CAPTURED', 'CLEAN', 'NORMAL', 'READY', 'UP'].includes(norm)) {
    dotColor = 'bg-secondary';
    textColor = 'text-secondary';
  } else if (['EXECUTING', 'IN_PROGRESS', 'ANALYZING', 'PROCESSING', 'SYNCED'].includes(norm)) {
    dotColor = 'bg-primary';
    textColor = 'text-primary';
    shouldPulse = true;
  } else if (['WARNING', 'PENDING', 'WAITING', 'WAIT', 'REQUIRES_REVIEW', 'CONFIGURED', 'FALLBACK'].includes(norm)) {
    dotColor = 'bg-tertiary';
    textColor = 'text-tertiary';
  } else if (['DEGRADED', 'FAILED', 'HIGH', 'ERROR', 'DOWN', 'STOP', 'CANCELLED'].includes(norm)) {
    dotColor = 'bg-error';
    textColor = 'text-error';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2 font-mono text-[10px] sm:text-xs font-bold tracking-wider ${textColor} ${className}`}>
      <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dotColor} ${shouldPulse ? 'animate-pulse' : ''}`} />
      <span>{label || norm}</span>
    </div>
  );
};
