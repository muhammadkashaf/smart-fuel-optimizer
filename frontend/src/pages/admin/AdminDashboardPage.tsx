import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CarFront, UserRound, Users } from 'lucide-react';
import { getAdminStats } from '@/api/adminApi';
import { ErrorState, PageHeader, PageSkeleton, RoleBadge } from '@/components/common';
import VehicleBadge from '@/components/vehicles/VehicleBadge';
import { getErrorMessage } from '@/utils/errorHandler';
import type { AdminOverview } from '@/types';

const joinedDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = async () => {
    setStatus('loading');
    try {
      const { data } = await getAdminStats();
      setOverview(data);
      setStatus('ready');
    } catch (reason) {
      setError(getErrorMessage(reason, 'Could not load the system overview.'));
      setStatus('error');
    }
  };

  useEffect(() => { void load(); }, []);

  if (status === 'loading') return <PageSkeleton />;
  if (status === 'error' || !overview) return <ErrorState message={error} retry={load} />;

  const { stats, recentUsers, recentVehicles } = overview;
  const metrics = [
    { label: 'Total users', value: stats.totalUsers, Icon: Users, note: `Includes ${stats.totalAdmins} admin account${stats.totalAdmins === 1 ? '' : 's'}` },
    { label: 'Individual users', value: stats.totalIndividuals, Icon: UserRound, note: '' },
    { label: 'Organizational users', value: stats.totalOrganizational, Icon: Building2, note: '' },
    { label: 'Total vehicles', value: stats.totalVehicles, Icon: CarFront, note: '' },
  ];
  const fuelTypes = [
    { label: 'Petrol', count: stats.petrolVehicles, color: 'bg-amber-500' },
    { label: 'Diesel', count: stats.dieselVehicles, color: 'bg-slate-600' },
    { label: 'Electric', count: stats.electricVehicles, color: 'bg-emerald-500' },
  ];

  return <div className="min-w-0 space-y-6">
    <PageHeader title="System overview" subtitle="A snapshot of SmartFuel accounts and vehicles." />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, Icon, note }) => <div key={label} className="app-panel dashboard-enter min-w-0 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-content-muted">{label}</span>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><Icon aria-hidden="true" className="h-4 w-4" /></div>
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value.toLocaleString('en-PK')}</p>
        {note && <p className="mt-1 text-xs text-content-muted">{note}</p>}
      </div>)}
    </div>

    <section className="app-panel p-5 sm:p-6" aria-labelledby="vehicle-breakdown-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="vehicle-breakdown-title" className="text-base font-semibold text-slate-900">Vehicles by fuel type</h2>
          <p className="mt-0.5 text-xs text-content-muted">Current registered vehicles</p>
        </div>
      </div>
      <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-3">
        {fuelTypes.map(({ label, count, color }) => <div key={label} className="min-w-0">
          <div className="flex items-center justify-between gap-2 text-sm"><span className="font-medium text-slate-700">{label}</span><span className="font-semibold tabular-nums text-slate-900">{count}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${label}: ${count} of ${stats.totalVehicles} vehicles`}>
            <div className={`h-full rounded-full ${color}`} style={{ width: `${stats.totalVehicles ? (count / stats.totalVehicles) * 100 : 0}%` }} />
          </div>
        </div>)}
      </div>
    </section>

    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <section className="app-panel min-w-0 overflow-hidden" aria-labelledby="recent-users-title">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="recent-users-title" className="text-base font-semibold text-slate-900">Recent users</h2>
          <Link to="/admin/users" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-accent">View all <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
        </div>
        {recentUsers.length === 0 ? <p className="px-5 py-8 text-sm text-content-muted">No recent users to show.</p> :
          <div className="divide-y divide-line/70">{recentUsers.map((user) => <div key={user._id} className="flex min-w-0 items-center gap-3 px-5 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{user.fullName?.slice(0, 1).toUpperCase() || 'U'}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900" title={user.fullName}>{user.fullName}</p><p className="truncate text-xs text-content-muted" title={user.email}>{user.email}</p></div>
            <div className="shrink-0 text-right"><RoleBadge role={user.role} /><p className="mt-1 text-[11px] text-content-subtle">{joinedDate(user.createdAt)}</p></div>
          </div>)}</div>}
      </section>

      <section className="app-panel min-w-0 overflow-hidden" aria-labelledby="recent-vehicles-title">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="recent-vehicles-title" className="text-base font-semibold text-slate-900">Recent vehicles</h2>
          <Link to="/admin/vehicles" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-accent">View all <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
        </div>
        {recentVehicles.length === 0 ? <p className="px-5 py-8 text-sm text-content-muted">No recent vehicles to show.</p> :
          <div className="divide-y divide-line/70">{recentVehicles.map((vehicle) => {
            const owner = vehicle.userId && typeof vehicle.userId === 'object' ? vehicle.userId : null;
            return <div key={vehicle._id} className="flex min-w-0 items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900" title={vehicle.vehicleName}>{vehicle.vehicleName}</p><p className="truncate text-xs text-content-muted" title={owner?.fullName ?? undefined}>{vehicle.registrationNumber} · {owner?.fullName || 'Unknown / deleted user'}</p></div>
              <div className="shrink-0 text-right"><VehicleBadge fuel={vehicle.fuelType} /><p className="mt-1 text-[11px] text-content-subtle">{joinedDate(vehicle.createdAt)}</p></div>
            </div>;
          })}</div>}
      </section>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Link to="/admin/users" className="app-panel flex items-center justify-between gap-3 p-4 text-sm font-semibold text-slate-800 transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">Manage users <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      <Link to="/admin/vehicles" className="app-panel flex items-center justify-between gap-3 p-4 text-sm font-semibold text-slate-800 transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">Manage vehicles <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
    </div>
  </div>;
}
