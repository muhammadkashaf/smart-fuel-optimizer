import { z } from 'zod';
export const vehicleSchema = z.object({
  vehicleName: z.string().min(1, 'Vehicle name is required'),
  registrationNumber: z.string().min(3, 'Registration must be at least 3 characters'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  modelYear: z.coerce.number().int().min(1990).max(2026),
  fuelType: z.enum(['Petrol', 'Diesel', 'Electric']),
  fuelEfficiency: z.coerce.number().positive('Must be a positive number'),
  fuelTankCapacity: z.coerce.number().positive('Must be a positive number'),
});
