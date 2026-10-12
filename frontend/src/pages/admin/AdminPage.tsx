import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  CarFront,
  Search,
  ShieldCheck,
  UserCheck,
  Edit3,
  Trash2,
  SlidersHorizontal,
  X,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminStats,
  getAdminUsers,
  getAdminUserById,
  updateAdminUser,
  deleteAdminUser,
  getAdminVehicles,
  updateAdminVehicle,
  deleteAdminVehicle,
} from '@/api/adminApi';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  Spinner,
} from '@/components/common';
import VehicleBadge from '@/components/vehicles/VehicleBadge';
import { getErrorMessage } from '@/utils/errorHandler';
import type { AdminStats, User, Vehicle } from '@/types';


export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'vehicles'>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<{ user: User; vehicles: Vehicle[] } | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  // Vehicles State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleFuel, setVehicleFuel] = useState('All');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [vehicleActionLoading, setVehicleActionLoading] = useState(false);

  const [error, setError] = useState('');

  // Load stats
  const loadStats = async () => {
    try {
      const res = await getAdminStats();
      setStats(res.data.stats);
    } catch {
      // Non-blocking for page
    } finally {
      setLoadingStats(false);
    }
  };

  // Load users
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await getAdminUsers();
      setUsers(res.data.users);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUsersLoading(false);
    }
  };

  // Load vehicles
  const loadVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const res = await getAdminVehicles();
      setVehicles(res.data.vehicles);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadUsers();
    loadVehicles();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.contactNumber?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesFuel = vehicleFuel === 'All' || v.fuelType === vehicleFuel;
      if (!matchesFuel) return false;
      if (!vehicleSearch.trim()) return true;

      const q = vehicleSearch.toLowerCase();
      const ownerName = typeof v.userId === 'object' ? v.userId?.fullName?.toLowerCase() : '';
      const ownerEmail = typeof v.userId === 'object' ? v.userId?.email?.toLowerCase() : '';

      return (
        v.vehicleName?.toLowerCase().includes(q) ||
        v.registrationNumber?.toLowerCase().includes(q) ||
        v.manufacturer?.toLowerCase().includes(q) ||
        ownerName?.includes(q) ||
        ownerEmail?.includes(q)
      );
    });
  }, [vehicles, vehicleSearch, vehicleFuel]);

  // User Actions
  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    setUserActionLoading(true);
    try {
      const res = await updateAdminUser(editingUser.id || editingUser._id || '', {
        fullName: editingUser.fullName,
        email: editingUser.email,
        contactNumber: editingUser.contactNumber,
        role: editingUser.role,
      });
      toast.success(res.data.message || 'User updated successfully');
      setEditingUser(null);
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setUserActionLoading(true);
    try {
      const res = await deleteAdminUser(deletingUser.id || deletingUser._id || '');
      toast.success(res.data.message || 'User deleted successfully');
      setDeletingUser(null);
      loadUsers();
      loadVehicles();
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      const res = await getAdminUserById(userId);
      setViewingUser(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Vehicle Actions
  const handleSaveVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingVehicle) return;

    setVehicleActionLoading(true);
    try {
      const res = await updateAdminVehicle(editingVehicle._id, {
        vehicleName: editingVehicle.vehicleName,
        registrationNumber: editingVehicle.registrationNumber,
        manufacturer: editingVehicle.manufacturer,
        modelYear: editingVehicle.modelYear,
        fuelType: editingVehicle.fuelType,
        fuelEfficiency: Number(editingVehicle.fuelEfficiency),
        fuelTankCapacity: Number(editingVehicle.fuelTankCapacity),
      });
      toast.success(res.data.message || 'Vehicle updated successfully');
      setEditingVehicle(null);
      loadVehicles();
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVehicleActionLoading(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;

    setVehicleActionLoading(true);
    try {
      const res = await deleteAdminVehicle(deletingVehicle._id);
      toast.success(res.data.message || 'Vehicle record removed successfully');
      setDeletingVehicle(null);
      loadVehicles();
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVehicleActionLoading(false);
    }
  };

  if (error && !users.length && !vehicles.length) {
    return (
      <ErrorState
        message={error}
        retry={() => {
          setError('');
          loadStats();
          loadUsers();
          loadVehicles();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Admin Management Portal"
        subtitle="Manage system-wide user accounts, role permissions, and registered vehicles."
      />

      {/* KPI Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="app-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Users
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-accent">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {loadingStats ? '-' : stats?.totalUsers ?? users.length}
          </p>
          <p className="mt-1 text-xs text-content-muted">Registered system accounts</p>
        </div>

        <div className="app-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Vehicles
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <CarFront className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {loadingStats ? '-' : stats?.totalVehicles ?? vehicles.length}
          </p>
          <p className="mt-1 text-xs text-content-muted">All active vehicle records</p>
        </div>

        <div className="app-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Administrators
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {loadingStats ? '-' : stats?.totalAdmins ?? users.filter((u) => u.role === 'Admin').length}
          </p>
          <p className="mt-1 text-xs text-content-muted">Privileged admin accounts</p>
        </div>

        <div className="app-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Individual Users
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {loadingStats
              ? '-'
              : stats?.totalIndividuals ?? users.filter((u) => u.role === 'Individual').length}
          </p>
          <p className="mt-1 text-xs text-content-muted">Standard user accounts</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-line">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors ${
              activeTab === 'users'
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>User Management ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors ${
              activeTab === 'vehicles'
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <CarFront className="h-4 w-4" />
            <span>Vehicle Records ({vehicles.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* USER MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* User Search Bar */}
          <div className="app-panel p-3.5 sm:p-4">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name, email, contact number, or role..."
                className="h-10 w-full rounded-lg border border-line bg-slate-50/50 pl-10 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:ring-3 focus:ring-accent/15"
              />
              {userSearch && (
                <button
                  onClick={() => setUserSearch('')}
                  aria-label="Clear user search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="app-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  Showing {filteredUsers.length} of {users.length} registered user{users.length === 1 ? '' : 's'}
                </span>
              </div>
              {userSearch && (
                <button
                  onClick={() => setUserSearch('')}
                  className="text-xs font-medium text-accent hover:text-accent-strong transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>

            {usersLoading ? (
              <div className="p-8">
                <PageSkeleton />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">No users found</h3>
                <p className="mt-1 text-xs text-content-muted">
                  No registered users match your search criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-4 py-3.5">Contact Number</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Registered</th>
                      <th className="px-4 py-3.5">Vehicles</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {filteredUsers.map((u) => (
                      <tr key={u.id || u._id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white shrink-0">
                              {u.fullName?.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{u.fullName}</div>
                              <div className="text-xs text-content-muted truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-slate-700 font-mono">
                            {u.contactNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                              u.role === 'Admin'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {u.role === 'Admin' && <ShieldCheck className="h-3 w-3" />}
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-content-muted">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-800">
                            {u.vehicleCount ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleViewUser(u.id || u._id || '')}
                              aria-label={`View details for ${u.fullName}`}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              title="View user & vehicle records"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingUser({ ...u })}
                              aria-label={`Edit ${u.fullName}`}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              title="Edit user details"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingUser(u)}
                              aria-label={`Delete ${u.fullName}`}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-danger transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VEHICLE MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          {/* Vehicle Search & Fuel Filter Toolbar */}
          <div className="app-panel p-3.5 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search Field */}
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Search by registration number, vehicle name, or user/owner..."
                  className="h-10 w-full rounded-lg border border-line bg-slate-50/50 pl-10 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:ring-3 focus:ring-accent/15"
                />
                {vehicleSearch && (
                  <button
                    onClick={() => setVehicleSearch('')}
                    aria-label="Clear vehicle search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Fuel Filter */}
              <div className="relative sm:w-52">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                />
                <select
                  aria-label="Filter by fuel type"
                  value={vehicleFuel}
                  onChange={(e) => setVehicleFuel(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-line bg-slate-50/50 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-accent focus:bg-white focus:ring-3 focus:ring-accent/15"
                >
                  <option value="All">All fuel types</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicles Table */}
          <div className="app-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <span className="text-xs font-semibold text-slate-700">
                Showing {filteredVehicles.length} of {vehicles.length} vehicle record{vehicles.length === 1 ? '' : 's'}
              </span>
              {(vehicleSearch || vehicleFuel !== 'All') && (
                <button
                  onClick={() => {
                    setVehicleSearch('');
                    setVehicleFuel('All');
                  }}
                  className="text-xs font-medium text-accent hover:text-accent-strong transition-colors"
                >
                  Reset filters
                </button>
              )}
            </div>

            {vehiclesLoading ? (
              <div className="p-8">
                <PageSkeleton />
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <CarFront className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">No vehicles found</h3>
                <p className="mt-1 text-xs text-content-muted">
                  No registered vehicles match your search or filter criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">Vehicle</th>
                      <th className="px-4 py-3.5">Registration</th>
                      <th className="px-4 py-3.5">Owner / User</th>
                      <th className="px-4 py-3.5">Fuel Type</th>
                      <th className="px-4 py-3.5">Efficiency</th>
                      <th className="px-4 py-3.5">Tank</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {filteredVehicles.map((v) => {
                      const owner = typeof v.userId === 'object' ? v.userId : null;
                      return (
                        <tr key={v._id} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">{v.vehicleName}</div>
                            <div className="text-xs text-content-muted mt-0.5">
                              {v.manufacturer} · {v.modelYear}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 border border-slate-200/60">
                              {v.registrationNumber}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {owner ? (
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900">{owner.fullName}</div>
                                <div className="text-[11px] text-content-muted truncate">{owner.email}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-content-muted">Unknown</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <VehicleBadge fuel={v.fuelType} />
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-medium tabular-nums text-slate-800">
                              {v.fuelEfficiency} <span className="text-xs text-slate-500 font-normal">km/L</span>
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-medium tabular-nums text-slate-800">
                              {v.fuelTankCapacity} <span className="text-xs text-slate-500 font-normal">L</span>
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingVehicle({ ...v })}
                                aria-label={`Edit vehicle ${v.vehicleName}`}
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                title="Edit vehicle record"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingVehicle(v)}
                                aria-label={`Delete vehicle ${v.vehicleName}`}
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-danger transition-colors"
                                title="Delete vehicle record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW USER DETAILS & VEHICLES */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-base font-bold text-white">
                  {viewingUser.user.fullName?.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{viewingUser.user.fullName}</h2>
                  <p className="text-xs text-content-muted">{viewingUser.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-line">
              <div>
                <span className="text-slate-500 block">Contact:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {viewingUser.user.contactNumber || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Role:</span>
                <span className="font-semibold text-slate-900">{viewingUser.user.role}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Registered:</span>
                <span className="font-semibold text-slate-900">
                  {viewingUser.user.createdAt
                    ? new Date(viewingUser.user.createdAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Registered Vehicles ({viewingUser.vehicles.length})
              </h3>
              {viewingUser.vehicles.length === 0 ? (
                <p className="text-xs text-content-muted italic">No vehicles registered by this user.</p>
              ) : (
                <div className="space-y-2">
                  {viewingUser.vehicles.map((veh) => (
                    <div
                      key={veh._id}
                      className="flex items-center justify-between p-3 rounded-lg border border-line bg-white"
                    >
                      <div>
                        <span className="text-sm font-semibold text-slate-900">{veh.vehicleName}</span>
                        <div className="text-xs text-content-muted">
                          {veh.manufacturer} · {veh.modelYear} · {veh.fuelEfficiency} km/L · {veh.fuelTankCapacity} L
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {veh.registrationNumber}
                        </span>
                        <VehicleBadge fuel={veh.fuelType} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <Button variant="secondary" size="md" onClick={() => setViewingUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT USER */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-bold text-slate-900">Edit User Account</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-5 space-y-4">
              <Input
                label="Full name"
                value={editingUser.fullName}
                onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                required
              />
              <Input
                label="Email address"
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                required
              />
              <Input
                label="Contact number"
                type="tel"
                value={editingUser.contactNumber}
                onChange={(e) => setEditingUser({ ...editingUser, contactNumber: e.target.value })}
                required
              />
              <Select
                label="Role"
                value={editingUser.role}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, role: e.target.value as User['role'] })
                }
              >
                <option value="Individual">Individual (Standard User)</option>
                <option value="Organizational">Organizational</option>
                <option value="Admin">Administrator</option>
              </Select>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={userActionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={userActionLoading}>
                  {userActionLoading && <Spinner />}
                  <span>Save changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE USER CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger ring-8 ring-red-50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Delete user account
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-content-muted">
                  Are you sure you want to delete <strong className="text-slate-900">{deletingUser.fullName}</strong> ({deletingUser.email})? All associated vehicle records will also be permanently removed.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeletingUser(null)}
                disabled={userActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteUser}
                disabled={userActionLoading}
              >
                {userActionLoading && <Spinner />}
                <span>Delete user & vehicles</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT VEHICLE */}
      {/* ========================================================================= */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-bold text-slate-900">Edit Vehicle Record</h2>
              <button
                onClick={() => setEditingVehicle(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="mt-5 space-y-4">
              <Input
                label="Vehicle name"
                value={editingVehicle.vehicleName}
                onChange={(e) =>
                  setEditingVehicle({ ...editingVehicle, vehicleName: e.target.value })
                }
                required
              />
              <Input
                label="Registration number"
                value={editingVehicle.registrationNumber}
                onChange={(e) =>
                  setEditingVehicle({ ...editingVehicle, registrationNumber: e.target.value })
                }
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Manufacturer"
                  value={editingVehicle.manufacturer}
                  onChange={(e) =>
                    setEditingVehicle({ ...editingVehicle, manufacturer: e.target.value })
                  }
                  required
                />
                <Input
                  label="Model year"
                  type="number"
                  value={editingVehicle.modelYear}
                  onChange={(e) =>
                    setEditingVehicle({ ...editingVehicle, modelYear: Number(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Select
                  label="Fuel type"
                  value={editingVehicle.fuelType}
                  onChange={(e) =>
                    setEditingVehicle({
                      ...editingVehicle,
                      fuelType: e.target.value as 'Petrol' | 'Diesel' | 'Electric',
                    })
                  }
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                </Select>
                <Input
                  label="Efficiency (km/L)"
                  type="number"
                  step="0.1"
                  value={editingVehicle.fuelEfficiency}
                  onChange={(e) =>
                    setEditingVehicle({
                      ...editingVehicle,
                      fuelEfficiency: Number(e.target.value),
                    })
                  }
                  required
                />
                <Input
                  label="Tank (L)"
                  type="number"
                  step="0.1"
                  value={editingVehicle.fuelTankCapacity}
                  onChange={(e) =>
                    setEditingVehicle({
                      ...editingVehicle,
                      fuelTankCapacity: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  disabled={vehicleActionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={vehicleActionLoading}>
                  {vehicleActionLoading && <Spinner />}
                  <span>Save vehicle changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE VEHICLE CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger ring-8 ring-red-50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Delete vehicle record
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-content-muted">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900">{deletingVehicle.vehicleName}</strong> (
                  {deletingVehicle.registrationNumber}) from system records?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeletingVehicle(null)}
                disabled={vehicleActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteVehicle}
                disabled={vehicleActionLoading}
              >
                {vehicleActionLoading && <Spinner />}
                <span>Delete vehicle</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
