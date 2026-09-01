import type { ReactNode, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = ({
  label,
  error,
  hint,
  children,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="block">
    <div className="flex items-center justify-between">
      <label className="field-label text-slate-700">{label}</label>
    </div>
    {hint && <p className="field-hint mb-1.5">{hint}</p>}
    <div className="relative mt-1.5">
      <select
        className={`field-control appearance-none pr-9 ${error ? '!border-danger focus:!border-danger focus:!ring-danger/15' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
    </div>
    {error && (
      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
        <span className="inline-block h-1 w-1 rounded-full bg-danger" />
        {error}
      </p>
    )}
  </div>
);

