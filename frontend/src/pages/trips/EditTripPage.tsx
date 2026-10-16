import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getTrip, updateTrip } from '@/api/tripApi';
import { getVehicles } from '@/api/vehicleApi';
import TripForm from '@/components/trips/TripForm';
import { Button, ErrorState, PageHeader, PageSkeleton } from '@/components/common';
import type { TripFormValues } from '@/schemas/tripSchemas';
import type { Trip, Vehicle } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

export default function EditTripPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getTrip(id), getVehicles()]).then(([tripResponse, vehicleResponse]) => {
      setTrip(tripResponse.data.trip);
      setVehicles(vehicleResponse.data.vehicles);
    }).catch((reason) => setError(getErrorMessage(reason)));
  }, [id]);

  if (error) return <div className="space-y-4">
    <ErrorState message={error} />
    <Button variant="secondary" onClick={() => navigate('/trips')}>Back to trips</Button>
  </div>;
  if (!trip || !vehicles) return <PageSkeleton />;

  const submit = async (values: TripFormValues) => {
    try {
      const locationsChanged = values.startLocation !== trip.startLocation || values.destination !== trip.destination ||
        values.startCoordinates?.lat !== trip.startCoordinates?.lat || values.startCoordinates?.lng !== trip.startCoordinates?.lng ||
        values.destinationCoordinates?.lat !== trip.destinationCoordinates?.lat || values.destinationCoordinates?.lng !== trip.destinationCoordinates?.lng;
      const { data } = await updateTrip(id, values);
      toast.success(data.message);
      if (locationsChanged && trip.selectedRoute && !data.trip.selectedRoute) toast('Trip locations changed. Please recalculate the route.');
      navigate('/trips');
    } catch (reason) {
      toast.error(getErrorMessage(reason));
      throw reason;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Edit trip" subtitle="Update the details or status of this trip." />
      <TripForm trip={trip} vehicles={vehicles} onSubmit={submit} />
    </div>
  );
}
