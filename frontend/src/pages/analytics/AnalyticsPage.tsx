import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Fuel, ListFilter, Plus, ReceiptText, RotateCcw, Wallet } from 'lucide-react';
import { getFuelRecords } from '@/api/fuelRecordApi';
import { getVehicles } from '@/api/vehicleApi';
import { formatPkr } from '@/components/budgets/BudgetOverview';
import { Button, EmptyState, ErrorState, PageHeader, Select, Skeleton } from '@/components/common';
import {
  FuelCostChart,
  FuelQuantityChart,
  VehicleComparisonChart,
  formatLiters,
} from '@/components/analytics/AnalyticsCharts';
import VehicleBadge from '@/components/vehicles/VehicleBadge';
import type { FuelRecord, Vehicle } from '@/types';
import { calculateAnalytics, type FuelTypeFilter, type MonthRange } from '@/utils/analytics';
import { selectLiterRecords } from '@/utils/analyticsDisplay';
import { getErrorMessage } from '@/utils/errorHandler';

const fuelTypes = ['Petrol', 'Diesel', 'Electric'] as const;
const percent = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });

export default function AnalyticsPage() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [months, setMonths] = useState<MonthRange>(6);
  const [vehicleId, setVehicleId] = useState('');
  const [fuelType, setFuelType] = useState<FuelTypeFilter>('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [recordResponse, vehicleResponse] = await Promise.all([
        getFuelRecords(),
        getVehicles(),
      ]);
      setRecords(recordResponse.data.records);
      setVehicles(vehicleResponse.data.vehicles);
      setError('');
      setStatus('ready');
    } catch (reason) {
      setError(getErrorMessage(reason, 'We could not load your fuel analytics.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const analytics = useMemo(
    () => calculateAnalytics(records, vehicles, months, vehicleId, fuelType),
    [records, vehicles, months, vehicleId, fuelType],
  );
  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle._id, vehicle])),
    [vehicles],
  );
  const literAnalytics = useMemo(() => {
    const literRecords = selectLiterRecords(records, vehicleById);
    return calculateAnalytics(literRecords, vehicles, months, vehicleId, fuelType);
  }, [records, vehicles, vehicleById, months, vehicleId, fuelType]);
  const hasFilters = months !== 6 || Boolean(vehicleId) || Boolean(fuelType);
  const reset = () => {
    setMonths(6);
    setVehicleId('');
    setFuelType('');
  };
  const period = `Last ${months} months`;
  const hasElectricPurchases = analytics.vehicles.some(
    (vehicle) => vehicleById.get(vehicle.id)?.fuelType === 'Electric',
  );
  const spendMix = fuelTypes
    .filter((type) =>
      analytics.vehicles.some((vehicle) => vehicleById.get(vehicle.id)?.fuelType === type),
    )
    .map((type) => ({
      type,
      cost: analytics.vehicles.reduce(
        (total, vehicle) =>
          total + (vehicleById.get(vehicle.id)?.fuelType === type ? vehicle.cost : 0),
        0,
      ),
    }));

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title="Analytics" subtitle="Understand fuel spending and usage patterns." />

      <section
        aria-label="Analytics filters"
        className="app-panel grid min-w-0 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto] xl:items-end"
      >
        <Select
          label="Date range"
          value={months}
          onChange={(event) => setMonths(Number(event.target.value) as MonthRange)}
        >
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </Select>
        <Select
          label="Vehicle"
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
        >
          <option value="">All vehicles</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle._id} value={vehicle._id}>
              {vehicle.vehicleName} ({vehicle.registrationNumber})
            </option>
          ))}
        </Select>
        <Select
          label="Fuel type"
          value={fuelType}
          onChange={(event) => setFuelType(event.target.value as FuelTypeFilter)}
        >
          <option value="">All fuel types</option>
          {fuelTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={reset} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </Button>
        )}
      </section>

      {status === 'loading' ? (
        <AnalyticsSkeleton />
      ) : status === 'error' ? (
        <ErrorState message={error} retry={load} />
      ) : analytics.purchases === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={
            records.length === 0
              ? 'No fuel data available yet'
              : hasFilters
                ? 'No records match these filters'
                : 'No purchases in the last 6 months'
          }
          description={
            records.length === 0
              ? 'Add your first fuel purchase to see spending trends and vehicle comparisons.'
              : hasFilters
                ? 'Try another period, vehicle, or fuel type to see your data.'
                : 'Older purchases may be outside this period. Choose a longer range or add a new record.'
          }
          action={
            records.length === 0 || !hasFilters ? (
              <Link to={vehicles.length ? '/fuel-records/new' : '/vehicles/new'}>
                <Button>
                  <Plus className="h-4 w-4" />
                  {vehicles.length ? 'Add fuel record' : 'Add vehicle'}
                </Button>
              </Link>
            ) : (
              <Button variant="secondary" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Reset filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
            <Metric
              icon={Wallet}
              label="Total spent"
              value={formatPkr(analytics.cost)}
              context={`${period} · ${analytics.vehicles.length} active vehicle${analytics.vehicles.length === 1 ? '' : 's'}`}
            />
            <Metric
              icon={Fuel}
              label="Fuel purchased"
              value={
                literAnalytics.purchases ? formatLiters(literAnalytics.quantity) : 'Unavailable'
              }
              context={
                hasElectricPurchases
                  ? 'Petrol and diesel only · EV quantity excluded'
                  : 'Petrol and diesel · liters'
              }
            />
            <Metric
              icon={ReceiptText}
              label="Average purchase cost"
              value={formatPkr(analytics.averageCost)}
              context="Across filtered purchases"
            />
            <Metric
              icon={ListFilter}
              label="Fuel purchase records"
              value={String(analytics.purchases)}
              context={period}
            />
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <FuelCostChart months={analytics.monthly} />
            <SpendingMix costs={spendMix} total={analytics.cost} />
          </div>
          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <FuelQuantityChart
              months={literAnalytics.monthly}
              hasSupportedQuantity={literAnalytics.purchases > 0}
            />
            <VehicleComparisonChart vehicles={analytics.vehicles} />
          </div>

          <section
            className="app-panel min-w-0 overflow-hidden"
            aria-labelledby="analytics-vehicle-stats"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div>
                <h2 id="analytics-vehicle-stats" className="text-base font-semibold text-content">
                  Vehicle statistics
                </h2>
                <p className="mt-1 text-xs text-content-muted">
                  Purchase details for the selected period.
                </p>
              </div>
              <span className="text-xs font-medium text-content-muted">
                {analytics.vehicles.length} vehicle{analytics.vehicles.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Vehicle</th>
                    <th className="px-4 py-3.5">Fuel type</th>
                    <th className="px-4 py-3.5 text-right">Quantity</th>
                    <th className="px-4 py-3.5 text-right">Total cost</th>
                    <th className="px-4 py-3.5 text-right">Purchases</th>
                    <th className="px-6 py-3.5 text-right">Avg purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {analytics.vehicles.map((vehicle) => {
                    const type = vehicleById.get(vehicle.id)?.fuelType;
                    return (
                      <tr
                        key={vehicle.id}
                        className="transition-colors duration-150 hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <span
                            className="block max-w-56 truncate font-semibold text-content"
                            title={vehicle.name}
                          >
                            {vehicle.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-content-muted">
                            {vehicle.registration}
                          </span>
                        </td>
                        <td className="px-4 py-4">{type && <VehicleBadge fuel={type} />}</td>
                        <td className="px-4 py-4 text-right tabular-nums text-slate-700">
                          {type === 'Electric' ? 'Not available' : formatLiters(vehicle.quantity)}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold tabular-nums text-content">
                          {formatPkr(vehicle.cost)}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-slate-700">
                          {vehicle.purchases}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700">
                          {formatPkr(vehicle.cost / vehicle.purchases)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-line lg:hidden">
              {analytics.vehicles.map((vehicle) => {
                const type = vehicleById.get(vehicle.id)?.fuelType;
                return (
                  <article key={vehicle.id} className="space-y-3 p-4 sm:p-5">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-content">
                          {vehicle.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-content-muted">{vehicle.registration}</p>
                      </div>
                      {type && <VehicleBadge fuel={type} />}
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold tabular-nums text-content">
                        {formatPkr(vehicle.cost)}
                      </p>
                      <p className="text-xs tabular-nums text-content-muted">
                        {vehicle.purchases} purchase{vehicle.purchases === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text-xs text-content-muted">
                      Quantity:{' '}
                      {type === 'Electric' ? 'Not available' : formatLiters(vehicle.quantity)} · Avg
                      purchase: {formatPkr(vehicle.cost / vehicle.purchases)}
                    </p>
                  </article>
                );
              })}
            </div>
            {hasElectricPurchases && (
              <p className="border-t border-line bg-slate-50/50 px-5 py-3 text-xs leading-relaxed text-content-muted sm:px-6">
                Electric purchase quantities are hidden because Fuel Records do not specify a kWh
                unit. Spending and purchase counts still include them.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  context,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  context: string;
}) {
  return (
    <section className="app-panel dashboard-enter min-w-0 p-5 transition-shadow duration-150 hover:shadow-panel">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-content-muted">{label}</p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 break-words text-2xl font-bold tracking-tight tabular-nums text-content">
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-content-muted">{context}</p>
    </section>
  );
}

function SpendingMix({
  costs,
  total,
}: {
  costs: { type: Vehicle['fuelType']; cost: number }[];
  total: number;
}) {
  const colors = { Petrol: 'bg-accent', Diesel: 'bg-slate-500', Electric: 'bg-emerald-500' };
  return (
    <section className="app-panel min-w-0 p-5 sm:p-6" aria-labelledby="analytics-mix-title">
      <h2 id="analytics-mix-title" className="text-base font-semibold text-content">
        Spending mix
      </h2>
      <p className="mt-1 text-xs text-content-muted">Cost split by vehicle fuel type.</p>
      <p className="mt-7 break-words text-3xl font-bold tracking-tight tabular-nums text-content">
        {formatPkr(total)}
      </p>
      <p className="mt-1 text-xs text-content-muted">Total across filtered purchases</p>
      <div
        role="img"
        aria-label={`Spending mix: ${costs.map(({ type, cost }) => `${type} ${formatPkr(cost)}`).join(', ')}`}
        className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100"
      >
        {costs.map(({ type, cost }) => (
          <span
            key={type}
            className={`${colors[type]} h-full transition-[width] duration-200`}
            style={{ width: `${total > 0 ? (cost / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {costs.map(({ type, cost }) => (
          <div key={type} className="flex min-w-0 items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-content-muted">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${colors[type]}`}
              />
              {type}
            </span>
            <span className="text-right font-semibold tabular-nums text-content">
              {formatPkr(cost)}{' '}
              <span className="ml-1 text-xs font-normal text-content-muted">
                {total > 0 ? percent.format((cost / total) * 100) : '0'}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalyticsSkeleton() {
  return (
    <div role="status" aria-label="Loading analytics" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="app-panel space-y-4 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="app-panel p-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-5 h-64 w-full" />
        </div>
        <div className="app-panel p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-5 h-64 w-full" />
        </div>
      </div>
      <div className="app-panel p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-5 h-32 w-full" />
      </div>
    </div>
  );
}
