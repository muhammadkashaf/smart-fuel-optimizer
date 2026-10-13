import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getTrip, updateTrip } from '@/api/tripApi';
import { getVehicles } from '@/api/vehicleApi';
import TripForm from '@/components/trips/TripForm';
import { ErrorState, PageHeader, PageSkeleton } from '@/components/common';
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

  if (error) return <ErrorState message={error} />;
  if (!trip || !vehicles) return <PageSkeleton />;

  const submit = async (values: TripFormValues) => {
    try {
      const { data } = await updateTrip(id, values);
      toast.success(data.message);
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
