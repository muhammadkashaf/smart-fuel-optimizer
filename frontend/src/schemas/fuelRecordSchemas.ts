import { z } from 'zod';

export const fuelRecordSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, 'Enter a valid date'),
  quantity: z.number().finite().positive('Quantity must be greater than 0'),
  cost: z.number().finite().min(0, 'Cost must be zero or greater'),
});

export type FuelRecordFormValues = z.infer<typeof fuelRecordSchema>;
