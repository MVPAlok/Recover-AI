import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'emerald' | 'rose' | 'amber' | 'indigo';
  };
  trend?: string;
}

export function formatINR(val: number): string {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)}L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
}) => {
  const badgeStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className="p-2 rounded-lg bg-slate-800/80 text-slate-300">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="my-1">
        <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</div>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs">
        {subtitle && <span className="text-slate-400">{subtitle}</span>}
        {badge && (
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${badgeStyles[badge.variant]}`}>
            {badge.text}
          </span>
        )}
        {trend && <span className="text-emerald-400 font-medium">{trend}</span>}
      </div>
    </div>
  );
};
