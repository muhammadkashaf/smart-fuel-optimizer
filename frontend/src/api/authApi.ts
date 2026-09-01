import api from './axios';
export const loginRequest = (data: unknown) => api.post('/auth/login', data);
export const registerRequest = (data: unknown) => api.post('/auth/register', data);
export const logoutRequest = () => api.post('/auth/logout');
