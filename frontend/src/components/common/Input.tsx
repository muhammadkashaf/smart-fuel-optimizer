import type { InputHTMLAttributes } from 'react';

export const Input = ({
  label,
  error,
  hint,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
}) => (
  <div className="block">
    <div className="flex items-center justify-between">
      <label className="field-label text-slate-700">{label}</label>
    </div>
    {hint && <p className="field-hint mb-1.5">{hint}</p>}
    <div className="relative mt-1.5">
      <input
        className={`field-control ${error ? '!border-danger focus:!border-danger focus:!ring-danger/15' : ''} ${className}`}
        {...props}
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

