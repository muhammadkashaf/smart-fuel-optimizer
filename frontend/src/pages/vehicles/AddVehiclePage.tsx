import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createVehicle } from '@/api/vehicleApi';
import VehicleForm from '@/components/vehicles/VehicleForm';
import { PageHeader } from '@/components/common';
import { getErrorMessage } from '@/utils/errorHandler';

export default function AddVehiclePage() {
  const navigate = useNavigate();

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
      await createVehicle(values);
      toast.success('Vehicle added successfully');
      navigate('/vehicles');
    } catch (e) {
      toast.error(getErrorMessage(e));
      throw e;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Add new vehicle"
        subtitle="Register a new fleet asset with its operating and fuel parameters."
      />
      <div>
        <VehicleForm onSubmit={submit} />
      </div>
    </div>
  );
}

