import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-xs hover:bg-accent-strong active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  secondary:
    'border border-line bg-surface text-content shadow-xs hover:bg-surface-muted hover:border-slate-300 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  outline:
    'border border-line bg-transparent text-content hover:bg-surface-muted hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  danger:
    'bg-danger text-white shadow-xs hover:bg-danger-strong active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2',
  ghost:
    'text-content-muted hover:bg-surface-muted hover:text-content focus-visible:ring-2 focus-visible:ring-accent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs font-medium gap-1.5',
  md: 'h-10 px-4 text-sm font-medium gap-2',
  lg: 'h-11 px-5 text-sm font-semibold gap-2',
};

export const Button = ({
  className = '',
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) => (
  <button
    className={`inline-flex items-center justify-center rounded-control select-none transition-all duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

