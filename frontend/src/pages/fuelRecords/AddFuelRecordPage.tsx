import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { createFuelRecord } from '@/api/fuelRecordApi';
import { getVehicles } from '@/api/vehicleApi';
import FuelRecordForm from '@/components/fuelRecords/FuelRecordForm';
import { Button, EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/common';
import type { FuelRecordFormValues } from '@/schemas/fuelRecordSchemas';
import type { Vehicle } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

export default function AddFuelRecordPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getVehicles()
      .then((response) => setVehicles(response.data.vehicles))
      .catch((reason) => setError(getErrorMessage(reason)));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!vehicles) return <PageSkeleton />;

  const submit = async (values: FuelRecordFormValues) => {
    try {
      const { data } = await createFuelRecord(values);
      toast.success(data.message);
      navigate('/fuel-records');
    } catch (reason) {
      toast.error(getErrorMessage(reason));
      throw reason;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Add fuel record" subtitle="Record a fuel purchase for one of your vehicles." />
      {vehicles.length === 0 ? (
        <EmptyState
          title="Add a vehicle first"
          description="Fuel purchases must be linked to one of your registered vehicles."
          action={<Link to="/vehicles/new"><Button><Plus className="h-4 w-4" />Add vehicle</Button></Link>}
        />
      ) : (
        <FuelRecordForm vehicles={vehicles} onSubmit={submit} />
      )}
    </div>
  );
}
