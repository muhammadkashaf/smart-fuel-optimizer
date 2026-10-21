import { z } from 'zod';
import { phoneRegex } from './validations';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    contactNumber: z.string().regex(phoneRegex, 'Enter a valid contact number'),
    role: z.enum(['Individual', 'Organizational']),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/\d/, 'Password must include a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

const emailField = z.string().email('Enter a valid email');
const otpField = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const verifyEmailSchema = z.object({ email: emailField, otp: otpField });
export const forgotPasswordSchema = z.object({ email: emailField });
export const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(/\d/, 'Password must include a number'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
