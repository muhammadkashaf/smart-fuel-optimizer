import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CarFront, Fuel, Gauge, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteVehicle, getVehicles } from '@/api/vehicleApi';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
} from '@/components/common';
import DeleteVehicleModal from '@/components/vehicles/DeleteVehicleModal';
import VehicleBadge from '@/components/vehicles/VehicleBadge';
import VehicleActions from '@/components/vehicles/VehicleActions';
import { getErrorMessage } from '@/utils/errorHandler';
import type { Vehicle } from '@/types';

const FUEL_TYPES = ['All', 'Petrol', 'Diesel', 'Electric'];

export default function VehicleListPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [query, setQuery] = useState('');
  const [fuel, setFuel] = useState('All');
  const [target, setTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      const response = await getVehicles();
      setVehicles(response.data.vehicles);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (fuel === 'All' || v.fuelType === fuel) &&
          `${v.vehicleName} ${v.registrationNumber} ${v.manufacturer}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [vehicles, fuel, query],
  );

  const confirm = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await deleteVehicle(target._id);
      toast.success('Vehicle removed successfully');
      setTarget(null);
      load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  if (status === 'loading') return <PageSkeleton />;
  if (status === 'error')
    return <ErrorState message="We couldn't load your vehicles." retry={load} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Vehicles"
        subtitle="Manage and monitor all your registered vehicles."
        action={
          <Link to="/vehicles/new">
            <Button>
              <Plus className="h-4 w-4" />
              <span>Add vehicle</span>
            </Button>
          </Link>
        }
      />

      {vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles registered"
          description="You have no registered vehicles. Add your first vehicle to begin tracking performance and consumption."
          action={
            <Link to="/vehicles/new">
              <Button>
                <Plus className="h-4 w-4" />
                <span>Add your first vehicle</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="app-panel p-3.5 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search Field */}
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, registration, or manufacturer..."
                  className="h-10 w-full rounded-lg border border-line bg-slate-50/50 pl-10 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:ring-3 focus:ring-accent/15"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Fuel Filter Dropdown */}
              <div className="relative sm:w-52">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                />
                <select
                  aria-label="Filter by fuel type"
                  value={fuel}
                  onChange={(e) => setFuel(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-line bg-slate-50/50 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-accent focus:bg-white focus:ring-3 focus:ring-accent/15"
                >
                  {FUEL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === 'All' ? 'All fuel types' : `${type} only`}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Directory Table Panel */}
          <div className="app-panel overflow-hidden">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-600">
                  <CarFront className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  Showing {filtered.length} of {vehicles.length} vehicle
                  {vehicles.length === 1 ? '' : 's'}
                </span>
              </div>
              {(query || fuel !== 'All') && (
                <button
                  onClick={() => {
                    setQuery('');
                    setFuel('All');
                  }}
                  className="text-xs font-medium text-accent hover:text-accent-strong transition-colors"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Vehicle</th>
                    <th className="px-4 py-3.5">Registration</th>
                    <th className="px-4 py-3.5">Fuel Type</th>
                    <th className="px-4 py-3.5">Efficiency</th>
                    <th className="px-4 py-3.5">Tank Capacity</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filtered.map((v) => (
                    <tr
                      key={v._id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{v.vehicleName}</div>
                        <div className="text-xs text-content-muted mt-0.5">
                          {v.manufacturer} · {v.modelYear}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 border border-slate-200/60">
                          {v.registrationNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <VehicleBadge fuel={v.fuelType} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium tabular-nums text-slate-800">
                          {v.fuelEfficiency} <span className="text-xs text-slate-500 font-normal">km/L</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium tabular-nums text-slate-800">
                          {v.fuelTankCapacity} <span className="text-xs text-slate-500 font-normal">L</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <VehicleActions vehicle={v} onDelete={() => setTarget(v)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="divide-y divide-line md:hidden">
              {filtered.map((v) => (
                <article key={v._id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {v.vehicleName}
                      </h3>
                      <p className="text-xs text-content-muted mt-0.5">
                        {v.manufacturer} · {v.modelYear}
                      </p>
                    </div>
                    <VehicleBadge fuel={v.fuelType} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                    <span className="font-mono font-medium">{v.registrationNumber}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3 w-3 text-slate-400" />
                        <span className="font-medium tabular-nums">{v.fuelEfficiency} km/L</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-slate-400" />
                        <span className="font-medium tabular-nums">{v.fuelTankCapacity} L</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <VehicleActions vehicle={v} onDelete={() => setTarget(v)} />
                  </div>
                </article>
              ))}
            </div>

            {/* Empty Search / Filter State */}
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">No matching vehicles</h3>
                <p className="mt-1 text-xs text-content-muted max-w-sm mx-auto">
                  No vehicles found matching "{query}". Try adjusting your search query or fuel type filter.
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery('');
                      setFuel('All');
                    }}
                  >
                    Clear search filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteVehicleModal
        open={Boolean(target)}
        loading={deleting}
        onClose={() => !deleting && setTarget(null)}
        onConfirm={confirm}
      />
    </div>
  );
}
