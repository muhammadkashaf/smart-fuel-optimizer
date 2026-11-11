import api from './axios';
export const loginRequest = (data: unknown) => api.post('/auth/login', data);
export const registerRequest = (data: unknown) => api.post('/auth/register', data);
export const logoutRequest = () => api.post('/auth/logout');
export const verifyEmailRequest = (data: { email: string; otp: string }) => api.post('/auth/verify-email', data);
export const resendVerificationRequest = (email: string) => api.post('/auth/resend-verification', { email });
export const forgotPasswordRequest = (email: string) => api.post('/auth/forgot-password', { email });
export const verifyResetOtpRequest = (data: { email: string; otp: string }) => api.post('/auth/verify-reset-otp', data);
export const resetPasswordRequest = (data: { email: string; otp: string; newPassword: string; confirmPassword: string }) => api.post('/auth/reset-password', data);
