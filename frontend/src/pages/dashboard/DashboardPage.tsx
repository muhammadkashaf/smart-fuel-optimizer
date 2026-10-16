import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CarFront, Fuel, Plus, Wallet } from 'lucide-react';
import { getVehicles } from '@/api/vehicleApi';
import { getFuelRecords } from '@/api/fuelRecordApi';
import { getTrips } from '@/api/tripApi';
import { useAuth } from '@/hooks/useAuth';
import { ErrorState, Skeleton } from '@/components/common';
import DashboardBudget from '@/components/budgets/DashboardBudget';
import DashboardCrisisMode from '@/components/crisis/DashboardCrisisMode';
import { formatPkr } from '@/components/budgets/BudgetOverview';
import { calculateAnalytics } from '@/utils/analytics';
import type { FuelRecord, Trip, Vehicle } from '@/types';

const number = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 });
const dateLabel = (date: string) =>
  new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
  });
const actionClass =
  'inline-flex items-center justify-center gap-2 rounded-control border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-accent-border hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent';

export default function DashboardPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedMonth, setSelectedMonth] = useState(5);
  const load = async () => {
    setStatus('loading');
    try {
      const [v, f, t] = await Promise.all([
        getVehicles(),
        getFuelRecords(),
        getTrips({ status: 'Planned' }),
      ]);
      setVehicles(v.data.vehicles);
      setRecords(f.data.records);
      setTrips(t.data.trips);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const analytics = useMemo(
    () => calculateAnalytics(records, vehicles, 6, '', ''),
    [records, vehicles],
  );
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const upcoming = trips
    .filter((trip) => trip.tripDate.slice(0, 10) >= today)
    .sort((a, b) => a.tripDate.localeCompare(b.tripDate));
  const recent = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const month = analytics.monthly[5];
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const metrics = [
    {
      label: "This month's fuel spend",
      value: formatPkr(month.cost),
      context: month.label,
      Icon: Wallet,
    },
    {
      label: 'Fuel purchased',
      value: `${number.format(month.quantity)} L`,
      context: 'Recorded this month',
      Icon: Fuel,
    },
    {
      label: 'Total vehicles',
      value: String(vehicles.length),
      context: vehicles.length ? 'In your workspace' : 'Add your first vehicle',
      Icon: CarFront,
    },
    {
      label: 'Upcoming trips',
      value: String(upcoming.length),
      context: 'Planned for today or later',
      Icon: CalendarDays,
    },
  ];
  if (status === 'loading')
    return (
      <div role="status" aria-label="Loading dashboard" className="space-y-5">
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-24" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  if (status === 'error')
    return <ErrorState message="We couldn't load your dashboard. Please try again." retry={load} />;
  const maxCost = Math.max(...analytics.monthly.map((item) => item.cost), 1);
  const points = analytics.monthly
    .map((item, i) => `${35 + i * 102},${175 - (item.cost / maxCost) * 140}`)
    .join(' ');
  const selected = analytics.monthly[selectedMonth];

  return (
    <div className="dashboard-enter space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-content-muted">
            Your workspace
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {greeting}, {user?.fullName?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-sm text-content-muted">Here's your fuel and vehicle overview.</p>
        </div>
        <Link to="/vehicles/new" className={actionClass}>
          <Plus className="h-4 w-4" />
          Add vehicle
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, context, Icon }, i) => (
          <section
            key={label}
            className="app-panel dashboard-enter min-w-0 p-5"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-content-muted">{label}</p>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {value}
            </p>
            <p className="mt-1.5 text-xs text-content-muted">{context}</p>
          </section>
        ))}
      </div>
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="app-panel min-w-0 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Fuel spending</h2>
              <p className="mt-1 text-xs text-content-muted">Last six months · PKR</p>
            </div>
            <Link to="/analytics" className="dashboard-link">
              Analytics <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {analytics.purchases === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
              <Fuel className="h-7 w-7 text-slate-300" />
              <p className="text-sm text-content-muted">No fuel purchases in this period.</p>
              <Link
                to={vehicles.length ? '/fuel-records/new' : '/vehicles/new'}
                className={actionClass}
              >
                {vehicles.length ? 'Add fuel record' : 'Add your first vehicle'}
              </Link>
            </div>
          ) : (
            <>
              <div aria-live="polite" className="mt-4 flex flex-wrap items-baseline gap-2">
                <strong className="text-xl tabular-nums">{formatPkr(selected.cost)}</strong>
                <span className="text-xs text-content-muted">{selected.label}</span>
              </div>
              <svg
                onPointerMove={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const x = ((event.clientX - bounds.left) / bounds.width) * 580;
                  setSelectedMonth(Math.max(0, Math.min(5, Math.round((x - 35) / 102))));
                }}
                className="mt-3 w-full"
                viewBox="0 0 580 195"
                role="img"
                aria-label="Monthly fuel spending. Select a month below for its exact amount."
              >
                {[35, 105, 175].map((y) => (
                  <line
                    key={y}
                    x1="35"
                    x2="545"
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 5"
                  />
                ))}
                <polygon points={`35,175 ${points} 545,175`} fill="#2563eb" opacity="0.06" />
                <polyline
                  className="spending-line"
                  points={points}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pathLength="1"
                />
                {analytics.monthly.map((item, i) => (
                  <circle
                    key={item.key}
                    cx={35 + i * 102}
                    cy={175 - (item.cost / maxCost) * 140}
                    r={i === selectedMonth ? 5 : 3}
                    fill="#2563eb"
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </svg>
              <div className="grid grid-cols-6 gap-1">
                {analytics.monthly.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    onMouseEnter={() => setSelectedMonth(i)}
                    onFocus={() => setSelectedMonth(i)}
                    onClick={() => setSelectedMonth(i)}
                    aria-pressed={i === selectedMonth}
                    aria-label={`${item.label}: ${formatPkr(item.cost)}`}
                    className={`rounded-md px-1 py-2 text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-accent sm:text-xs ${i === selectedMonth ? 'bg-accent-soft font-semibold text-accent' : 'text-content-muted hover:bg-slate-50'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
        <DashboardBudget />
      </div>
      <DashboardCrisisMode />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="app-panel min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Upcoming trips</h2>
            <Link to="/trips" className="dashboard-link">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {upcoming.length ? (
            <div className="divide-y divide-line-subtle">
              {upcoming.slice(0, 4).map((trip) => (
                <Link
                  key={trip._id}
                  to={`/trips/${trip._id}/edit`}
                  className="flex min-w-0 items-center gap-3 rounded-lg py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-semibold"
                      title={`${trip.startLocation} → ${trip.destination}`}
                    >
                      {trip.startLocation} → {trip.destination}
                    </p>
                    <p className="mt-1 text-xs text-content-muted">
                      {dateLabel(trip.tripDate)} · Planned · {trip.priority}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-content-muted">
              No upcoming trips. Plan your next journey when you're ready.
            </p>
          )}
          <Link
            to={vehicles.length ? '/trips/new' : '/vehicles/new'}
            className={`${actionClass} mt-3`}
          >
            <Plus className="h-3.5 w-3.5" />
            {vehicles.length ? 'Create trip' : 'Add a vehicle to plan trips'}
          </Link>
        </section>
        <section className="app-panel min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Recent fuel activity</h2>
            <Link to="/fuel-records" className="dashboard-link">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recent.length ? (
            <div className="divide-y divide-line-subtle">
              {recent.map((record) => (
                <div
                  key={record._id}
                  className="flex min-w-0 items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {typeof record.vehicleId === 'object'
                        ? record.vehicleId?.vehicleName || 'Vehicle unavailable'
                        : vehicles.find((v) => v._id === record.vehicleId)?.vehicleName ||
                          'Vehicle unavailable'}
                    </p>
                    <p className="mt-1 text-xs text-content-muted">
                      {dateLabel(record.date)} · {number.format(record.quantity)} L
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold tabular-nums">
                    {formatPkr(record.cost)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-content-muted">
              Your latest fuel purchases will appear here.
            </p>
          )}
          <Link
            to={vehicles.length ? '/fuel-records/new' : '/vehicles/new'}
            className={`${actionClass} mt-3`}
          >
            <Plus className="h-3.5 w-3.5" />
            {vehicles.length ? 'Add fuel record' : 'Add a vehicle to get started'}
          </Link>
        </section>
      </div>
    </div>
  );
}
