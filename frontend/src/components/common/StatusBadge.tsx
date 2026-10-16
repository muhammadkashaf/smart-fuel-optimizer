import type { ReactNode } from 'react';

const tones = {
  neutral: 'border-line bg-slate-50 text-slate-600',
  accent: 'border-accent-border bg-accent-soft text-accent',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

export default function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
