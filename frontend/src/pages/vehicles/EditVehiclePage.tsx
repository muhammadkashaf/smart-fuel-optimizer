import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getVehicle, updateVehicle } from '@/api/vehicleApi';
import VehicleForm from '@/components/vehicles/VehicleForm';
import { ErrorState, PageHeader, PageSkeleton } from '@/components/common';
import { getErrorMessage } from '@/utils/errorHandler';
import type { Vehicle } from '@/types';

export default function EditVehiclePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getVehicle(id)
      .then((r) => setVehicle(r.data.vehicle))
      .catch((e) => setError(getErrorMessage(e)));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!vehicle) return <PageSkeleton />;

  const submit = async (values: {
    vehicleName: string;
    registrationNumber: string;
    manufacturer: string;
    modelYear: number;
    fuelType: 'Petrol' | 'Diesel' | 'Electric';
    fuelEfficiency: number;
    fuelTankCapacity: number;
  }) => {
    try {
      await updateVehicle(id, values);
      toast.success('Vehicle details updated successfully');
      navigate('/vehicles');
    } catch (e) {
      toast.error(getErrorMessage(e));
      throw e;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`Edit ${vehicle.vehicleName}`}
        subtitle={`Updating vehicle record · Registration: ${vehicle.registrationNumber}`}
      />
      <div>
        <VehicleForm vehicle={vehicle} onSubmit={submit} />
      </div>
    </div>
  );
}
