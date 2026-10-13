import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Button, Input, Select, Spinner } from '@/components/common';
import { tripSchema, type TripFormValues } from '@/schemas/tripSchemas';
import type { Trip, Vehicle } from '@/types';

export default function TripForm({ vehicles, trip, onSubmit }: {
  vehicles: Vehicle[];
  trip?: Trip;
  onSubmit: (values: TripFormValues) => Promise<void>;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      vehicleId: typeof trip?.vehicleId === 'string' ? trip.vehicleId : trip?.vehicleId._id ?? '',
      startLocation: trip?.startLocation ?? '',
      destination: trip?.destination ?? '',
      tripDate: trip?.tripDate.slice(0, 10) ?? '',
      priority: trip?.priority ?? 'Normal',
      purpose: trip?.purpose ?? '',
      status: trip?.status ?? 'Planned',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="app-panel p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent"><CalendarDays className="h-4 w-4" /></div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Trip details</h2>
            <p className="text-xs text-content-muted">Choose your vehicle and record where and when you plan to travel.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Select label="Vehicle" error={errors.vehicleId?.message} {...register('vehicleId')}>
            <option value="">Select a vehicle</option>
            {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleName} ({vehicle.registrationNumber})</option>)}
          </Select>
          <Input label="Trip date" type="date" error={errors.tripDate?.message} {...register('tripDate')} />
          <Input label="Starting point" placeholder="e.g. Home" error={errors.startLocation?.message} {...register('startLocation')} />
          <Input label="Destination" placeholder="e.g. Office" error={errors.destination?.message} {...register('destination')} />
          <Select label="Priority" error={errors.priority?.message} {...register('priority')}>
            <option value="Essential">Essential</option><option value="Normal">Normal</option><option value="Non-essential">Non-essential</option>
          </Select>
          <Select label="Status" error={errors.status?.message} {...register('status')}>
            <option value="Planned">Planned</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
          </Select>
          <div className="sm:col-span-2">
            <label htmlFor="trip-purpose" className="field-label text-slate-700">Purpose <span className="font-normal text-content-muted">(optional)</span></label>
            <textarea id="trip-purpose" rows={3} placeholder="What is this trip for?" className="field-control mt-1.5 resize-y" {...register('purpose')} />
            {errors.purpose && <p className="mt-1.5 text-xs font-medium text-danger">{errors.purpose.message}</p>}
          </div>
        </div>
      </section>
      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        <Link to="/trips"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={isSubmitting} className="min-w-36">
          {isSubmitting && <Spinner />}<span>{trip ? 'Save changes' : 'Add trip'}</span>
        </Button>
      </div>
    </form>
  );
}
