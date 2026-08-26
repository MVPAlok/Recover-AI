import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'secondary' | 'error';
  arrow?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  variant = 'primary',
  arrow = true,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-primary text-surface-dim hover:bg-primary-fixed border border-primary/40 shadow-[0_0_25px_rgba(193,193,255,0.25)] hover:shadow-[0_0_35px_rgba(193,193,255,0.4)]',
    outline:
      'bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-surface-dim backdrop-blur-sm',
    secondary:
      'bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary hover:text-surface-dim backdrop-blur-sm',
    error:
      'bg-error/10 text-error border border-error/30 hover:bg-error hover:text-surface-dim backdrop-blur-sm',
  }[variant];

  return (
    <button
      className={`font-mono text-[10px] sm:text-xs tracking-wider sm:tracking-widest uppercase px-4 sm:px-6 py-2.5 sm:py-3 rounded transition-all duration-200 inline-flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none font-bold ${variantStyles} ${className}`}
      {...props}
    >
      <span>{children}</span>
      {arrow && <span className="text-sm leading-none">&rarr;</span>}
    </button>
  );
};
