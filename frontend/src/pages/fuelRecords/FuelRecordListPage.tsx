import { useCallback, useEffect, useState } from 'react';
import ListSkeleton from '@/components/common/ListSkeleton';
import { Link } from 'react-router-dom';
import { Fuel, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteFuelRecord, getFuelRecords } from '@/api/fuelRecordApi';
import { getVehicles } from '@/api/vehicleApi';
import { Button, EmptyState, ErrorState, PageHeader, Select } from '@/components/common';
import VehicleActions from '@/components/vehicles/VehicleActions';
import DeleteVehicleModal from '@/components/vehicles/DeleteVehicleModal';
import type { FuelRecord, Vehicle } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

const money = new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const liters = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 3 });
const displayDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
const vehicleName = (record: FuelRecord) =>
  typeof record.vehicleId === 'string' ? 'Vehicle unavailable' : record.vehicleId.vehicleName;
const vehicleRegistration = (record: FuelRecord) =>
  typeof record.vehicleId === 'string' ? '' : record.vehicleId.registrationNumber;

export default function FuelRecordListPage() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [target, setTarget] = useState<FuelRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [recordResponse, vehicleResponse] = await Promise.all([
        getFuelRecords(),
        getVehicles(),
      ]);
      setRecords(recordResponse.data.records);
      setVehicles(vehicleResponse.data.vehicles);
      setError('');
      setStatus('ready');
    } catch (reason) {
      setError(getErrorMessage(reason, 'We could not load your fuel records.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await deleteFuelRecord(target._id);
      toast.success('Fuel record removed successfully');
      setTarget(null);
      await load();
    } catch (reason) {
      toast.error(getErrorMessage(reason));
    } finally {
      setDeleting(false);
    }
  };

  const selectedVehicle = vehicles.find((vehicle) => vehicle._id === vehicleFilter);
  const visibleRecords = vehicleFilter
    ? records.filter(
        (record) =>
          (typeof record.vehicleId === 'string' ? record.vehicleId : record.vehicleId._id) ===
          vehicleFilter,
      )
    : records;

  if (status === 'loading') return <ListSkeleton label="Loading fuel records" />;
  if (status === 'error') return <ErrorState message={error} retry={load} />;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Fuel records"
        subtitle="Track fuel purchases and operating costs."
        action={
          vehicles.length > 0 && (
            <Link to="/fuel-records/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add fuel record
              </Button>
            </Link>
          )
        }
      />

      {vehicles.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="Add a vehicle first"
          description="Register a vehicle before recording fuel purchases."
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
          <div className="app-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-sm">
              <Select
                label="Filter by vehicle"
                id="fuel-vehicle-filter"
                value={vehicleFilter}
                onChange={(event) => setVehicleFilter(event.target.value)}
              >
                <option value="">All vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.vehicleName} ({vehicle.registrationNumber})
                  </option>
                ))}
              </Select>
            </div>
            {vehicleFilter && (
              <Button variant="ghost" size="sm" onClick={() => setVehicleFilter('')}>
                Reset filters
              </Button>
            )}
            <p aria-live="polite" className="text-xs font-medium text-content-muted">
              Showing {visibleRecords.length}{' '}
              {selectedVehicle ? `for ${selectedVehicle.vehicleName}` : 'across all vehicles'}
            </p>
          </div>

          {visibleRecords.length === 0 ? (
            <EmptyState
              icon={Fuel}
              title={
                selectedVehicle
                  ? `No fuel records for ${selectedVehicle.vehicleName}`
                  : 'No fuel records yet'
              }
              description={
                selectedVehicle
                  ? 'This vehicle has no fuel purchases yet. Add a record or choose another vehicle.'
                  : 'Add your first fuel purchase to start a history for your vehicles.'
              }
              action={
                <Link to="/fuel-records/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Add fuel record
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="app-panel overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-amber-50 text-amber-600">
                  <Fuel className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {visibleRecords.length} fuel record{visibleRecords.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Vehicle</th>
                      <th className="px-4 py-3.5 text-right">Quantity</th>
                      <th className="px-4 py-3.5 text-right">Cost</th>
                      <th className="px-4 py-3.5 text-right">Price per liter</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {visibleRecords.map((record) => (
                      <tr key={record._id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {displayDate(record.date)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{vehicleName(record)}</div>
                          <div className="text-xs text-content-muted">
                            {vehicleRegistration(record)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-slate-800">
                          {liters.format(record.quantity)} L
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-slate-800">
                          PKR {money.format(record.cost)}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-slate-800">
                          PKR {money.format(record.cost / record.quantity)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <VehicleActions
                            editTo={`/fuel-records/${record._id}/edit`}
                            itemName={vehicleName(record)}
                            resourceLabel="fuel record"
                            onDelete={() => setTarget(record)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-line xl:hidden">
                {visibleRecords.map((record) => (
                  <article key={record._id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 break-words text-sm font-semibold text-slate-900">
                          {vehicleName(record)}
                        </h3>
                        <p className="text-xs text-content-muted">
                          {vehicleRegistration(record)} · {displayDate(record.date)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                        PKR {money.format(record.cost)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                      <span>{liters.format(record.quantity)} L</span>
                      <span>PKR {money.format(record.cost / record.quantity)} / L</span>
                    </div>
                    <VehicleActions
                      editTo={`/fuel-records/${record._id}/edit`}
                      itemName={vehicleName(record)}
                      resourceLabel="fuel record"
                      onDelete={() => setTarget(record)}
                    />
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
        title="Delete fuel record"
        description={
          target
            ? `Remove the ${displayDate(target.date)} fuel purchase for ${vehicleName(target)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete record"
      />
    </div>
  );
}
