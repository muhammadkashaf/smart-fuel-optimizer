import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Fuel } from 'lucide-react';
import { Button, Input, Select, Spinner } from '@/components/common';
import { fuelRecordSchema, type FuelRecordFormValues } from '@/schemas/fuelRecordSchemas';
import type { FuelRecord, Vehicle } from '@/types';

export default function FuelRecordForm({
  vehicles,
  record,
  onSubmit,
}: {
  vehicles: Vehicle[];
  record?: FuelRecord;
  onSubmit: (values: FuelRecordFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FuelRecordFormValues>({
    resolver: zodResolver(fuelRecordSchema),
    defaultValues: {
      vehicleId:
        typeof record?.vehicleId === 'string' ? record.vehicleId : (record?.vehicleId._id ?? ''),
      date: record?.date.slice(0, 10) ?? '',
      quantity: record?.quantity,
      cost: record?.cost,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="app-panel min-w-0">
      <section className="p-5 sm:p-6">
        <div className="flex items-center gap-3 pb-1">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
            <Fuel className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Purchase details</h2>
            <p className="text-xs text-content-muted">
              Record the vehicle, purchase date, liters, and amount paid.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <Select label="Vehicle" error={errors.vehicleId?.message} {...register('vehicleId')}>
            <option value="">Select a vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle._id} value={vehicle._id}>
                {vehicle.vehicleName} ({vehicle.registrationNumber})
              </option>
            ))}
          </Select>
          <Input
            label="Purchase date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />
          <Input
            label="Quantity (liters)"
            type="number"
            min="0"
            step="any"
            placeholder="e.g. 35.5"
            hint="Liters purchased, as shown on your receipt"
            error={errors.quantity?.message}
            {...register('quantity', { valueAsNumber: true })}
          />
          <Input
            label="Cost (PKR)"
            type="number"
            min="0"
            step="any"
            placeholder="e.g. 9500"
            hint="Total amount paid in PKR"
            error={errors.cost?.message}
            {...register('cost', { valueAsNumber: true })}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-b-card border-t border-line bg-slate-50/60 p-5 sm:px-6">
        <Link to="/fuel-records">
          <Button variant="secondary" type="button">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting} className="min-w-36">
          {isSubmitting && <Spinner />}
          <span>{record ? 'Save changes' : 'Add fuel record'}</span>
        </Button>
      </div>
    </form>
  );
}
