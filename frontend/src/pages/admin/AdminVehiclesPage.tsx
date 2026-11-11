import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CarFront,
  Search,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminVehicles,
  updateAdminVehicle,
  deleteAdminVehicle,
} from '@/api/adminApi';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  Spinner,
} from '@/components/common';
import VehicleBadge from '@/components/vehicles/VehicleBadge';
import { vehicleSchema } from '@/schemas/vehicleSchemas';
import { getErrorMessage } from '@/utils/errorHandler';
import type { Vehicle } from '@/types';

const FUEL_TYPES = ['All', 'Petrol', 'Diesel', 'Electric'];

export default function AdminVehiclesPage() {

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [fuelFilter, setFuelFilter] = useState('All');

  // Modals state
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Form Hook
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(vehicleSchema),
  });
  const editingElectric = useWatch({ control, name: 'fuelType' }) === 'Electric';

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await getAdminVehicles();
      setVehicles(res.data.vehicles);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  // Filtered list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesFuel = fuelFilter === 'All' || v.fuelType === fuelFilter;
      if (!matchesFuel) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const ownerName = typeof v.userId === 'object' ? v.userId?.fullName?.toLowerCase() : '';
      const ownerEmail = typeof v.userId === 'object' ? v.userId?.email?.toLowerCase() : '';

      return (
        v.vehicleName?.toLowerCase().includes(q) ||
        v.registrationNumber?.toLowerCase().includes(q) ||
        v.manufacturer?.toLowerCase().includes(q) ||
        ownerName?.includes(q) ||
        ownerEmail?.includes(q)
      );
    });
  }, [vehicles, search, fuelFilter]);

  // Open Edit Modal
  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    reset({
      vehicleName: vehicle.vehicleName,
      registrationNumber: vehicle.registrationNumber,
      manufacturer: vehicle.manufacturer,
      modelYear: vehicle.modelYear,
      fuelType: vehicle.fuelType,
      fuelEfficiency: vehicle.fuelEfficiency,
      fuelTankCapacity: vehicle.fuelTankCapacity,
    });
  };

  // Submit Edit Form
  const onEditSubmit = async (values: any) => {
    if (!editingVehicle) return;
    setActionLoading(true);
    try {
      const res = await updateAdminVehicle(editingVehicle._id, values);
      toast.success(res.data.message || 'Vehicle record updated successfully');
      setEditingVehicle(null);
      loadVehicles();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };



  // Delete Vehicle
  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;
    setActionLoading(true);
    try {
      const res = await deleteAdminVehicle(deletingVehicle._id);
      toast.success(res.data.message || 'Vehicle record removed successfully');
      setDeletingVehicle(null);
      loadVehicles();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} retry={loadVehicles} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Manage Vehicles"
        subtitle="Review registered vehicles across the system."
      />

      {/* Search & Fuel Filter Toolbar */}
      <div className="app-panel p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Search Field */}
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by registration number, vehicle name, manufacturer, or owner name/email..."
              aria-label="Search vehicles by name, registration, manufacturer, or owner"
              className="h-10 w-full rounded-lg border border-line bg-slate-50/50 pl-10 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:ring-3 focus:ring-accent/15"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Fuel Filter Dropdown */}
          <div className="min-w-0 sm:w-52">
            <Select label="Fuel type" value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
              {FUEL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? 'All fuel types' : `${type} only`}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Vehicles Table Panel */}
      <div className="app-panel overflow-hidden">
        {/* Table info bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-600">
              <CarFront className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700">
              Showing {filteredVehicles.length} of {vehicles.length} vehicle record{vehicles.length === 1 ? '' : 's'}
            </span>
          </div>
          {(search || fuelFilter !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setFuelFilter('All');
              }}
              className="text-xs font-medium text-accent hover:text-accent-strong transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>

        {vehicles.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-slate-900">No vehicles in system</h3>
            <p className="mt-1 text-sm text-content-muted">No vehicle records are currently registered across any user account.</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">No matching vehicles found</h3>
            <p className="mt-1 text-xs text-content-muted">
              No vehicle records match your search or filter criteria.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFuelFilter('All');
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        ) : (<>
          <div className="divide-y divide-line md:hidden">
            {filteredVehicles.map((v) => {
              const owner = v.userId && typeof v.userId === 'object' ? v.userId : null;
              return <div key={v._id} className="space-y-3 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0"><p className="font-semibold text-slate-900">{v.vehicleName}</p><p className="text-xs text-content-muted">{v.registrationNumber} · {v.manufacturer} {v.modelYear}</p></div>
                  <VehicleBadge fuel={v.fuelType} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs"><div><p className="text-content-muted">Owner</p><p className="mt-0.5 font-medium text-slate-900">{owner?.fullName || 'Unknown / deleted user'}</p>{owner?.email && <p className="break-all text-content-muted">{owner.email}</p>}</div><div><p className="text-content-muted">Efficiency / capacity</p><p className="mt-0.5 font-medium text-slate-900">{v.fuelEfficiency} {v.fuelType === 'Electric' ? 'km/kWh' : 'km/L'} · {v.fuelTankCapacity} {v.fuelType === 'Electric' ? 'kWh' : 'L'}</p></div></div>
                <div className="flex justify-end gap-2 border-t border-line/70 pt-3"><Button variant="secondary" size="sm" onClick={() => openEditModal(v)}>Edit</Button><Button variant="secondary" size="sm" onClick={() => setDeletingVehicle(v)}>Delete</Button></div>
              </div>;
            })}
          </div>
          <div className="hidden max-w-full overflow-x-auto md:block">
            <table className="w-full min-w-[830px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Vehicle</th>
                  <th className="px-4 py-3.5">Registration</th>
                  <th className="px-4 py-3.5">Owner</th>
                  <th className="px-4 py-3.5">Fuel Type</th>
                  <th className="px-4 py-3.5">Efficiency</th>
                  <th className="px-4 py-3.5">Capacity</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filteredVehicles.map((v) => {
                  const owner = typeof v.userId === 'object' ? v.userId : null;
                  return (
                    <tr key={v._id} className="transition-colors hover:bg-slate-50/70">
                      <td className="max-w-52 px-5 py-4">
                        <div className="break-words font-semibold text-slate-900">{v.vehicleName}</div>
                        <div className="text-xs text-content-muted mt-0.5">
                          {v.manufacturer} · {v.modelYear}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 border border-slate-200/60">
                          {v.registrationNumber}
                        </span>
                      </td>
                      <td className="max-w-48 px-4 py-4">
                        {owner ? (
                          <div className="min-w-0">
                            <div className="break-words text-xs font-semibold text-slate-900">{owner.fullName}</div>
                            <div className="break-all text-[11px] text-content-muted">{owner.email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-content-muted">Unknown / deleted user</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <VehicleBadge fuel={v.fuelType} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium tabular-nums text-slate-800">
                          {v.fuelEfficiency} <span className="text-xs text-slate-500 font-normal">{v.fuelType === 'Electric' ? 'km/kWh' : 'km/L'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium tabular-nums text-slate-800">
                          {v.fuelTankCapacity} <span className="text-xs text-slate-500 font-normal">{v.fuelType === 'Electric' ? 'kWh' : 'L'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(v)}
                            aria-label={`Edit vehicle ${v.vehicleName}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Edit vehicle details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingVehicle(v)}
                            aria-label={`Delete vehicle ${v.vehicleName}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-danger transition-colors"
                            title="Delete vehicle record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>)}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT VEHICLE (React Hook Form + Zod Validated) */}
      {/* ========================================================================= */}
      {editingVehicle && (
        <div role="dialog" aria-modal="true" aria-label="Edit vehicle" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Vehicle Record</h2>
                <p className="text-xs text-content-muted mt-0.5">
                  Owner:{' '}
                  {typeof editingVehicle.userId === 'object'
                    ? editingVehicle.userId?.fullName || 'Unknown / deleted user'
                    : 'Unknown / deleted user'}
                </p>
              </div>
              <button
                onClick={() => setEditingVehicle(null)}
                aria-label="Close edit vehicle dialog"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onEditSubmit)} className="mt-5 space-y-4">
              <Input
                label="Vehicle name"
                placeholder="e.g. Delivery Truck 01"
                error={errors.vehicleName?.message}
                {...register('vehicleName')}
              />

              <Input
                label="Registration number"
                placeholder="e.g. ABC-1234"
                error={errors.registrationNumber?.message}
                {...register('registrationNumber')}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Manufacturer"
                  placeholder="e.g. Toyota"
                  error={errors.manufacturer?.message}
                  {...register('manufacturer')}
                />
                <Input
                  label="Model year"
                  type="number"
                  placeholder="2024"
                  error={errors.modelYear?.message}
                  {...register('modelYear', { valueAsNumber: true })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Select
                  label="Fuel type"
                  error={errors.fuelType?.message}
                  {...register('fuelType')}
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                </Select>
                <Input
                  label={editingElectric ? 'Efficiency (km/kWh)' : 'Efficiency (km/L)'}
                  type="number"
                  step="0.1"
                  placeholder="14.5"
                  error={errors.fuelEfficiency?.message}
                  {...register('fuelEfficiency', { valueAsNumber: true })}
                />
                <Input
                  label={editingElectric ? 'Battery capacity (kWh)' : 'Tank capacity (L)'}
                  type="number"
                  step="0.1"
                  placeholder="55.0"
                  error={errors.fuelTankCapacity?.message}
                  {...register('fuelTankCapacity', { valueAsNumber: true })}
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  disabled={actionLoading || isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading || isSubmitting}>
                  {(actionLoading || isSubmitting) && <Spinner />}
                  <span>Save changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DELETE VEHICLE CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingVehicle && (
        <div role="alertdialog" aria-modal="true" aria-label="Delete vehicle" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger ring-8 ring-red-50">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Delete vehicle record
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-content-muted">
                  Are you sure you want to permanently remove{' '}
                  <strong className="text-slate-900">{deletingVehicle.vehicleName}</strong> (
                  {deletingVehicle.registrationNumber}) from system records?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeletingVehicle(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteVehicle}
                disabled={actionLoading}
              >
                {actionLoading && <Spinner />}
                <span>Delete vehicle</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
