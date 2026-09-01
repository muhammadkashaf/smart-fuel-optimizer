import { z } from 'zod';
import { phoneRegex } from './validations';

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  contactNumber: z.string().regex(phoneRegex, 'Enter a valid contact number'),
});

export const passwordSchema = z
  .object({
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
