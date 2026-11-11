import { z } from 'zod';
import { phoneRegex } from './validations';

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  contactNumber: z.string().regex(phoneRegex, 'Enter a valid contact number'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/\d/, 'Password must include a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
