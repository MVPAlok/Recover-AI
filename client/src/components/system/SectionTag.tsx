import React from 'react';

interface SectionTagProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'error' | 'warning';
  className?: string;
}

export const SectionTag: React.FC<SectionTagProps> = ({
  label,
  variant = 'primary',
  className = '',
}) => {
  const variantStyles = {
    primary: 'border-primary/30 bg-primary/10 text-primary',
    secondary: 'border-secondary/30 bg-secondary/10 text-secondary',
    error: 'border-error/30 bg-error/10 text-error',
    warning: 'border-tertiary/30 bg-tertiary/10 text-tertiary',
  }[variant];

  return (
    <span
      className={`font-mono text-[9px] sm:text-[10px] tracking-widest border px-2.5 sm:px-3 py-1 sm:py-1.5 rounded inline-block backdrop-blur-sm uppercase ${variantStyles} ${className}`}
    >
      {label}
    </span>
  );
};
