import api from './axios';
import type { Vehicle } from '@/types';

type VehiclesResponse = {
  vehicles: Vehicle[];
};

type VehicleResponse = {
  vehicle: Vehicle;
  message?: string;
};

export const getVehicles = () => api.get<VehiclesResponse>('/vehicles');
export const getVehicle = (id: string) => api.get<VehicleResponse>(`/vehicles/${id}`);
export const createVehicle = (data: Omit<Vehicle, '_id'>) => api.post<VehicleResponse>('/vehicles', data);
export const updateVehicle = (id: string, data: Partial<Vehicle>) => api.put<VehicleResponse>(`/vehicles/${id}`, data);
export const deleteVehicle = (id: string) => api.delete(`/vehicles/${id}`);
