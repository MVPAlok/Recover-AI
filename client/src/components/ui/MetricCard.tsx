import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    text: string;
    variant: 'emerald' | 'rose' | 'amber' | 'indigo' | 'cyan';
  };
  trend?: string;
}

export function formatINR(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
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
  return (
    <div className="bg-surface-container-high/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] sm:text-[11px] tracking-wider text-on-surface-variant/70 uppercase">
          {title}
        </span>
        {Icon && (
          <div className="text-primary/70">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="text-xl sm:text-2xl md:text-3xl font-bold font-geist text-on-surface tracking-tight my-1">
        {value}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 font-mono text-[10px] sm:text-[11px]">
        {subtitle && <span className="text-on-surface-variant/70 truncate">{subtitle}</span>}
        {badge && (
          <span className="text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded text-[9px] sm:text-[10px]">
            {badge.text}
          </span>
        )}
        {trend && <span className="text-secondary font-bold">{trend}</span>}
      </div>
    </div>
  );
};
