import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Fuel, Plus, RotateCcw, TrendingUp } from 'lucide-react';
import { getFuelRecords } from '@/api/fuelRecordApi';
import { getVehicles } from '@/api/vehicleApi';
import { Button, EmptyState, ErrorState, PageHeader, PageSkeleton, Select } from '@/components/common';
import type { FuelRecord, Vehicle } from '@/types';
import { calculateAnalytics, type FuelTypeFilter, type MonthRange, type MonthlyTotal } from '@/utils/analytics';
import { getErrorMessage } from '@/utils/errorHandler';

const money = new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const liters = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-PK', { notation: 'compact', maximumFractionDigits: 1 });
const formatMoney = (value: number) => `PKR ${money.format(value)}`;

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
      const [recordResponse, vehicleResponse] = await Promise.all([getFuelRecords(), getVehicles()]);
      setRecords(recordResponse.data.records);
      setVehicles(vehicleResponse.data.vehicles);
      setError('');
      setStatus('ready');
    } catch (reason) {
      setError(getErrorMessage(reason, 'We could not load your fuel analytics.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const analytics = useMemo(
    () => calculateAnalytics(records, vehicles, months, vehicleId, fuelType),
    [records, vehicles, months, vehicleId, fuelType],
  );
  const hasFilters = months !== 6 || Boolean(vehicleId) || Boolean(fuelType);
  const reset = () => { setMonths(6); setVehicleId(''); setFuelType(''); };

  if (status === 'loading') return <PageSkeleton />;
  if (status === 'error') return <ErrorState message={error} retry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Understand fuel spending and usage patterns." />

      <section aria-label="Analytics filters" className="app-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
        <Select label="Time period" value={months} onChange={(event) => setMonths(Number(event.target.value) as MonthRange)}>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </Select>
        <Select label="Vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
          <option value="">All vehicles</option>
          {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleName} ({vehicle.registrationNumber})</option>)}
        </Select>
        <Select label="Fuel type" value={fuelType} onChange={(event) => setFuelType(event.target.value as FuelTypeFilter)}>
          <option value="">All fuel types</option>
          <option value="Petrol">Petrol</option>
          <option value="Diesel">Diesel</option>
          <option value="Electric">Electric</option>
        </Select>
        <Button variant="secondary" onClick={reset} disabled={!hasFilters} className="w-full sm:w-auto">
          <RotateCcw className="h-4 w-4" />Reset
        </Button>
      </section>

      {analytics.purchases === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={records.length === 0 ? 'No fuel purchases to analyze yet' : 'No fuel purchases match these filters'}
          description={records.length === 0
            ? 'Add a fuel purchase to see spending trends and vehicle comparisons.'
            : 'Try a different time period, vehicle, or fuel type to see your data.'}
          action={records.length === 0
            ? <Link to={vehicles.length ? '/fuel-records/new' : '/vehicles/new'}><Button><Plus className="h-4 w-4" />{vehicles.length ? 'Add fuel record' : 'Add vehicle'}</Button></Link>
            : <Button variant="secondary" onClick={reset}><RotateCcw className="h-4 w-4" />Reset filters</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
            <Metric label="Total spent" value={formatMoney(analytics.cost)} />
            <Metric label="Fuel purchased" value={`${liters.format(analytics.quantity)} L`} />
            <Metric label="Avg cost / purchase" value={formatMoney(analytics.averageCost)} />
            <Metric label="Records" value={String(analytics.purchases)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TrendChart title="Fuel cost over time" subtitle="Monthly spending in PKR" months={analytics.monthly} metric="cost" />
            <TrendChart title="Fuel quantity over time" subtitle="Monthly purchases in liters" months={analytics.monthly} metric="quantity" />
          </div>

          <section className="app-panel overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-line px-5 py-4 sm:px-6">
              <Fuel className="h-4 w-4 text-accent" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Per-vehicle statistics</h2>
                <p className="text-xs text-content-muted">Fuel purchases in the selected period</p>
              </div>
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr><th className="px-6 py-3.5">Vehicle</th><th className="px-4 py-3.5 text-right">Quantity</th><th className="px-4 py-3.5 text-right">Cost</th><th className="px-6 py-3.5 text-right">Purchases</th></tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {analytics.vehicles.map((vehicle) => <tr key={vehicle.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4"><span className="font-semibold text-slate-900">{vehicle.name}</span><span className="mt-0.5 block text-xs text-content-muted">{vehicle.registration}</span></td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-700">{liters.format(vehicle.quantity)} L</td>
                    <td className="px-4 py-4 text-right tabular-nums font-medium text-slate-900">{formatMoney(vehicle.cost)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-slate-700">{vehicle.purchases}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-line sm:hidden">
              {analytics.vehicles.map((vehicle) => <div key={vehicle.id} className="space-y-2 px-5 py-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{vehicle.name}</p><p className="text-xs text-content-muted">{vehicle.registration}</p></div><p className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(vehicle.cost)}</p></div>
                <p className="text-xs text-content-muted">{liters.format(vehicle.quantity)} L · {vehicle.purchases} purchase{vehicle.purchases === 1 ? '' : 's'}</p>
              </div>)}
            </div>
          </section>

          <section className="app-panel p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-accent" />
              <div><h2 className="text-base font-semibold text-slate-900">Vehicle comparison</h2><p className="text-xs text-content-muted">Total spending by vehicle</p></div>
            </div>
            <div className="mt-6 space-y-4">
              {analytics.vehicles.map((vehicle) => <div key={vehicle.id} className="grid gap-2 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="truncate text-sm font-medium text-slate-700" title={vehicle.name}>{vehicle.name}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${vehicle.name}: ${formatMoney(vehicle.cost)}`}><div className="h-full rounded-full bg-accent" style={{ width: `${analytics.vehicles[0].cost > 0 ? (vehicle.cost / analytics.vehicles[0].cost) * 100 : 0}%` }} /></div>
                <span className="text-sm font-semibold tabular-nums text-slate-900 sm:text-right">{formatMoney(vehicle.cost)}</span>
              </div>)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="app-panel min-w-0 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p></div>;
}

function TrendChart({ title, subtitle, months, metric }: { title: string; subtitle: string; months: MonthlyTotal[]; metric: 'cost' | 'quantity' }) {
  const values = months.map((month) => month[metric]);
  const max = Math.max(...values, 1);
  const x = (index: number) => 52 + index * (548 / (months.length - 1));
  const y = (value: number) => 172 - (value / max) * 148;
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const label = (value: number) => metric === 'cost' ? `PKR ${compact.format(value)}` : `${compact.format(value)} L`;

  return <section className="app-panel min-w-0 p-5 sm:p-6">
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    <p className="mt-0.5 text-xs text-content-muted">{subtitle}</p>
    <div className="mt-5 overflow-x-auto">
      <svg className="w-full min-w-[500px]" viewBox="0 0 620 214" role="img" aria-label={`${title}: ${months.map((month) => `${month.label} ${label(month[metric])}`).join(', ')}`}>
        {[0, 0.5, 1].map((fraction) => <g key={fraction}>
          <line x1="52" x2="600" y1={y(max * fraction)} y2={y(max * fraction)} stroke="#e2e8f0" strokeDasharray={fraction === 0 ? undefined : '4 4'} />
          <text x="45" y={y(max * fraction) + 4} textAnchor="end" fill="#64748b" fontSize="10">{label(max * fraction)}</text>
        </g>)}
        {metric === 'cost'
          ? <><polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{values.map((value, index) => <circle key={months[index].key} cx={x(index)} cy={y(value)} r="4" fill="#2563eb" stroke="white" strokeWidth="2"><title>{months[index].label}: {formatMoney(value)}</title></circle>)}</>
          : values.map((value, index) => <rect key={months[index].key} x={x(index) - Math.min(18, 220 / months.length)} y={y(value)} width={Math.min(36, 440 / months.length)} height={Math.max(0, 172 - y(value))} rx="4" fill="#2563eb"><title>{months[index].label}: {liters.format(value)} L</title></rect>)}
        {months.map((month, index) => (months.length < 12 || index % 2 === 0 || index === months.length - 1) && <text key={month.key} x={x(index)} y="202" textAnchor="middle" fill="#64748b" fontSize="11">{month.label}</text>)}
      </svg>
    </div>
  </section>;
}
