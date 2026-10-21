import { forwardRef, useEffect, useImperativeHandle, useRef, useId } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import { backspaceOtp, OTP_LENGTH } from './otpInputLogic';

export type OtpInputHandle = { focusFirst: () => void };

export const OtpInput = forwardRef<OtpInputHandle, {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: string;
  disabled?: boolean;
}>(function OtpInput({ value, onChange, label, error, disabled }, ref) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const currentValue = useRef(value);
  const focusedIndex = useRef(0);
  const errorId = useId();
  useEffect(() => { currentValue.current = value; }, [value]);
  useImperativeHandle(ref, () => ({ focusFirst: () => focus(0) }));

  const focus = (index: number) => {
    const nextIndex = Math.min(OTP_LENGTH - 1, Math.max(0, index));
    focusedIndex.current = nextIndex;
    const input = inputs.current[nextIndex];
    input?.focus();
    input?.select();
  };
  const update = (nextValue: string) => {
    currentValue.current = nextValue;
    onChange(nextValue);
  };
  const changeAt = (index: number, digit: string) => {
    const next = currentValue.current.padEnd(OTP_LENGTH, ' ').split('');
    next[index] = digit || ' ';
    update(next.join(''));
  };
  const distribute = (index: number, text: string) => {
    const allDigits = text.replace(/\D/g, '');
    const start = allDigits.length >= OTP_LENGTH ? 0 : index;
    const digits = allDigits.slice(0, OTP_LENGTH - start);
    if (!digits) return;
    const next = (start === 0 && digits.length === OTP_LENGTH ? '' : currentValue.current).padEnd(OTP_LENGTH, ' ').split('');
    for (let offset = 0; offset < digits.length; offset += 1) next[start + offset] = digits[offset];
    update(next.join(''));
    focus(start + digits.length);
  };
  const handleChange = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const raw = event.target.value;
    if (raw.length > 1) return distribute(index, raw);
    const digit = raw.replace(/\D/g, '');
    if (raw && !digit) return;
    changeAt(index, digit);
    if (digit) focus(index + 1);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const result = backspaceOtp(currentValue.current, focusedIndex.current);
      update(result.value);
      if (result.focusIndex !== focusedIndex.current) focus(result.focusIndex);
    } else if (event.key === 'Delete') {
      event.preventDefault();
      changeAt(focusedIndex.current, '');
    } else if (event.key === 'ArrowLeft') { event.preventDefault(); focus(focusedIndex.current - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); focus(focusedIndex.current + 1); }
    else if (event.key === 'Home') { event.preventDefault(); focus(0); }
    else if (event.key === 'End') { event.preventDefault(); focus(OTP_LENGTH - 1); }
  };

  return (
    <div>
      <p className="field-label mb-2">{label}</p>
      <div role="group" aria-label={label} aria-describedby={error ? errorId : undefined} className="grid w-full max-w-[21rem] grid-cols-6 gap-2 sm:gap-2.5">
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <input
            key={index}
            ref={(node) => { inputs.current[index] = node; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={6}
            value={value[index] ?? ''}
            onChange={(event) => handleChange(event, index)}
            onKeyDown={handleKeyDown}
            onPaste={(event: ClipboardEvent<HTMLInputElement>) => { event.preventDefault(); distribute(index, event.clipboardData.getData('text')); }}
            onFocus={(event) => { focusedIndex.current = index; event.currentTarget.select(); }}
            aria-label={`${label}, digit ${index + 1} of ${OTP_LENGTH}`}
            aria-invalid={Boolean(error) || undefined}
            disabled={disabled}
            className={`h-12 min-w-0 w-full rounded-control border bg-surface text-center text-xl font-semibold tabular-nums text-content outline-none transition-colors focus:border-accent focus:ring-3 focus:ring-accent/15 disabled:bg-surface-muted ${error ? 'border-danger' : 'border-line hover:border-slate-300'}`}
          />
        ))}
      </div>
      {error && <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});
