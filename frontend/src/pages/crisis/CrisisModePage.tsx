import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Route, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCrisisMode, getCrisisRecommendations, setCrisisMode } from '@/api/crisisModeApi';
import { Button, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/common';
import StatusBadge from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/common/Skeleton';
import type { CrisisRecommendation, CrisisRecommendationsResponse, CrisisSummary } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

const resource = (amount: number, unit: 'L' | 'kWh') =>
  `${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(amount)} ${unit}`;
const displayDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
const severityTone = { HIGH: 'warning', MEDIUM: 'accent', INFO: 'neutral' } as const;
const severityLabel = { HIGH: 'High priority', MEDIUM: 'Suggestion', INFO: 'Route tip' };

export default function CrisisModePage() {
  const [enabled, setEnabled] = useState(false);
  const [modeKnown, setModeKnown] = useState(false);
  const [data, setData] = useState<CrisisRecommendationsResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const toggleInFlight = useRef(false);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setStatus('loading');
    setModeKnown(false);
    try {
      const state = await getCrisisMode();
      if (currentRequest !== requestId.current) return;
      setEnabled(state.data.enabled);
      setModeKnown(true);
      const recommendations = state.data.enabled ? await getCrisisRecommendations() : null;
      if (currentRequest !== requestId.current) return;
      const currentEnabled = recommendations?.data.enabled ?? state.data.enabled;
      setEnabled(currentEnabled);
      setData(currentEnabled ? (recommendations?.data ?? null) : null);
      setError('');
      setStatus('ready');
    } catch (reason) {
      if (currentRequest !== requestId.current) return;
      setError(getErrorMessage(reason, 'We could not load Crisis Mode.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const toggle = async () => {
    if (toggleInFlight.current || !modeKnown || status === 'loading') return;
    toggleInFlight.current = true;
    requestId.current += 1;
    setSaving(true);
    try {
      const next = await setCrisisMode(!enabled);
      setEnabled(next.data.enabled);
      toast.success(next.data.message);
      if (next.data.enabled) {
        try {
          const recommendations = await getCrisisRecommendations();
          setData(recommendations.data.enabled ? recommendations.data : null);
          setEnabled(recommendations.data.enabled);
          setStatus('ready');
        } catch (reason) {
          setError(getErrorMessage(reason, 'We could not load Crisis Mode recommendations.'));
          setStatus('error');
        }
      } else {
        setData(null);
        setStatus('ready');
      }
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'We could not update Crisis Mode.'));
    } finally {
      toggleInFlight.current = false;
      setSaving(false);
    }
  };

  const summary = data?.summary;
  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Crisis Mode"
        subtitle="Prioritize essential travel and reduce unnecessary fuel use during shortages."
        action={
          modeKnown &&
          status !== 'loading' && (
            <button
              type="button"
              role="switch"
              aria-label="Crisis Mode"
              aria-checked={enabled}
              disabled={saving}
              aria-busy={saving}
              onClick={toggle}
              className="inline-flex h-10 items-center gap-3 rounded-control border border-line bg-surface px-3 text-sm font-semibold text-slate-700 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              <span>Crisis Mode {enabled ? 'ON' : 'OFF'}</span>
              <span
                aria-hidden="true"
                className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-200 ${enabled ? 'bg-accent' : 'bg-slate-300'}`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${enabled ? 'translate-x-4' : ''}`}
                />
              </span>
              {saving && <Spinner />}
            </button>
          )
        }
      />

      {status === 'loading' ? (
        <div role="status" aria-label="Loading Crisis Mode recommendations">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="app-panel space-y-3 p-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="app-panel space-y-3 p-5">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : status === 'error' ? (
        <ErrorState message={error} retry={load} />
      ) : !enabled ? (
        <EmptyState
          icon={ShieldCheck}
          title="Crisis Mode is currently off."
          description="Enable it to receive fuel-conservation recommendations based on your planned trips."
          action={
            <Button onClick={toggle} disabled={saving}>
              {saving && <Spinner />}Enable Crisis Mode
            </Button>
          }
        />
      ) : data && summary ? (
        <>
          <section
            aria-label="Planned travel summary"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <SummaryCard
              label="Planned trips"
              value={summary.plannedTrips}
              detail="Today and upcoming"
            />
            <SummaryCard
              label="Non-essential trips"
              value={summary.nonEssentialTrips}
              detail="Consider whether these can wait"
            />
            <SummaryCard
              label="Trips needing routes"
              value={summary.tripsWithoutRoutes}
              detail="Missing or outdated route estimates"
            />
            <div className="app-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Estimated planned resources
              </p>
              {summary.tripsWithEstimates ? (
                <div className="mt-3 space-y-1.5 text-sm font-semibold tabular-nums text-slate-900">
                  {summary.estimatedPlannedFuelLiters > 0 && (
                    <p>Fuel: {resource(summary.estimatedPlannedFuelLiters, 'L')}</p>
                  )}
                  {summary.estimatedPlannedEnergyKwh > 0 && (
                    <p>Energy: {resource(summary.estimatedPlannedEnergyKwh, 'kWh')}</p>
                  )}
                  {summary.estimatedPlannedFuelLiters === 0 &&
                    summary.estimatedPlannedEnergyKwh === 0 && <p>0 estimated</p>}
                </div>
              ) : (
                <p className="mt-3 text-sm font-medium text-content-muted">
                  No route estimates yet
                </p>
              )}
              <p className="mt-2 text-xs text-content-muted">
                From {summary.tripsWithEstimates} planned trip
                {summary.tripsWithEstimates === 1 ? '' : 's'} with saved estimates
              </p>
            </div>
          </section>

          <section aria-labelledby="crisis-recommendations-title" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="crisis-recommendations-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Recommendations
                </h2>
                <p className="mt-0.5 text-sm text-content-muted">
                  Suggestions based on your current planned trips. You choose what to change.
                </p>
              </div>
              <span className="text-xs font-medium text-content-muted">
                {data.recommendations.length} suggestion
                {data.recommendations.length === 1 ? '' : 's'}
              </span>
            </div>
            {summary.plannedTrips === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No planned trips to analyze."
                description="Crisis Mode will provide suggestions when you plan a trip."
              />
            ) : data.recommendations.length === 0 ? (
              <div className="app-panel flex items-start gap-4 p-5 sm:p-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-content">
                    No immediate fuel-saving actions found.
                  </h3>
                  <p className="mt-1 text-sm text-content-muted">
                    Your currently planned trips are already prioritized and optimized.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recommendations.map((item) => (
                  <RecommendationCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <ErrorState message="The recommendations could not be loaded." retry={load} />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: CrisisSummary['plannedTrips'];
  detail: string;
}) {
  return (
    <div className="app-panel p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-content-muted">{detail}</p>
    </div>
  );
}

function RecommendationCard({ item }: { item: CrisisRecommendation }) {
  const navigate = useNavigate();
  return (
    <article className="app-panel p-5 transition-shadow duration-200 hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={severityTone[item.severity]}>
              {severityLabel[item.severity]}
            </StatusBadge>
            <span className="text-xs text-content-muted">
              {item.type === 'COMBINE_TRIPS' ? 'Trip combination' : 'Trip planning'}
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm text-content-muted">{item.message}</p>
          </div>
          <div className="space-y-2">
            {item.relatedTrips.map((trip) => (
              <div
                key={trip.id}
                className="min-w-0 space-y-1 rounded-lg bg-slate-50/70 px-3 py-2 text-sm"
              >
                <div
                  className="flex min-w-0 items-start gap-2 font-medium text-slate-800"
                  title={`${trip.start} → ${trip.destination}`}
                >
                  <span className="min-w-0 line-clamp-2 [overflow-wrap:anywhere]">
                    {trip.start}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-muted"
                  />
                  <span className="min-w-0 line-clamp-2 [overflow-wrap:anywhere]">
                    {trip.destination}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1 text-xs text-content-muted">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {displayDate(trip.tripDate)}
                  </span>
                  <span className="min-w-0 break-words text-xs text-content-muted">
                    {trip.vehicleName}
                    {trip.vehicleRegistration ? ` · ${trip.vehicleRegistration}` : ''}
                  </span>
                  {item.type === 'COMBINE_TRIPS' && (
                    <Link
                      to={`/trips/${trip.id}/edit`}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      View trip
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          {item.estimatedResourceSaving !== undefined && item.resourceUnit && (
            <p className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <Route className="h-3.5 w-3.5" /> Potential conservation based on saved estimate:{' '}
              {resource(item.estimatedResourceSaving, item.resourceUnit)}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 self-start lg:self-center"
          onClick={() => navigate(item.action.path)}
        >
          {item.action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  );
}
