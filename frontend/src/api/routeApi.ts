import api from './axios';
import type { RouteLocation, RouteOption, Trip } from '@/types';

export type RouteOptionsResponse = {
  planId: string | null;
  options: RouteOption[];
  calculatedAt: string;
};
export const getRouteOptions = (tripId: string, start: RouteLocation, destination: RouteLocation, signal?: AbortSignal) =>
  api.post<RouteOptionsResponse>(`/trips/${tripId}/route-options`, { start, destination }, { signal, timeout: 35000 });
export const saveTripRoute = (tripId: string, planId: string, optionId: string) =>
  api.put<{ trip: Trip; message: string }>(`/trips/${tripId}/route`, { planId, optionId });
