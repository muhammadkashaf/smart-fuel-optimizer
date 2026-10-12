export type User = {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  contactNumber: string;
  role: 'Individual' | 'Organizational' | 'Admin';
  createdAt?: string;
  updatedAt?: string;
  vehicleCount?: number;
};

export type Vehicle = {
  _id: string;
  vehicleName: string;
  registrationNumber: string;
  manufacturer: string;
  modelYear: number;
  fuelType: 'Petrol' | 'Diesel' | 'Electric';
  fuelEfficiency: number;
  fuelTankCapacity: number;
  userId?:
    | string
    | {
        _id: string;
        id?: string;
        fullName: string;
        email: string;
        contactNumber?: string;
        role?: 'Individual' | 'Organizational' | 'Admin';
      };
  createdAt?: string;
  updatedAt?: string;
};

export type FuelRecord = {
  _id: string;
  userId: string;
  vehicleId: string | Pick<Vehicle, '_id' | 'vehicleName' | 'registrationNumber'>;
  date: string;
  quantity: number;
  cost: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminStats = {
  totalUsers: number;
  totalAdmins: number;
  totalIndividuals: number;
  totalVehicles: number;
  petrolVehicles: number;
  dieselVehicles: number;
  electricVehicles: number;
};
