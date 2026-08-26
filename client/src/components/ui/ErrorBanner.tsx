import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Failed to load operational data',
  message,
  onRetry,
}) => {
  return (
    <div className="bg-error-container/15 border border-error/30 backdrop-blur-xl rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 my-3 text-error shadow-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-error-container/30 border border-error/30 text-error shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold font-geist text-on-error-container tracking-tight">{title}</h4>
          <p className="text-xs text-error/90 font-mono mt-1 leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-error-container/40 hover:bg-error-container/60 border border-error/40 text-on-error-container transition-all active:scale-95 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
