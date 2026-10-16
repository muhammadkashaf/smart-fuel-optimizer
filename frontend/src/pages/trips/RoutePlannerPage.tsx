import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowDownUp, AlertCircle, CarFront, Check, Route, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTrip } from '@/api/tripApi';
import { getVehicle } from '@/api/vehicleApi';
import { getRouteOptions, saveTripRoute, type RouteOptionsResponse } from '@/api/routeApi';
import { Button, EmptyState, ErrorState, PageSkeleton, Spinner } from '@/components/common';
import StatusBadge from '@/components/common/StatusBadge';
import LocationSearch, { type LocationValue } from '@/components/trips/LocationSearch';
import TripRouteSteps from '@/components/trips/TripRouteSteps';
import RouteMap from '@/components/trips/RouteMap';
import RouteOptionCards from '@/components/trips/RouteOptionCards';
import type { RouteLocation, SelectedRoute, Trip, Vehicle } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

const number = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 });
const currentEstimate = (route: SelectedRoute | undefined, vehicle: Vehicle) =>
  Boolean(
    route &&
    Number.isFinite(vehicle.fuelEfficiency) &&
    vehicle.fuelEfficiency > 0 &&
    ['Petrol', 'Diesel', 'Electric'].includes(vehicle.fuelType) &&
    route.fuelEfficiency === vehicle.fuelEfficiency &&
    route.fuelType === vehicle.fuelType &&
    route.resourceUnit === (vehicle.fuelType === 'Electric' ? 'kWh' : 'L') &&
    Number.isFinite(route.distanceKm) &&
    route.distanceKm > 0 &&
    Number.isFinite(route.estimatedResource) &&
    route.estimatedResource > 0,
  );

function Planner({ initialTrip, vehicle }: { initialTrip: Trip; vehicle: Vehicle }) {
  const [trip, setTrip] = useState(initialTrip);
  const [start, setStart] = useState<LocationValue>({
    label: trip.startLocation,
    coordinates: trip.startCoordinates,
  });
  const [destination, setDestination] = useState<LocationValue>({
    label: trip.destination,
    coordinates: trip.destinationCoordinates,
  });
  const [result, setResult] = useState<RouteOptionsResponse | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [savedId, setSavedId] = useState('');
  const efficiencyValid =
    Number.isFinite(vehicle.fuelEfficiency) &&
    vehicle.fuelEfficiency > 0 &&
    ['Petrol', 'Diesel', 'Electric'].includes(vehicle.fuelType);
  const canRestore = Boolean(
    initialTrip.startCoordinates &&
    initialTrip.destinationCoordinates &&
    currentEstimate(initialTrip.selectedRoute, vehicle),
  );
  const [calculating, setCalculating] = useState(canRestore);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const request = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const optionsSection = useRef<HTMLElement>(null);
  const electric = vehicle.fuelType === 'Electric';

  const applyOptions = useCallback((data: RouteOptionsResponse, saved?: SelectedRoute) => {
    const matching =
      saved &&
      data.options.find(
        (option) =>
          Math.abs(option.distanceKm - saved.distanceKm) < 0.001 &&
          Math.abs(option.durationMinutes - saved.durationMinutes) < 0.001,
      );
    setResult(data);
    setSelectedId(
      matching?.id ??
        data.options.find((option) => option.isRecommended)?.id ??
        data.options[0]?.id ??
        '',
    );
    setSavedId(
      matching &&
        saved &&
        matching.resourceUnit === saved.resourceUnit &&
        Math.abs(matching.estimatedResource - saved.estimatedResource) < 0.00001
        ? matching.id
        : '',
    );
    setError('');
  }, []);

  useEffect(() => {
    if (!canRestore) return;
    const controller = new AbortController();
    request.current = controller;
    const version = ++revision.current;
    getRouteOptions(
      initialTrip._id,
      { label: initialTrip.startLocation, coordinates: initialTrip.startCoordinates! },
      { label: initialTrip.destination, coordinates: initialTrip.destinationCoordinates! },
      controller.signal,
    )
      .then(({ data }) => {
        if (controller.signal.aborted || version !== revision.current) return;
        applyOptions(data, initialTrip.selectedRoute);
        setRestored(true);
      })
      .catch((reason) => {
        if (!controller.signal.aborted && version === revision.current)
          setError(
            getErrorMessage(
              reason,
              'The map could not be refreshed. Your saved route is still available below.',
            ),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted && version === revision.current) setCalculating(false);
      });
    return () => controller.abort();
  }, [initialTrip, canRestore, applyOptions]);

  useEffect(() => () => request.current?.abort(), []);

  const resetOptions = () => {
    request.current?.abort();
    revision.current += 1;
    setResult(null);
    setSelectedId('');
    setSavedId('');
    setError('');
    setRestored(false);
    setCalculating(false);
  };

  const findRoutes = async () => {
    if (!start.coordinates || !destination.coordinates) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const version = ++revision.current;
    setCalculating(true);
    setError('');
    setResult(null);
    setSavedId('');
    setRestored(false);
    try {
      const { data } = await getRouteOptions(
        trip._id,
        start as RouteLocation,
        destination as RouteLocation,
        controller.signal,
      );
      if (controller.signal.aborted || version !== revision.current) return;
      applyOptions(data);
      window.setTimeout(
        () => optionsSection.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
        0,
      );
    } catch (reason) {
      if (!controller.signal.aborted && version === revision.current)
        setError(getErrorMessage(reason, 'We could not calculate routes. Please try again.'));
    } finally {
      if (!controller.signal.aborted && version === revision.current) setCalculating(false);
    }
  };

  const save = async () => {
    if (!result?.planId || !selectedId) return;
    setSaving(true);
    try {
      const { data } = await saveTripRoute(trip._id, result.planId, selectedId);
      setTrip(data.trip);
      setSavedId(selectedId);
      setRestored(false);
      setError('');
      toast.success(data.message);
    } catch (reason) {
      const message = getErrorMessage(reason, 'Your route could not be saved. Please try again.');
      toast.error(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const selected = result?.options.find((option) => option.id === selectedId);
  const saved = trip.selectedRoute;
  const savedEstimateCurrent = currentEstimate(saved, vehicle);
  const select = (id: string) => {
    if (!saving) setSelectedId(id);
  };

  return (
    <div className="min-w-0 space-y-5">
      <header>
        <Link
          to="/trips"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-content-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Trips
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="page-title">Route planner</h1>
          <StatusBadge
            tone={
              trip.status === 'Completed'
                ? 'success'
                : trip.status === 'Planned'
                  ? 'accent'
                  : 'neutral'
            }
          >
            {trip.status}
          </StatusBadge>
        </div>
        <p
          title={`${trip.startLocation} ? ${trip.destination}`}
          className="mt-2 line-clamp-2 break-words text-sm text-content-muted"
        >
          {trip.startLocation} <span aria-hidden="true">→</span> {trip.destination}
        </p>
      </header>
      <TripRouteSteps active="route" />

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="app-panel relative z-[1] space-y-5 p-5" aria-label="Route controls">
          <div>
            <h2 className="text-base font-semibold text-content">Where are you going?</h2>
            <p className="mt-1 text-xs text-content-muted">
              Choose exact locations, then compare available routes.
            </p>
          </div>
          <div className="space-y-3">
            <LocationSearch
              label="From"
              value={start}
              disabled={saving}
              onChange={(value) => {
                resetOptions();
                setStart(value);
              }}
            />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => {
                  resetOptions();
                  setStart(destination);
                  setDestination(start);
                }}
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                Swap locations
              </Button>
            </div>
            <LocationSearch
              label="To"
              value={destination}
              disabled={saving}
              onChange={(value) => {
                resetOptions();
                setDestination(value);
              }}
            />
          </div>
          <div className="rounded-xl bg-surface-muted/60 p-4">
            <div className="flex items-start gap-2.5">
              <CarFront className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" />
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-content">
                  {vehicle.vehicleName}
                </p>
                <p className="mt-0.5 text-xs text-content-muted">
                  {vehicle.registrationNumber} · {vehicle.fuelType}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs">
              <span className="text-content-muted">Efficiency</span>
              <strong>
                {efficiencyValid
                  ? `${number.format(vehicle.fuelEfficiency)} ${electric ? 'km/kWh' : 'km/L'}`
                  : 'Needs updating'}
              </strong>
            </div>
            <Link
              to={`/trips/${trip._id}/edit`}
              className="mt-3 inline-block text-xs font-medium text-accent hover:underline"
            >
              Change vehicle in trip details
            </Link>
          </div>
          {!efficiencyValid && (
            <div
              role="alert"
              className="rounded-control border border-warning-border bg-warning-soft p-3 text-xs leading-relaxed text-warning"
            >
              <p>
                Enter a valid vehicle efficiency before calculating {electric ? 'energy' : 'fuel'}{' '}
                use.
              </p>
              <Link
                to={`/vehicles/${vehicle._id}/edit`}
                className="mt-1 inline-block font-semibold underline"
              >
                Update vehicle efficiency
              </Link>
            </div>
          )}
          <div>
            <Button
              className="w-full"
              onClick={findRoutes}
              disabled={
                !start.coordinates ||
                !destination.coordinates ||
                !efficiencyValid ||
                calculating ||
                saving
              }
            >
              {calculating ? <Spinner /> : <Route className="h-4 w-4" />}
              {calculating
                ? 'Finding routes...'
                : result || saved
                  ? 'Recalculate routes'
                  : 'Find routes'}
            </Button>
            {!start.coordinates || !destination.coordinates ? (
              <p className="mt-2 text-xs text-content-muted">
                Select a search suggestion for both locations to continue.
              </p>
            ) : (
              <p className="mt-2 text-xs text-content-muted">
                Estimates use this vehicle's efficiency and route distance.
              </p>
            )}
          </div>
        </section>

        <div className="min-w-0 space-y-3">
          <RouteMap
            start={start.coordinates}
            destination={destination.coordinates}
            options={result?.options ?? []}
            selectedId={selectedId}
            onSelect={select}
          />
          {calculating && (
            <p role="status" className="flex items-center gap-2 text-sm text-content-muted">
              <Spinner />
              Finding available routes and estimating {electric ? 'energy' : 'fuel'} use...
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-control border border-danger-border bg-danger-soft p-3 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>{error}</p>
                <button
                  className="mt-1 text-xs font-semibold underline"
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Reload planner
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {saved && (
        <section className="app-panel p-4 sm:p-5" aria-label="Saved route summary">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Check className="h-4 w-4 text-success" />
              Saved route plan
            </h2>
            <p className="text-xs text-content-muted">
              Saved{' '}
              {new Date(saved.plannedAt).toLocaleDateString('en-PK', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-content-muted">Distance</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
                {number.format(saved.distanceKm)} km
              </dd>
            </div>
            <div>
              <dt className="text-xs text-content-muted">Estimated travel time</dt>
              <dd className="mt-1 text-sm font-semibold">
                {number.format(saved.durationMinutes)} min
              </dd>
            </div>
            <div>
              <dt className="text-xs text-content-muted">
                Estimated {saved.resourceUnit === 'kWh' ? 'energy' : 'fuel'}
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {savedEstimateCurrent
                  ? `${number.format(saved.estimatedResource)} ${saved.resourceUnit}`
                  : 'Recalculation needed'}
              </dd>
            </div>
          </dl>
          {!savedEstimateCurrent && (
            <p className="mt-3 text-xs text-warning">
              The saved fuel or energy estimate is outdated or invalid. Recalculate and save an
              updated route plan.
            </p>
          )}
          {restored && (
            <p className="mt-3 text-xs text-content-muted">
              {savedId
                ? 'A matching route is selected on the refreshed map.'
                : 'The map shows freshly calculated alternatives. Your saved summary above is kept until you save a new selection.'}
            </p>
          )}
        </section>
      )}

      <section
        ref={optionsSection}
        className="scroll-mt-24 space-y-4"
        aria-label="Route comparisons"
        aria-live="polite"
      >
        {result && result.options.length === 0 && (
          <EmptyState
            icon={Route}
            title="No driving route found"
            description="Try more specific locations close to a road, then find routes again."
          />
        )}
        {result && result.options.length > 0 && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-content">
                {result.options.length === 1 ? 'Your available route' : 'Compare routes'}
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                {result.options.length === 1
                  ? 'Only one route is available for these locations.'
                  : `Recommended: lowest estimated ${electric ? 'energy' : 'fuel'} among the routes below. You can choose any route.`}
              </p>
            </div>
            <RouteOptionCards
              options={result.options}
              selectedId={selectedId}
              onSelect={select}
              disabled={saving}
            />
            <div className="app-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-sm font-semibold text-content">{selected?.name} selected</p>
                <p className="mt-1 text-xs text-content-muted">
                  {selected &&
                    `${number.format(selected.distanceKm)} km · ${number.format(selected.estimatedResource)} ${selected.resourceUnit}`}
                  {savedId === selectedId
                    ? ' · Saved to this trip'
                    : ' · Ready to save to this trip'}
                </p>
              </div>
              <Button
                disabled={saving || !selected || savedId === selectedId}
                onClick={save}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <Spinner />
                ) : savedId === selectedId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving
                  ? 'Saving...'
                  : savedId === selectedId
                    ? 'Route saved'
                    : 'Save selected route'}
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-content-muted">
              {electric ? 'Energy' : 'Fuel'} estimates use distance ÷ vehicle efficiency. Actual use
              varies with traffic, load, road conditions, and driving style. Travel times are
              estimates, without live traffic. Routes and map by Google Maps.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export default function RoutePlannerPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<{ trip: Trip; vehicle: Vehicle } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setError('');
      setData(null);
      try {
        const {
          data: { trip },
        } = await getTrip(id);
        const vehicleId = typeof trip.vehicleId === 'string' ? trip.vehicleId : trip.vehicleId?._id;
        if (!vehicleId)
          throw new Error(
            'The vehicle for this trip is unavailable. Update the trip before planning a route.',
          );
        const {
          data: { vehicle },
        } = await getVehicle(vehicleId);
        if (active) setData({ trip, vehicle });
      } catch (reason) {
        if (active)
          setError(getErrorMessage(reason, 'This trip or its vehicle could not be loaded.'));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id, attempt]);
  if (error)
    return (
      <div className="space-y-4">
        <Link to="/trips" className="inline-flex items-center gap-1.5 text-sm text-accent">
          <ArrowLeft className="h-4 w-4" />
          Back to Trips
        </Link>
        <ErrorState message={error} retry={() => setAttempt((value) => value + 1)} />
      </div>
    );
  if (!data) return <PageSkeleton />;
  return <Planner key={data.trip._id} initialTrip={data.trip} vehicle={data.vehicle} />;
}
