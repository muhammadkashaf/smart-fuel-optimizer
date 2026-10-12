import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getFuelRecord, updateFuelRecord } from '@/api/fuelRecordApi';
import { getVehicles } from '@/api/vehicleApi';
import FuelRecordForm from '@/components/fuelRecords/FuelRecordForm';
import { ErrorState, PageHeader, PageSkeleton } from '@/components/common';
import type { FuelRecordFormValues } from '@/schemas/fuelRecordSchemas';
import type { FuelRecord, Vehicle } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';

export default function EditFuelRecordPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<FuelRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getFuelRecord(id), getVehicles()])
      .then(([recordResponse, vehicleResponse]) => {
        setRecord(recordResponse.data.record);
        setVehicles(vehicleResponse.data.vehicles);
      })
      .catch((reason) => setError(getErrorMessage(reason)));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!record || !vehicles) return <PageSkeleton />;

  const submit = async (values: FuelRecordFormValues) => {
    try {
      const { data } = await updateFuelRecord(id, values);
      toast.success(data.message);
      navigate('/fuel-records');
    } catch (reason) {
      toast.error(getErrorMessage(reason));
      throw reason;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Edit fuel record" subtitle="Update this purchase's vehicle, date, quantity, or cost." />
      <FuelRecordForm record={record} vehicles={vehicles} onSubmit={submit} />
    </div>
  );
}
