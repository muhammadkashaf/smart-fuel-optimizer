import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';
import { getBudgetSummary } from '@/api/budgetApi';
import { formatPkr } from './BudgetOverview';
import { Button, Skeleton } from '@/components/common';
import { getBudgetStatus } from '@/utils/budgetStatus';
import type { BudgetSummary } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

export default function DashboardBudget() {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    try {
      const response = await getBudgetSummary(now.getFullYear(), now.getMonth() + 1);
      setSummary(response.data);
      setError('');
    } catch (reason) {
      setError(getErrorMessage(reason, 'We could not load your fuel budget.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const status = getBudgetStatus(summary?.percentageUsed ?? null);
  const exceeded = status === 'exceeded';
  const percentage = summary?.percentageUsed ?? 0;
  return (
    <section className="app-panel min-w-0 p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold">Budget overview</h2>
        </div>
        <Link to="/fuel-budget" className="dashboard-link">
          Manage <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {loading ? (
        <div role="status" aria-label="Loading budget" className="space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div role="alert">
          <p className="text-sm text-content-muted">{error}</p>
          <Button className="mt-4" size="sm" variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      ) : (
        summary && (
          <>
            <p className="text-xs text-content-muted">This month's limit</p>
            <p className="mt-2 break-words text-2xl font-bold tabular-nums">
              {summary.budget === null ? 'No monthly budget set' : formatPkr(summary.budget)}
            </p>
            {summary.budget !== null && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-content-muted">Budget used</span>
                  <span className="font-semibold">{percentage.toFixed(1)}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Monthly budget usage"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.max(0, percentage))}
                  aria-valuetext={`${percentage.toFixed(1)}% used`}
                  className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${exceeded ? 'bg-danger' : status === 'approaching' ? 'bg-warning' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </div>
            )}
            <dl className="mt-5 space-y-3 border-t border-line-subtle pt-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-content-muted">Amount spent</dt>
                <dd className="font-semibold tabular-nums">{formatPkr(summary.spent)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-content-muted">Remaining</dt>
                <dd className={`font-semibold tabular-nums ${exceeded ? 'text-danger' : ''}`}>
                  {summary.remaining === null ? 'Not set' : formatPkr(summary.remaining)}
                </dd>
              </div>
            </dl>
            {summary.budget === null ? (
              <div className="mt-5">
                <p className="text-xs text-content-muted">
                  Set a monthly limit to keep spending in view.
                </p>
                <Link to="/fuel-budget" className="dashboard-link mt-3">
                  Set a budget <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p
                role={exceeded ? 'alert' : undefined}
                className={`mt-5 rounded-lg px-3 py-2.5 text-xs font-medium ${exceeded ? 'bg-danger-soft text-danger' : status === 'approaching' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-emerald-700'}`}
              >
                {exceeded
                  ? `Budget exceeded · ${formatPkr(Math.max(0, -(summary.remaining ?? 0)))} over limit`
                  : status === 'approaching'
                    ? 'Approaching budget limit'
                    : 'Within budget'}
              </p>
            )}
          </>
        )
      )}
    </section>
  );
}
