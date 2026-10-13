import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';
import { getBudgetSummary } from '@/api/budgetApi';
import BudgetOverview from './BudgetOverview';
import { ErrorState } from '@/components/common';
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

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="app-panel p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">This month's fuel budget</h2>
            <p className="text-xs text-content-muted">Fuel purchases recorded this month</p>
          </div>
        </div>
        <Link to="/fuel-budget" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-strong">
          View budget <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {loading ? <p role="status" className="text-sm text-content-muted">Loading budget summary...</p> : error ? (
        <ErrorState message={error} retry={load} />
      ) : summary?.budget === null ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-line bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-900">No monthly budget set</h3>
            <p className="mt-1 text-sm text-content-muted">Set a limit to track your remaining amount and progress.</p>
            <Link to="/fuel-budget" className="mt-4 inline-flex h-8 items-center rounded-control bg-accent px-2.5 text-xs font-medium text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Set a budget</Link>
          </div>
          <BudgetOverview summary={summary} />
        </div>
      ) : summary ? <BudgetOverview summary={summary} /> : null}
    </section>
  );
}
