import { useCallback, useEffect, useRef, useState } from 'react';
import StatusBadge from '@/components/common/StatusBadge';
import ListSkeleton from '@/components/common/ListSkeleton';
import { Link } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteTrip, getTrips, type TripFilters } from '@/api/tripApi';
import { getVehicles } from '@/api/vehicleApi';
import { Button, EmptyState, ErrorState, PageHeader, Select } from '@/components/common';
import DeleteVehicleModal from '@/components/vehicles/DeleteVehicleModal';
import VehicleActions from '@/components/vehicles/VehicleActions';
import type { Trip, TripPriority, TripStatus, Vehicle } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

const displayDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
const vehicleName = (trip: Trip) =>
  typeof trip.vehicleId === 'string' ? 'Vehicle unavailable' : trip.vehicleId.vehicleName;
const vehicleRegistration = (trip: Trip) =>
  typeof trip.vehicleId === 'string' ? '' : trip.vehicleId.registrationNumber;
const tripLabel = (trip: Trip) => `${trip.startLocation} to ${trip.destination}`;

export default function TripListPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filters, setFilters] = useState<TripFilters>({});
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [target, setTarget] = useState<Trip | null>(null);
  const [deleting, setDeleting] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setStatus('loading');
    try {
      const [tripResponse, vehicleResponse] = await Promise.all([getTrips(filters), getVehicles()]);
      if (id !== requestId.current) return;
      setTrips(tripResponse.data.trips);
      setVehicles(vehicleResponse.data.vehicles);
      setError('');
      setStatus('ready');
    } catch (reason) {
      if (id !== requestId.current) return;
      setError(getErrorMessage(reason, 'We could not load your trips.'));
      setStatus('error');
    }
  }, [filters]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      const { data } = await deleteTrip(target._id);
      toast.success(data.message);
      setTarget(null);
      await load();
    } catch (reason) {
      toast.error(getErrorMessage(reason));
    } finally {
      setDeleting(false);
    }
  };

  if (status === 'loading' && vehicles.length === 0) return <ListSkeleton label="Loading trips" />;
  if (status === 'error' && vehicles.length === 0)
    return <ErrorState message={error} retry={load} />;

  const hasFilters = Boolean(filters.vehicleId || filters.status || filters.priority);
  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Trips"
        subtitle="Plan, optimize and manage your journeys."
        action={
          vehicles.length > 0 && (
            <Link to="/trips/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create trip
              </Button>
            </Link>
          )
        }
      />

      {vehicles.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Add a vehicle first"
          description="Register a vehicle before planning trips."
          action={
            <Link to="/vehicles/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add vehicle
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="app-panel grid items-end gap-3 p-4 sm:grid-cols-3">
            <Select
              label="Vehicle"
              value={filters.vehicleId ?? ''}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  vehicleId: event.target.value || undefined,
                }))
              }
            >
              <option value="">All vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.vehicleName} ({vehicle.registrationNumber})
                </option>
              ))}
            </Select>
            <Select
              label="Status"
              value={filters.status ?? ''}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: (event.target.value || undefined) as TripStatus | undefined,
                }))
              }
            >
              <option value="">All statuses</option>
              <option value="Planned">Planned</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
            <Select
              label="Priority"
              value={filters.priority ?? ''}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  priority: (event.target.value || undefined) as TripPriority | undefined,
                }))
              }
            >
              <option value="">All priorities</option>
              <option value="Essential">Essential</option>
              <option value="Normal">Normal</option>
              <option value="Non-essential">Non-essential</option>
            </Select>
            {hasFilters && (
              <div className="sm:col-span-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                  Reset filters
                </Button>
              </div>
            )}
          </div>

          {status === 'loading' ? (
            <ListSkeleton contentOnly label="Loading trips" />
          ) : status === 'error' ? (
            <ErrorState message={error} retry={load} />
          ) : trips.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={hasFilters ? 'No trips match these filters' : 'No trips yet'}
              description={
                hasFilters
                  ? 'Try other filters or clear them to see all your trips.'
                  : 'Add your first trip to start planning with your vehicles.'
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={() => setFilters({})}>
                    Clear filters
                  </Button>
                ) : (
                  <Link to="/trips/new">
                    <Button>
                      <Plus className="h-4 w-4" />
                      Create trip
                    </Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="app-panel overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-accent/10 text-accent">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {trips.length} trip{trips.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">Journey</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Vehicle</th>
                      <th className="px-4 py-3.5">Priority</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {trips.map((trip) => (
                      <tr key={trip._id} className="transition-colors hover:bg-slate-50/70">
                        <td className="max-w-xs px-4 py-4">
                          <div className="font-semibold text-slate-900">
                            {trip.startLocation} → {trip.destination}
                          </div>
                          {trip.purpose && (
                            <div
                              className="truncate text-xs text-content-muted"
                              title={trip.purpose}
                            >
                              {trip.purpose}
                            </div>
                          )}
                          <Link
                            className="mt-1.5 inline-block text-xs font-semibold text-accent hover:underline"
                            to={`/trips/${trip._id}/route`}
                          >
                            {trip.selectedRoute
                              ? 'Route planned ? View'
                              : 'Route not planned ? Plan'}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                          {displayDate(trip.tripDate)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{vehicleName(trip)}</div>
                          <div className="text-xs text-content-muted">
                            {vehicleRegistration(trip)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          <StatusBadge tone={trip.priority === 'Essential' ? 'warning' : 'neutral'}>
                            {trip.priority}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
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
                        </td>
                        <td className="px-5 py-4 text-right">
                          <VehicleActions
                            editTo={`/trips/${trip._id}/edit`}
                            itemName={tripLabel(trip)}
                            resourceLabel="trip"
                            onDelete={() => setTarget(trip)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-line xl:hidden">
                {trips.map((trip) => (
                  <article key={trip._id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-content-muted">
                          {displayDate(trip.tripDate)} · {vehicleName(trip)}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-slate-900">
                          {trip.startLocation} → {trip.destination}
                        </h3>
                        {trip.purpose && (
                          <p
                            className="mt-1 line-clamp-2 break-words text-xs text-content-muted"
                            title={trip.purpose}
                          >
                            {trip.purpose}
                          </p>
                        )}
                      </div>
                      <VehicleActions
                        editTo={`/trips/${trip._id}/edit`}
                        itemName={tripLabel(trip)}
                        resourceLabel="trip"
                        onDelete={() => setTarget(trip)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                      <StatusBadge tone={trip.priority === 'Essential' ? 'warning' : 'neutral'}>
                        {trip.priority}
                      </StatusBadge>
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
                      <Link
                        className="ml-auto font-semibold text-accent hover:underline"
                        to={`/trips/${trip._id}/route`}
                      >
                        {trip.selectedRoute ? 'Route planned ? View' : 'Route not planned ? Plan'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DeleteVehicleModal
        open={Boolean(target)}
        loading={deleting}
        onClose={() => !deleting && setTarget(null)}
        onConfirm={confirmDelete}
        title="Delete trip"
        description={
          target
            ? `Delete the ${displayDate(target.tripDate)} trip from ${tripLabel(target)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete trip"
      />
    </div>
  );
}
