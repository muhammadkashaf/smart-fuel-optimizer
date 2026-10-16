import type { FuelRecord, Vehicle } from '@/types';

/** FuelRecord.quantity has no unit. Only combustion records can be labelled as liters. */
export const selectLiterRecords = (records: FuelRecord[], vehicleById: Map<string, Vehicle>) =>
  records.filter((record) => {
    const id = typeof record.vehicleId === 'string' ? record.vehicleId : record.vehicleId._id;
    const type = vehicleById.get(id)?.fuelType;
    return type === 'Petrol' || type === 'Diesel';
  });
