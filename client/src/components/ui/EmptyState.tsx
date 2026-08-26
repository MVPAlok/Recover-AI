import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="bg-surface-container-lowest/80 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-xl">
      <div className="p-4 rounded-2xl bg-surface-container-high/60 border border-outline-variant/30 text-primary-fixed-dim mb-4 shadow-inner">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold font-geist text-on-surface mb-1.5">{title}</h3>
      <p className="text-xs text-on-surface-variant max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-container hover:bg-primary-container/90 text-on-primary-container transition-all shadow-md active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
