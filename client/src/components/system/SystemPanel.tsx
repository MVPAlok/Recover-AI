import React from 'react';

interface SystemPanelProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  borderVariant?: 'primary' | 'subtle' | 'error' | 'secondary';
}

export const SystemPanel: React.FC<SystemPanelProps> = ({
  children,
  className = '',
  glow = true,
  borderVariant = 'primary',
}) => {
  const borderStyles = {
    primary: 'border-primary/20',
    subtle: 'border-white/10',
    error: 'border-error/30 shadow-[0_0_50px_rgba(255,180,171,0.1)]',
    secondary: 'border-secondary/30',
  }[borderVariant];

  return (
    <div
      className={`bg-surface-container-high/80 backdrop-blur-xl border rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 overflow-hidden shadow-2xl relative ${borderStyles} ${className}`}
    >
      {glow && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      )}
      {children}
    </div>
  );
};
