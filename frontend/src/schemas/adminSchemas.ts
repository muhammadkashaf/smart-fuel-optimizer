import { z } from 'zod';
import { phoneRegex } from './validations';

export const adminUserEditSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  contactNumber: z.string().regex(phoneRegex, 'Enter a valid contact number'),
  role: z.enum(['Individual', 'Organizational', 'Admin']),
});

export type AdminUserEditFormData = z.infer<typeof adminUserEditSchema>;
