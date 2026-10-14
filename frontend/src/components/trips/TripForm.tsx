import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CalendarDays, Route } from 'lucide-react';
import { Button, Input, Select, Spinner } from '@/components/common';
import LocationSearch from '@/components/trips/LocationSearch';
import { tripSchema, type TripFormValues } from '@/schemas/tripSchemas';
import type { Coordinates, Trip, Vehicle } from '@/types';

type SaveAction = 'save' | 'plan';
const sameCoordinates = (a?: Coordinates, b?: Coordinates) => a?.lat === b?.lat && a?.lng === b?.lng;

export default function TripForm({ vehicles, trip, onSubmit }: {
  vehicles: Vehicle[];
  trip?: Trip;
  onSubmit: (values: TripFormValues, action: SaveAction) => Promise<void>;
}) {
  const { register, control, setValue, setError, clearErrors, handleSubmit, formState: { errors, isSubmitting } } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      vehicleId: typeof trip?.vehicleId === 'string' ? trip.vehicleId : trip?.vehicleId._id ?? '',
      startLocation: trip?.startLocation ?? '',
      destination: trip?.destination ?? '',
      startCoordinates: trip?.startCoordinates,
      destinationCoordinates: trip?.destinationCoordinates,
      tripDate: trip?.tripDate.slice(0, 10) ?? '',
      priority: trip?.priority ?? 'Normal',
      purpose: trip?.purpose ?? '',
      status: trip?.status ?? 'Planned',
    },
  });
  const [startCoordinates, destinationCoordinates, startLocation, destination, vehicleId] = useWatch({
    control, name: ['startCoordinates', 'destinationCoordinates', 'startLocation', 'destination', 'vehicleId'],
  });
  const locationChanged = Boolean(trip?.selectedRoute && (
    startLocation !== trip.startLocation || destination !== trip.destination ||
    !sameCoordinates(startCoordinates, trip.startCoordinates) || !sameCoordinates(destinationCoordinates, trip.destinationCoordinates)
  ));
  const vehicleChanged = Boolean(trip?.selectedRoute && vehicleId !== (typeof trip.vehicleId === 'string' ? trip.vehicleId : trip.vehicleId._id));

  const submit = async (values: TripFormValues, action: SaveAction) => {
    let valid = true;
    if (!values.startCoordinates && !(trip && !trip.startCoordinates && values.startLocation === trip.startLocation)) {
      setError('startLocation', { message: 'Choose a starting point from the suggestions' });
      valid = false;
    }
    if (!values.destinationCoordinates && !(trip && !trip.destinationCoordinates && values.destination === trip.destination)) {
      setError('destination', { message: 'Choose a destination from the suggestions' });
      valid = false;
    }
    if (valid) await onSubmit(values, action);
  };

  return (
    <form onSubmit={handleSubmit((values) => submit(values, trip ? 'save' : 'plan'))} className="space-y-6">
      <section className="app-panel p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent"><CalendarDays className="h-4 w-4" /></div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Trip details</h2>
            <p className="text-xs text-content-muted">{trip?.selectedRoute ? 'Changing the vehicle or locations clears the saved route estimate. You can plan it again after saving.' : 'Choose your vehicle and exact locations before planning a route.'}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Select label="Vehicle" error={errors.vehicleId?.message} {...register('vehicleId')}>
            <option value="">Select a vehicle</option>
            {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleName} ({vehicle.registrationNumber})</option>)}
          </Select>
          <Input label="Trip date" type="date" error={errors.tripDate?.message} {...register('tripDate')} />
          <Controller name="startLocation" control={control} render={({ field }) => (
            <LocationSearch label="Starting point" value={{ label: field.value, coordinates: startCoordinates }} error={errors.startLocation?.message}
              disabled={isSubmitting} onChange={(value) => {
                field.onChange(value.label);
                setValue('startCoordinates', value.coordinates, { shouldDirty: true, shouldValidate: true });
                if (value.coordinates) clearErrors('startLocation');
              }} />
          )} />
          <Controller name="destination" control={control} render={({ field }) => (
            <LocationSearch label="Destination" value={{ label: field.value, coordinates: destinationCoordinates }} error={errors.destination?.message}
              disabled={isSubmitting} onChange={(value) => {
                field.onChange(value.label);
                setValue('destinationCoordinates', value.coordinates, { shouldDirty: true, shouldValidate: true });
                if (value.coordinates) clearErrors('destination');
              }} />
          )} />
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
        {locationChanged && <p role="status" className="mt-4 rounded-control border border-warning-border bg-warning-soft p-3 text-sm text-warning">Trip locations changed. Please recalculate the route after saving.</p>}
        {vehicleChanged && !locationChanged && <p role="status" className="mt-4 rounded-control border border-warning-border bg-warning-soft p-3 text-sm text-warning">Vehicle changed. Please recalculate the route after saving.</p>}
      </section>
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Link to="/trips" className="w-full sm:w-auto"><Button variant="secondary" type="button" className="w-full">Cancel</Button></Link>
        {!trip && <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, 'save'))} className="w-full sm:w-auto">Save trip only</Button>}
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto sm:min-w-36">
          {isSubmitting ? <Spinner /> : !trip ? <Route className="h-4 w-4" /> : null}<span>{trip ? 'Save changes' : 'Save & plan route'}</span>
        </Button>
      </div>
    </form>
  );
}
