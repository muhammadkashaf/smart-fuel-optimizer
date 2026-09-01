import api from './axios';
import type { User, Vehicle, AdminStats } from '@/types';

type UsersResponse = {
  users: User[];
};

type UserDetailResponse = {
  user: User;
  vehicles: Vehicle[];
  message?: string;
};

type AdminVehiclesResponse = {
  vehicles: Vehicle[];
};

type AdminVehicleResponse = {
  vehicle: Vehicle;
  message?: string;
};

type StatsResponse = {
  stats: AdminStats;
};

export const getAdminStats = () => api.get<StatsResponse>('/admin/stats');

export const getAdminUsers = (search?: string) =>
  api.get<UsersResponse>('/admin/users', {
    params: search ? { search } : {},
  });

export const getAdminUserById = (id: string) =>
  api.get<UserDetailResponse>(`/admin/users/${id}`);

export const updateAdminUser = (id: string, data: Partial<User>) =>
  api.put<{ message: string; user: User }>(`/admin/users/${id}`, data);

export const deleteAdminUser = (id: string) =>
  api.delete<{ message: string }>(`/admin/users/${id}`);

export const getAdminVehicles = (params?: { search?: string; fuelType?: string }) =>
  api.get<AdminVehiclesResponse>('/admin/vehicles', { params });

export const updateAdminVehicle = (id: string, data: Partial<Vehicle>) =>
  api.put<AdminVehicleResponse>(`/admin/vehicles/${id}`, data);

export const deleteAdminVehicle = (id: string) =>
  api.delete<{ message: string }>(`/admin/vehicles/${id}`);
