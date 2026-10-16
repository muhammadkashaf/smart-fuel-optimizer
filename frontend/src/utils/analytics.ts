import type { FuelRecord, Vehicle } from '@/types';

export type MonthRange = 3 | 6 | 12;
export type FuelTypeFilter = '' | Vehicle['fuelType'];

export type MonthlyTotal = {
  key: string;
  label: string;
  cost: number;
  quantity: number;
};

export type VehicleTotal = {
  id: string;
  name: string;
  registration: string;
  cost: number;
  quantity: number;
  purchases: number;
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const recordVehicleId = (record: FuelRecord) =>
  typeof record.vehicleId === 'string' ? record.vehicleId : record.vehicleId._id;

export function calculateAnalytics(
  records: FuelRecord[],
  vehicles: Vehicle[],
  months: MonthRange,
  vehicleId: string,
  fuelType: FuelTypeFilter,
  today = new Date(),
) {
  const monthly: MonthlyTotal[] = Array.from({ length: months }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - months + index + 1, 1);
    return {
      key: monthKey(date),
      label: date.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }),
      cost: 0,
      quantity: 0,
    };
  });
  const monthMap = new Map(monthly.map((month) => [month.key, month]));
  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle._id, vehicle]));
  const vehicleTotals = new Map<string, VehicleTotal>();
  let cost = 0;
  let quantity = 0;
  let purchases = 0;

  for (const record of records) {
    const month = monthMap.get(record.date.slice(0, 7));
    const id = recordVehicleId(record);
    const vehicle = vehicleMap.get(id);
    if (!month || !vehicle || (vehicleId && id !== vehicleId) || (fuelType && vehicle.fuelType !== fuelType)) continue;

    month.cost += record.cost;
    month.quantity += record.quantity;
    cost += record.cost;
    quantity += record.quantity;
    purchases += 1;

    const total = vehicleTotals.get(id) ?? {
      id,
      name: vehicle.vehicleName,
      registration: vehicle.registrationNumber,
      cost: 0,
      quantity: 0,
      purchases: 0,
    };
    total.cost += record.cost;
    total.quantity += record.quantity;
    total.purchases += 1;
    vehicleTotals.set(id, total);
  }

  return {
    monthly,
    vehicles: [...vehicleTotals.values()].sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name)),
    cost,
    quantity,
    purchases,
    averageCost: purchases ? cost / purchases : 0,
  };
}
