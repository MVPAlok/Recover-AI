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
    primary: 'border-primary/40 shadow-[0_0_40px_rgba(91,91,247,0.25)]',
    subtle: 'border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
    error: 'border-error/40 shadow-[0_0_50px_rgba(255,180,171,0.25)]',
    secondary: 'border-secondary/40 shadow-[0_0_40px_rgba(0,229,153,0.2)]',
  }[borderVariant];

  return (
    <div
      className={`bg-[#0d152a]/80 backdrop-blur-2xl border rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative ${borderStyles} ${className}`}
    >
      {/* Top glowing line accent matching Landing Page cards */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

      {glow && (
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/25 via-indigo-500/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
      )}
      {children}
    </div>
  );
};
