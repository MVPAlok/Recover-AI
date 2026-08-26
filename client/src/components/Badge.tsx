import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  const variantStyles = {
    primary: 'bg-primary-container/20 text-primary-fixed-dim border-primary/30 shadow-[0_0_8px_rgba(91,91,247,0.15)]',
    secondary: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.15)]',
    tertiary: 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
    error: 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
