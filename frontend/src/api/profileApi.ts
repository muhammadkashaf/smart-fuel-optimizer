import api from './axios';
export const getProfile = () => api.get('/profile');
export const updateProfile = (data: unknown) => api.put('/profile', data);
export const changePassword = (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
  api.put('/profile/password', data);
