import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Pencil, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBudget, getBudgetSummary, getPreviousBudget, putBudget } from '@/api/budgetApi';
import { formatPkr } from '@/components/budgets/BudgetOverview';
import { Button, Input, PageHeader, Skeleton, Spinner } from '@/components/common';
import type { Budget, BudgetSummary } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';
import { getBudgetStatus } from '@/utils/budgetStatus';
import { budgetAmountCaret, formatBudgetAmountInput, parseBudgetAmountInput } from '@/utils/budgetAmount';

type Period = { year: number; month: number };
const initialDate = new Date();
const years = Array.from({ length: 101 }, (_, index) => 2000 + index);
const months = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleString('en-PK', { month: 'long' }),
);
const periodKey = ({ year, month }: Period) => `${year}-${month}`;

export default function FuelBudgetPage() {
  const [period, setPeriod] = useState<Period>({ year: initialDate.getFullYear(), month: initialDate.getMonth() + 1 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(initialDate.getFullYear());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [previousBudget, setPreviousBudget] = useState<Budget | null>(null);
  const [previousError, setPreviousError] = useState('');
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [loadedPeriod, setLoadedPeriod] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [settingDifferent, setSettingDifferent] = useState(false);
  const [copyConfirm, setCopyConfirm] = useState(false);
  const requestId = useRef(0);
  const drafts = useRef(new Map<string, string>());
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedKey = periodKey(period);
  const savedAmount = budget ? formatBudgetAmountInput(String(budget.amount)) : '';
  const changed = amount !== savedAmount;
  const now = new Date();
  const isCurrent = period.year === now.getFullYear() && period.month === now.getMonth() + 1;
  const isFirst = period.year === 2000 && period.month === 1;
  const isLast = period.year === 2100 && period.month === 12;

  const selectPeriod = (next: Period) => {
    if (saving || next.year < 2000 || next.year > 2100 || next.month < 1 || next.month > 12) return;
    setPickerOpen(false);
    if (periodKey(next) === selectedKey) return;
    requestId.current += 1;
    setStatus('loading');
    setEditing(false);
    setSettingDifferent(false);
    setCopyConfirm(false);
    setPeriod(next);
  };

  const moveMonth = (offset: number) => {
    const date = new Date(period.year, period.month - 1 + offset, 1);
    selectPeriod({ year: date.getFullYear(), month: date.getMonth() + 1 });
  };

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setStatus('loading');
    try {
      const [budgetResponse, summaryResponse] = await Promise.all([
        getBudget(period.year, period.month),
        getBudgetSummary(period.year, period.month),
      ]);
      const nextBudget = budgetResponse.data.budget;
      let previous: Budget | null = null;
      let lookupError = '';
      if (!nextBudget) {
        try {
          previous = (await getPreviousBudget(period.year, period.month)).data.budget;
        } catch (reason) {
          lookupError = getErrorMessage(reason, 'Could not check earlier budgets.');
        }
      }
      if (currentRequest !== requestId.current) return;
      setBudget(nextBudget);
      setPreviousBudget(previous);
      setPreviousError(lookupError);
      setSummary(summaryResponse.data);
      setAmount(drafts.current.get(periodKey(period)) ?? (nextBudget ? formatBudgetAmountInput(String(nextBudget.amount)) : ''));
      setFormError('');
      setSavedNotice('');
      setSettingDifferent(false);
      setCopyConfirm(false);
      setLoadedPeriod(periodKey(period));
      setStatus('ready');
    } catch (reason) {
      if (currentRequest !== requestId.current) return;
      setError(getErrorMessage(reason, 'We could not load your monthly budget.'));
      setStatus('error');
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!pickerOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [pickerOpen]);

  const persistBudget = async (value: number, notice: string) => {
    setSaving(true);
    setFormError('');
    try {
      const response = await putBudget(period.year, period.month, value);
      setBudget(response.data.budget);
      setAmount(formatBudgetAmountInput(String(response.data.budget.amount)));
      drafts.current.delete(selectedKey);
      setEditing(false);
      setSettingDifferent(false);
      setCopyConfirm(false);
      setSavedNotice(notice);
      toast.success(response.data.message);
      try {
        const refreshed = await getBudgetSummary(period.year, period.month);
        setSummary(refreshed.data);
      } catch (reason) {
        setError(getErrorMessage(reason, 'Budget saved, but the summary could not be refreshed.'));
        setStatus('error');
      }
    } catch (reason) {
      setFormError(getErrorMessage(reason, 'We could not save your budget.'));
    } finally {
      setSaving(false);
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = parseBudgetAmountInput(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setFormError('Enter an amount greater than 0');
      return;
    }
    await persistBudget(value, `Budget saved for ${months[period.month - 1]} ${period.year}.`);
  };

  const copyPrevious = async () => {
    if (!previousBudget || budget) return;
    await persistBudget(previousBudget.amount, `Copied ${formatPkr(previousBudget.amount)} from ${months[previousBudget.month - 1]} ${previousBudget.year}.`);
  };

  const ready = status === 'ready' && loadedPeriod === selectedKey && summary !== null;
  const progress = Math.min(100, Math.max(0, summary?.percentageUsed ?? 0));
  const usageStatus = getBudgetStatus(summary?.percentageUsed);
  const exceeded = usageStatus === 'exceeded';
  const near = usageStatus === 'approaching';
  const statusText = exceeded ? 'Budget exceeded' : near ? 'Approaching budget limit' : 'Within budget';
  const statusColor = exceeded ? 'text-danger' : near ? 'text-amber-700' : 'text-emerald-700';

  return (
    <div className="space-y-6">
      <PageHeader title="Fuel budget" subtitle="Track your fuel spending against a monthly limit." />

      <section className="app-panel relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div ref={pickerRef} className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">Budget month</p>
            <button type="button" disabled={saving} aria-expanded={pickerOpen} aria-controls="budget-month-picker"
              onClick={() => { setPickerYear(period.year); setPickerOpen((open) => !open); }}
              className="mt-1 inline-flex items-center gap-2 rounded-control text-lg font-semibold text-slate-900 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed">
              <CalendarDays className="h-4 w-4 text-accent" />
              {months[period.month - 1]} {period.year}
              <ChevronDown className="h-4 w-4 text-content-muted" />
            </button>
            {pickerOpen && <div id="budget-month-picker" className="absolute left-0 top-full z-20 mt-2 w-[min(21rem,calc(100vw-3rem))] rounded-card border border-line bg-surface p-4 shadow-overlay">
              <label htmlFor="picker-year" className="field-label">Year</label>
              <select id="picker-year" value={pickerYear} onChange={(event) => setPickerYear(Number(event.target.value))}
                className="field-control mt-1.5">
                {years.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {months.map((name, index) => {
                  const selected = pickerYear === period.year && index + 1 === period.month;
                  return <button key={name} type="button" aria-label={`${name} ${pickerYear}`} aria-pressed={selected}
                    onClick={() => selectPeriod({ year: pickerYear, month: index + 1 })}
                    className={`rounded-control px-2 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? 'bg-accent text-white' : 'text-slate-700 hover:bg-accent-soft hover:text-accent'}`}>
                    {name.slice(0, 3)}
                  </button>;
                })}
              </div>
            </div>}
          </div>
          <div className="flex items-center gap-2">
            {!isCurrent && <button type="button" disabled={saving}
              onClick={() => { const current = new Date(); selectPeriod({ year: current.getFullYear(), month: current.getMonth() + 1 }); }}
              className="mr-1 text-xs font-semibold text-accent hover:text-accent-strong disabled:cursor-not-allowed">
              Current month
            </button>}
            <button type="button" disabled={saving || isFirst} onClick={() => moveMonth(-1)}
              aria-label="Previous month" title="Previous month"
              className="grid h-9 w-9 place-items-center rounded-control border border-line text-content-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" disabled={saving || isLast} onClick={() => moveMonth(1)}
              aria-label="Next month" title="Next month"
              className="grid h-9 w-9 place-items-center rounded-control border border-line text-content-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {status === 'error' ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <p className="text-sm font-semibold text-danger">{error}</p>
            <Button type="button" variant="secondary" size="sm" onClick={load} className="mt-4">Try again</Button>
          </div>
        ) : !ready ? (
          <div role="status" aria-label="Loading monthly budget" className="space-y-5 px-5 py-7 sm:px-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-2.5 w-full" />
            <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
              <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 py-6 sm:px-6 sm:py-7">
              {summary.budget === null ? (
                <div>
                  <h2 className="text-base font-semibold text-slate-900">No monthly budget set for this month.</h2>
                  <p className="mt-1 text-sm text-content-muted">Set a limit to track how much you have left to spend.</p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-3">
                    <div><p className="text-xs font-semibold uppercase tracking-wider text-content-muted">Monthly Budget</p><p className="mt-1 text-lg font-semibold text-slate-500">Not set</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wider text-content-muted">Amount Spent</p><p className="mt-1 break-words text-lg font-semibold tabular-nums text-slate-900">{formatPkr(summary.spent)}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wider text-content-muted">Remaining Amount</p><p className="mt-1 text-lg font-semibold text-slate-500">Not set</p></div>
                  </div>
                </div>
              ) : (
                <>
                  {exceeded && summary.remaining !== null && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Budget exceeded by {formatPkr(Math.abs(summary.remaining))}
                  </div>}
                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">Monthly Budget</p>
                      <p className="mt-1 break-words text-xl font-semibold tabular-nums text-slate-900">{formatPkr(summary.budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">Amount Spent</p>
                      <p className="mt-1 break-words text-xl font-semibold tabular-nums text-slate-900">{formatPkr(summary.spent)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">Remaining Amount</p>
                      <p className={`mt-1 break-words text-xl font-semibold tabular-nums ${exceeded ? 'text-danger' : 'text-slate-900'}`}>{formatPkr(summary.remaining!)}</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3 text-xs font-medium">
                      <span className="text-content-muted">Budget usage</span>
                      <span className="tabular-nums text-slate-700">{summary.percentageUsed!.toFixed(1)}%</span>
                    </div>
                    <div role="progressbar" aria-label="Budget usage" aria-valuemin={0} aria-valuemax={100}
                      aria-valuenow={progress} aria-valuetext={`${summary.percentageUsed!.toFixed(1)}% of budget used`}
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${exceeded ? 'bg-danger' : near ? 'bg-warning' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
                      {exceeded || near ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {statusText}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-line bg-slate-50/50 px-5 py-4 sm:px-6">
              {budget && !editing ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-content-muted">Monthly limit: <span className="font-semibold text-slate-900">{formatPkr(budget.amount)}</span></p>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit budget
                  </Button>
                </div>
              ) : !budget && !settingDifferent ? (
                <div className="space-y-3">
                  {previousError && <p role="alert" className="text-xs text-danger">{previousError} You can still set a budget below.</p>}
                  {previousBudget && <p className="text-sm text-content-muted">
                    Latest earlier budget: <span className="font-semibold text-slate-900">{formatPkr(previousBudget.amount)}</span>
                    {' '}({months[previousBudget.month - 1]} {previousBudget.year})
                  </p>}
                  {copyConfirm && previousBudget ? (
                    <div className="rounded-lg border border-accent-border bg-accent-soft p-4">
                      <p className="text-sm font-semibold text-slate-900">Use {formatPkr(previousBudget.amount)} for {months[period.month - 1]} {period.year}?</p>
                      <p className="mt-1 text-xs text-content-muted">This creates a separate budget. Your {months[previousBudget.month - 1]} {previousBudget.year} budget stays unchanged.</p>
                      {formError && <p role="alert" className="mt-2 text-xs text-danger">{formError}</p>}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" size="sm" disabled={saving} onClick={copyPrevious}>{saving && <Spinner />}Confirm budget</Button>
                        <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => { setCopyConfirm(false); setFormError(''); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {previousBudget && <Button type="button" variant="secondary" size="sm" onClick={() => setCopyConfirm(true)}>Use previous month's budget</Button>}
                      <Button type="button" size="sm" onClick={() => setSettingDifferent(true)}>
                        {previousBudget ? 'Set different budget' : 'Set budget'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-accent" />
                    <h2 className="text-sm font-semibold text-slate-900">{budget ? 'Edit monthly budget' : 'Set monthly budget'}</h2>
                  </div>
                  <form onSubmit={save} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full sm:max-w-sm">
                      <Input id="budget-amount" aria-label="Budget amount in PKR" label="Budget amount (PKR)" type="text" inputMode="decimal" autoComplete="off"
                        value={amount} onChange={(event) => {
                          const input = event.currentTarget;
                          const raw = input.value;
                          const value = formatBudgetAmountInput(raw);
                          const caret = budgetAmountCaret(raw.slice(0, input.selectionStart ?? raw.length), value);
                          input.value = value;
                          input.setSelectionRange(caret, caret);
                          setAmount(value);
                          setFormError('');
                          setSavedNotice('');
                          if (value === savedAmount) drafts.current.delete(selectedKey);
                          else drafts.current.set(selectedKey, value);
                        }} placeholder="e.g. 20000" error={formError} aria-invalid={Boolean(formError)} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving || (Boolean(budget) && !changed)}>
                        {saving && <Spinner />}{budget ? 'Save changes' : 'Set budget'}
                      </Button>
                      <Button type="button" variant="ghost" disabled={saving} onClick={() => {
                        drafts.current.delete(selectedKey);
                        setAmount(savedAmount);
                        setFormError('');
                        setEditing(false);
                        setSettingDifferent(false);
                      }}>Cancel</Button>
                    </div>
                  </form>
                  {changed && !formError && <p className="mt-2 text-xs text-amber-700">Unsaved amount stays available if you switch months.</p>}
                </div>
              )}
              {savedNotice && <p role="status" className="mt-2 text-xs font-medium text-emerald-700">{savedNotice}</p>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
