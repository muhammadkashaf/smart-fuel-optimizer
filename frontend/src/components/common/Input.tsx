import { useId, type InputHTMLAttributes } from 'react';

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
}) => {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className="block">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="field-label text-slate-700">
          {label}
        </label>
      </div>
      {hint && <p className="field-hint mb-1.5">{hint}</p>}
      <div className="relative mt-1.5">
        <input
          id={id}
          aria-invalid={Boolean(error) || undefined}
          className={`field-control ${props.type === 'date' ? 'cursor-pointer' : ''} ${error ? '!border-danger focus:!border-danger focus:!ring-danger/15' : ''} ${className}`}
          {...props}
          onClick={
            props.type === 'date'
              ? (event) => {
                  props.onClick?.(event);
                  if (
                    event.defaultPrevented ||
                    event.currentTarget.disabled ||
                    event.currentTarget.readOnly
                  )
                    return;
                  try {
                    event.currentTarget.showPicker?.();
                  } catch {
                    // The native calendar icon remains available if showPicker is unsupported.
                  }
                }
              : props.onClick
          }
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
};
