import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  Search,
  ShieldCheck,
  Edit3,
  Trash2,
  X,
  Info,
  Calendar,
  Phone,
  CarFront,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminUsers,
  getAdminUserById,
  updateAdminUser,
  deleteAdminUser,
} from '@/api/adminApi';
import {
  Button,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  RoleBadge,
  Select,
  Spinner,
} from '@/components/common';
import VehicleBadge from '@/components/vehicles/VehicleBadge';
import { adminUserEditSchema, type AdminUserEditFormData } from '@/schemas/adminSchemas';
import { getErrorMessage } from '@/utils/errorHandler';
import type { User, Vehicle } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals state
  const [viewingUser, setViewingUser] = useState<{ user: User; vehicles: Vehicle[] } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Form Hook
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminUserEditFormData>({
    resolver: zodResolver(adminUserEditSchema),
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers();
      setUsers(res.data.users);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered list
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) =>
      (roleFilter === 'All' || u.role === roleFilter) &&
      (!q || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)),
    );
  }, [users, search, roleFilter]);

  const resetFilters = () => { setSearch(''); setRoleFilter('All'); };

  // Open Edit Modal
  const openEditModal = (user: User) => {
    setEditingUser(user);
    reset({
      fullName: user.fullName,
      contactNumber: user.contactNumber,
      role: user.role,
    });
  };

  // Submit Edit Form
  const onEditSubmit = async (values: AdminUserEditFormData) => {
    if (!editingUser) return;
    setActionLoading(true);
    try {
      const res = await updateAdminUser(editingUser.id || editingUser._id || '', values);
      toast.success(res.data.message || 'User updated successfully');
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // View User Details
  const handleViewUser = async (userId: string) => {
    try {
      const res = await getAdminUserById(userId);
      setViewingUser(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };


  // Delete User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setActionLoading(true);
    try {
      const res = await deleteAdminUser(deletingUser.id || deletingUser._id || '');
      toast.success(res.data.message || 'User deleted successfully');
      setDeletingUser(null);
      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} retry={loadUsers} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Manage Users"
        subtitle="Manage member accounts and access roles."
      />

      {/* Search Bar Toolbar */}
      <div className="app-panel grid gap-3 p-3.5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-end sm:p-4">
        <div className="relative min-w-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            aria-label="Search users by name or email"
            className="h-10 w-full rounded-lg border border-line bg-slate-50/50 pl-10 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:ring-3 focus:ring-accent/15"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select label="Role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="All">All roles</option>
          <option value="Individual">Individual</option>
          <option value="Organizational">Organizational</option>
          <option value="Admin">Admin</option>
        </Select>
      </div>

      {/* Users Table Panel */}
      <div className="app-panel overflow-hidden">
        {/* Table info bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-600">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700">
              Showing {filteredUsers.length} of {users.length} manageable user{users.length === 1 ? '' : 's'}
            </span>
          </div>
          {(search || roleFilter !== 'All') && (
            <button
              onClick={resetFilters}
              className="text-xs font-medium text-accent hover:text-accent-strong transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-slate-900">No other users to manage</h3>
            <p className="mt-1 text-sm text-content-muted">Other registered accounts will appear here. Manage your own details in Profile.</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">No matching users found</h3>
            <p className="mt-1 text-xs text-content-muted">
              No manageable users match the selected search and role.
            </p>
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
          </div>
        ) : (<>
          <div className="divide-y divide-line md:hidden">
            {filteredUsers.map((u) => <div key={u.id || u._id} className="space-y-3 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{u.fullName?.slice(0, 1).toUpperCase() || 'U'}</span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{u.fullName}</p><p className="break-all text-xs text-content-muted">{u.email}</p></div>
                <RoleBadge role={u.role} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pl-12 text-xs text-content-muted"><span>Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PK') : 'N/A'}</span><span>{u.vehicleCount ?? 0} vehicles</span></div>
              <div className="flex justify-end gap-2 border-t border-line/70 pt-3">
                <Button variant="secondary" size="sm" onClick={() => handleViewUser(u.id || u._id || '')}>View</Button>
                <Button variant="secondary" size="sm" onClick={() => openEditModal(u)}>Edit</Button>
                <Button variant="secondary" size="sm" onClick={() => setDeletingUser(u)}>Delete</Button>
              </div>
            </div>)}
          </div>
          <div className="hidden max-w-full overflow-x-auto md:block">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Joined</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filteredUsers.map((u) => (
                  <tr key={u.id || u._id} className="transition-colors hover:bg-slate-50/70">
                    <td className="max-w-60 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white shrink-0">
                          {u.fullName?.slice(0, 1).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="break-words font-semibold text-slate-900">{u.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-52 break-all px-4 py-4 text-xs text-content-muted">{u.email}</td>
                    <td className="px-4 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-content-muted">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewUser(u.id || u._id || '')}
                          aria-label={`View details for ${u.fullName}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="View user details & vehicles"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(u)}
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
                          title="Delete user account"
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
        </>)}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW USER DETAILS & THEIR VEHICLES */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div role="dialog" aria-modal="true" aria-label="User details" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-base font-bold text-white shadow-xs">
                  {viewingUser.user.fullName?.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{viewingUser.user.fullName}</h2>
                  <p className="break-all text-xs text-content-muted">{viewingUser.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                aria-label="Close user details"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Overview Chips */}
            <div className="grid gap-3 sm:grid-cols-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-line">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Contact:</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {viewingUser.user.contactNumber || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Role:</span>
                  <span className="font-semibold text-slate-900">{viewingUser.user.role}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Registered:</span>
                  <span className="font-semibold text-slate-900">
                    {viewingUser.user.createdAt
                      ? new Date(viewingUser.user.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* User's vehicles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <CarFront className="h-4 w-4 text-slate-500" />
                  <span>Owned Vehicles ({viewingUser.vehicles.length})</span>
                </h3>
              </div>

              {viewingUser.vehicles.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-line rounded-xl bg-slate-50/50">
                  <p className="text-xs text-content-muted">No vehicles registered by this user yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {viewingUser.vehicles.map((veh) => (
                    <div
                      key={veh._id}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl border border-line bg-white shadow-xs"
                    >
                      <div className="min-w-0">
                        <span className="block break-words text-sm font-semibold text-slate-900">{veh.vehicleName}</span>
                        <div className="text-xs text-content-muted mt-0.5">
                          {veh.manufacturer} · {veh.modelYear} · {veh.fuelEfficiency} {veh.fuelType === 'Electric' ? 'km/kWh' : 'km/L'} · {veh.fuelTankCapacity} {veh.fuelType === 'Electric' ? 'kWh' : 'L'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200/60">
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
      {/* MODAL 2: EDIT USER (React Hook Form + Zod Validated) */}
      {/* ========================================================================= */}
      {editingUser && (
        <div role="dialog" aria-modal="true" aria-label="Edit user" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit User Account</h2>
                <p className="mt-0.5 break-all text-xs text-content-muted">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                aria-label="Close edit user dialog"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onEditSubmit)} className="mt-5 space-y-4">
              <Input
                label="Full name"
                placeholder="Enter user full name"
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <Input
                label="Contact number"
                type="tel"
                placeholder="+1 (555) 000-0000"
                error={errors.contactNumber?.message}
                {...register('contactNumber')}
              />

              <Select
                label="Account role"
                error={errors.role?.message}
                {...register('role')}
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
                  disabled={actionLoading || isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading || isSubmitting}>
                  {(actionLoading || isSubmitting) && <Spinner />}
                  <span>Save changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE USER CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div role="alertdialog" aria-modal="true" aria-label="Delete user" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs">
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
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900">{deletingUser.fullName}</strong> ({deletingUser.email})?
                  All associated vehicle records will also be removed. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeletingUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteUser}
                disabled={actionLoading}
              >
                {actionLoading && <Spinner />}
                <span>Delete user</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
