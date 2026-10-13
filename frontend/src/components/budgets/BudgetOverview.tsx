import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BudgetSummary } from '@/types';
import { getBudgetStatus } from '@/utils/budgetStatus';

const money = new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPkr = (value: number) => `PKR ${money.format(value)}`;

export default function BudgetOverview({ summary }: { summary: BudgetSummary }) {
  const hasBudget = summary.budget !== null;
  const progress = Math.min(100, Math.max(0, summary.percentageUsed ?? 0));
  const status = getBudgetStatus(summary.percentageUsed);
  const exceeded = status === 'exceeded';
  const approaching = status === 'approaching';

  return (
    <div className="space-y-5">
      {exceeded && summary.remaining !== null && (
        <div role="alert" className="flex gap-3 rounded-lg border border-danger-border bg-danger-soft p-4 text-danger">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Budget exceeded</p>
            <p className="mt-0.5 text-sm">Exceeded amount: {formatPkr(Math.max(0, -summary.remaining))}.</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Monthly Budget', hasBudget ? formatPkr(summary.budget!) : 'Not set'],
          ['Amount spent', formatPkr(summary.spent)],
          ['Remaining amount', summary.remaining === null ? 'Not set' : formatPkr(summary.remaining)],
          ['Percentage used', summary.percentageUsed === null ? 'Not set' : `${summary.percentageUsed.toFixed(1)}%`],
        ].map(([label, value]) => (
          <div key={label} className={`rounded-lg border p-4 ${label === 'Remaining amount' && exceeded ? 'border-danger-border bg-danger-soft' : 'border-line bg-slate-50/70'}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`mt-2 break-words text-lg font-bold tabular-nums ${label === 'Remaining amount' && exceeded ? 'text-danger' : 'text-slate-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {hasBudget ? (
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span className="text-content-muted">Budget usage</span>
            <span className={exceeded ? 'text-danger' : 'text-slate-700'}>
              {summary.percentageUsed!.toFixed(1)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Budget usage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${summary.percentageUsed!.toFixed(1)}% of budget used`}
            className="h-2.5 overflow-hidden rounded-full bg-slate-100"
          >
            <div className={`h-full rounded-full transition-all ${exceeded ? 'bg-danger' : approaching ? 'bg-warning' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
          </div>
          {!exceeded && (
            <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${approaching ? 'text-amber-700' : 'text-emerald-700'}`}>
              {approaching ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {approaching ? 'Approaching budget limit' : 'Within budget'}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-content-muted">Fuel spending is tracked automatically from your purchase records.</p>
      )}
    </div>
  );
}
