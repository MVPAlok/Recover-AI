import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`animate-pulse bg-surface-container-high/60 border border-outline-variant/20 rounded-xl ${className}`} />;
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest/80 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-36" />
      <div className="flex justify-between items-center pt-2 border-t border-outline-variant/15">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="bg-surface-container-lowest/80 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-5 space-y-3 shadow-xl">
      <div className="flex gap-4 border-b border-outline-variant/25 pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};
