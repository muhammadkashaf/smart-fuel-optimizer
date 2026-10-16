import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CarFront, Fuel, Plus, ArrowRight, Zap, Gauge } from 'lucide-react';
import { getVehicles } from '@/api/vehicleApi';
import { useAuth } from '@/hooks/useAuth';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
} from '@/components/common';
import VehicleBadge from '@/components/vehicles/VehicleBadge';
import DashboardBudget from '@/components/budgets/DashboardBudget';
import DashboardCrisisMode from '@/components/crisis/DashboardCrisisMode';
import type { Vehicle } from '@/types';

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const { user } = useAuth();

  const load = async () => {
    setStatus('loading');
    try {
      const response = await getVehicles();
      setVehicles(response.data.vehicles);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (status === 'loading') return <PageSkeleton />;
  if (status === 'error')
    return <ErrorState message="We couldn't load your vehicle dashboard data." retry={load} />;

  const petrolCount = vehicles.filter((v) => v.fuelType === 'Petrol').length;
  const altFuelCount = vehicles.filter((v) => v.fuelType !== 'Petrol').length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${user?.fullName?.split(' ')[0] || 'User'}`}
        subtitle={`Fuel and vehicle overview · ${user?.role || 'Member'} workspace`}
        action={
          <Link to="/vehicles/new">
            <Button>
              <Plus className="h-4 w-4" />
              <span>Add vehicle</span>
            </Button>
          </Link>
        }
      />

      <DashboardBudget />
      <DashboardCrisisMode />

      {/* KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Total vehicles"
          value={vehicles.length}
          subtext="Active vehicles registered"
          icon={<CarFront className="h-5 w-5 text-accent" />}
          iconBg="bg-accent-soft text-accent"
        />
        <MetricCard
          label="Petrol engines"
          value={petrolCount}
          subtext={`${vehicles.length > 0 ? Math.round((petrolCount / vehicles.length) * 100) : 0}% of registered vehicles`}
          icon={<Fuel className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50 text-amber-600"
        />
        <MetricCard
          label="Alternative fuel / EV"
          value={altFuelCount}
          subtext={`${vehicles.length > 0 ? Math.round((altFuelCount / vehicles.length) * 100) : 0}% green & diesel units`}
          icon={<Zap className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Recent Vehicles Section */}
      <section className="app-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent vehicle records</h2>
            <p className="mt-0.5 text-xs text-content-muted">
              Latest additions to your vehicle records
            </p>
          </div>
          {vehicles.length > 0 && (
            <Link
              to="/vehicles"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-strong transition-colors"
            >
              <span>View all vehicles</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {vehicles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.slice(0, 3).map((v) => (
                <article
                  key={v._id}
                  className="group relative rounded-xl border border-line bg-surface p-5 transition-all duration-150 hover:border-slate-300 hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-accent transition-colors">
                        {v.vehicleName}
                      </h3>
                      <p className="mt-0.5 text-xs text-content-muted">
                        {v.manufacturer} · {v.modelYear}
                      </p>
                    </div>
                    <VehicleBadge fuel={v.fuelType} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-3 text-xs">
                    <span className="min-w-0 break-all rounded bg-slate-100 px-2 py-0.5 font-mono font-medium text-slate-700">
                      {v.registrationNumber}
                    </span>
                    <div className="flex items-center gap-1 text-content-muted">
                      <Gauge className="h-3.5 w-3.5" />
                      <span className="font-medium tabular-nums text-slate-700">
                        {v.fuelEfficiency} {v.fuelType === 'Electric' ? 'km/kWh' : 'km/L'}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No vehicles registered"
              description="Your workspace is ready. Add your first vehicle to start tracking fuel efficiency and specs."
              action={
                <Link to="/vehicles/new">
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add your first vehicle</span>
                  </Button>
                </Link>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
  iconBg,
}: {
  label: string;
  value: number | string;
  subtext: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="app-panel p-5 transition-all duration-150 hover:border-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${iconBg}`}>{icon}</div>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-content-muted">{subtext}</p>
      </div>
    </div>
  );
}
