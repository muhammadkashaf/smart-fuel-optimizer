import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CarFront, Fuel } from 'lucide-react';
import { vehicleSchema } from '@/schemas/vehicleSchemas';
import { Button, Input, Select, Spinner } from '@/components/common';
import type { Vehicle } from '@/types';

export default function VehicleForm({
  vehicle,
  onSubmit,
}: {
  vehicle?: Partial<Vehicle>;
  onSubmit: (values: {
    vehicleName: string;
    registrationNumber: string;
    manufacturer: string;
    modelYear: number;
    fuelType: 'Petrol' | 'Diesel' | 'Electric';
    fuelEfficiency: number;
    fuelTankCapacity: number;
  }) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleName: vehicle?.vehicleName ?? '',
      registrationNumber: vehicle?.registrationNumber ?? '',
      manufacturer: vehicle?.manufacturer ?? '',
      modelYear: vehicle?.modelYear ?? new Date().getFullYear(),
      fuelType: vehicle?.fuelType ?? 'Petrol',
      fuelEfficiency: vehicle?.fuelEfficiency ?? 0,
      fuelTankCapacity: vehicle?.fuelTankCapacity ?? 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Identity Section */}
      <section className="app-panel p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
            <CarFront className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Vehicle identity</h2>
            <p className="text-xs text-content-muted">
              General identification and registration records for this asset
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Vehicle name"
            placeholder="e.g. Delivery Van Alpha"
            hint="A recognizable name or vehicle nickname"
            error={errors.vehicleName?.message}
            {...register('vehicleName')}
          />
          <Input
            label="Registration number"
            placeholder="e.g. ABC-1234"
            hint="Official license plate / registration"
            error={errors.registrationNumber?.message}
            {...register('registrationNumber')}
          />
          <Input
            label="Manufacturer"
            placeholder="e.g. Toyota, Ford, Tesla"
            hint="Vehicle make or automaker"
            error={errors.manufacturer?.message}
            {...register('manufacturer')}
          />
          <Input
            label="Model year"
            type="number"
            placeholder="2024"
            hint="Year of vehicle production (1990-2026)"
            error={errors.modelYear?.message}
            {...register('modelYear', { valueAsNumber: true })}
          />
        </div>
      </section>

      {/* Fuel & Performance Section */}
      <section className="app-panel p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
            <Fuel className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Fuel & efficiency metrics</h2>
            <p className="text-xs text-content-muted">
              Operating consumption and capacity parameters
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Select
            label="Fuel type"
            hint="Primary energy source"
            error={errors.fuelType?.message}
            {...register('fuelType')}
          >
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
          </Select>
          <Input
            label="Efficiency (km/L)"
            type="number"
            step="0.1"
            placeholder="14.5"
            hint="Average km per liter / kWh"
            error={errors.fuelEfficiency?.message}
            {...register('fuelEfficiency', { valueAsNumber: true })}
          />
          <Input
            label="Tank capacity (L)"
            type="number"
            step="0.1"
            placeholder="55.0"
            hint="Usable fuel or battery size"
            error={errors.fuelTankCapacity?.message}
            {...register('fuelTankCapacity', { valueAsNumber: true })}
          />
        </div>
      </section>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        <Link to="/vehicles">
          <Button variant="secondary" type="button">
            Cancel
          </Button>
        </Link>
        <Button disabled={isSubmitting} type="submit" className="min-w-36">
          {isSubmitting && <Spinner />}
          <span>{vehicle ? 'Save changes' : 'Register vehicle'}</span>
        </Button>
      </div>
    </form>
  );
}
