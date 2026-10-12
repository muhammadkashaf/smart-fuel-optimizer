import api from './axios';
import type { FuelRecord } from '@/types';
import type { FuelRecordFormValues } from '@/schemas/fuelRecordSchemas';

type FuelRecordsResponse = { records: FuelRecord[] };
type FuelRecordResponse = { record: FuelRecord; message: string };

export const getFuelRecords = (vehicleId?: string) =>
  api.get<FuelRecordsResponse>('/fuel-records', { params: vehicleId ? { vehicleId } : undefined });
export const getFuelRecord = (id: string) => api.get<FuelRecordResponse>(`/fuel-records/${id}`);
export const createFuelRecord = (data: FuelRecordFormValues) =>
  api.post<FuelRecordResponse>('/fuel-records', data);
export const updateFuelRecord = (id: string, data: FuelRecordFormValues) =>
  api.put<FuelRecordResponse>(`/fuel-records/${id}`, data);
export const deleteFuelRecord = (id: string) => api.delete(`/fuel-records/${id}`);
