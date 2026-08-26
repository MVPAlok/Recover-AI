import React from 'react';

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  badge?: React.ReactNode;
  className?: string;
}

export const DataRow: React.FC<DataRowProps> = ({
  label,
  value,
  valueClassName = 'text-on-surface',
  badge,
  className = '',
}) => {
  return (
    <div
      className={`flex justify-between items-center p-2.5 sm:p-3 rounded bg-surface/50 border border-white/5 font-mono text-xs ${className}`}
    >
      <span className="text-on-surface-variant/70 text-[11px] sm:text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[11px] sm:text-xs ${valueClassName}`}>{value}</span>
        {badge}
      </div>
    </div>
  );
};
