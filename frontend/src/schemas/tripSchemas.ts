import { z } from 'zod';

export const tripSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  startLocation: z.string().trim().min(1, 'Enter a starting point'),
  destination: z.string().trim().min(1, 'Enter a destination'),
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Enter a valid date'),
  priority: z.enum(['Essential', 'Normal', 'Non-essential']),
  purpose: z.string(),
  status: z.enum(['Planned', 'Completed', 'Cancelled']),
});

export type TripFormValues = z.infer<typeof tripSchema>;
