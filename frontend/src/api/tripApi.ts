import api from './axios';
import type { Trip, TripPriority, TripStatus } from '@/types';
import type { TripFormValues } from '@/schemas/tripSchemas';

export type TripFilters = { vehicleId?: string; status?: TripStatus; priority?: TripPriority };
type TripResponse = { trip: Trip; message: string };

export const getTrips = (filters?: TripFilters) => api.get<{ trips: Trip[] }>('/trips', { params: filters });
export const getTrip = (id: string) => api.get<TripResponse>(`/trips/${id}`);
export const createTrip = (data: TripFormValues) => api.post<TripResponse>('/trips', data);
export const updateTrip = (id: string, data: TripFormValues) => api.put<TripResponse>(`/trips/${id}`, data);
export const deleteTrip = (id: string) => api.delete<{ message: string }>(`/trips/${id}`);
