import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { createTrip } from '@/api/tripApi';
import { getVehicles } from '@/api/vehicleApi';
import TripForm from '@/components/trips/TripForm';
import { Button, EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/common';
import type { TripFormValues } from '@/schemas/tripSchemas';
import type { Vehicle } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

export default function AddTripPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getVehicles().then((response) => setVehicles(response.data.vehicles))
      .catch((reason) => setError(getErrorMessage(reason, 'We could not load your vehicles.')));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!vehicles) return <PageSkeleton />;

  const submit = async (values: TripFormValues) => {
    try {
      const { data } = await createTrip(values);
      toast.success(data.message);
      navigate('/trips');
    } catch (reason) {
      toast.error(getErrorMessage(reason));
      throw reason;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Add trip" subtitle="Plan a trip with one of your vehicles." />
      {vehicles.length === 0 ? (
        <EmptyState title="Add a vehicle first" description="Trips must be linked to one of your registered vehicles."
          action={<Link to="/vehicles/new"><Button><Plus className="h-4 w-4" />Add vehicle</Button></Link>} />
      ) : <TripForm vehicles={vehicles} onSubmit={submit} />}
    </div>
  );
}
