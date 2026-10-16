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
    | null
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

export type TripPriority = 'Essential' | 'Normal' | 'Non-essential';
export type TripStatus = 'Planned' | 'Completed' | 'Cancelled';

export type Coordinates = { lat: number; lng: number };
export type RouteLocation = { label: string; coordinates: Coordinates };
export type SelectedRoute = {
  distanceKm: number;
  durationMinutes: number;
  estimatedResource: number;
  resourceUnit: 'L' | 'kWh';
  calculatedAt: string;
  plannedAt: string;
  fuelEfficiency: number;
  fuelType: Vehicle['fuelType'];
  wasLowestConsumption?: boolean;
  bestAvailableEstimatedResource?: number;
};
export type RouteOption = Pick<SelectedRoute, 'distanceKm' | 'durationMinutes' | 'estimatedResource' | 'resourceUnit'> & {
  id: string;
  name: string;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  isRecommended: boolean;
  isShortest: boolean;
  isFastest: boolean;
};

export type Trip = {
  _id: string;
  userId: string;
  vehicleId: string | Pick<Vehicle, '_id' | 'vehicleName' | 'registrationNumber'>;
  startLocation: string;
  destination: string;
  tripDate: string;
  priority: TripPriority;
  purpose: string;
  status: TripStatus;
  startCoordinates?: Coordinates;
  destinationCoordinates?: Coordinates;
  selectedRoute?: SelectedRoute;
  createdAt: string;
  updatedAt: string;
};

export type Budget = {
  _id: string;
  userId: string;
  month: number;
  year: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
};

export type BudgetSummary = {
  month: number;
  year: number;
  budget: number | null;
  spent: number;
  remaining: number | null;
  percentageUsed: number | null;
  isExceeded: boolean;
};

export type Notification = {
  _id: string;
  type: 'BUDGET_EXCEEDED' | 'INEFFICIENT_TRIP' | 'CRISIS_RECOMMENDATION';
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  message: string;
  actionPath: string;
  isRead: boolean;
  isResolved: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrisisRecommendationType = 'POSTPONE_NON_ESSENTIAL' | 'COMBINE_TRIPS' | 'PLAN_ROUTE' | 'REVIEW_INEFFICIENT_ROUTE' | 'UPDATE_VEHICLE_EFFICIENCY';
export type CrisisTripDetails = {
  id: string;
  start: string;
  destination: string;
  tripDate: string;
  vehicleName: string;
  vehicleRegistration: string;
};
export type CrisisRecommendation = {
  id: string;
  type: CrisisRecommendationType;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  message: string;
  relatedTripIds: string[];
  relatedTrips: CrisisTripDetails[];
  action: { label: string; path: string };
  estimatedResourceSaving?: number;
  resourceUnit?: 'L' | 'kWh';
};
export type CrisisSummary = {
  plannedTrips: number;
  nonEssentialTrips: number;
  tripsWithoutRoutes: number;
  estimatedPlannedFuelLiters: number;
  estimatedPlannedEnergyKwh: number;
  tripsWithEstimates: number;
};
export type CrisisRecommendationsResponse = {
  enabled: boolean;
  summary: CrisisSummary | null;
  recommendations: CrisisRecommendation[];
};

export type AdminStats = {
  totalUsers: number;
  totalAdmins: number;
  totalIndividuals: number;
  totalOrganizational: number;
  totalVehicles: number;
  petrolVehicles: number;
  dieselVehicles: number;
  electricVehicles: number;
};

export type AdminOverview = {
  stats: AdminStats;
  recentUsers: Pick<User, '_id' | 'fullName' | 'email' | 'role' | 'createdAt'>[];
  recentVehicles: Pick<Vehicle, '_id' | 'vehicleName' | 'registrationNumber' | 'fuelType' | 'userId' | 'createdAt'>[];
};
