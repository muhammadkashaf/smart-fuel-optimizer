import StatusBadge from '@/components/common/StatusBadge';
import { Check, Clock3, Fuel, Route, Zap } from 'lucide-react';
import type { RouteOption } from '@/types';

const decimal = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 1 });
const resource = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 });

export default function RouteOptionCards({
  options,
  selectedId,
  onSelect,
  disabled,
}: {
  options: RouteOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="grid min-w-0 gap-3 xl:grid-cols-3" disabled={disabled}>
      <legend className="sr-only">Select a route</legend>
      {options.map((option) => (
        <label
          key={option.id}
          className={`relative min-w-0 cursor-pointer rounded-card border p-5 shadow-card transition-[border-color,background-color,box-shadow] duration-200 focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 ${selectedId === option.id ? 'border-accent bg-accent-soft ring-1 ring-accent/20' : 'border-line bg-surface hover:border-accent-border hover:shadow-md'} ${disabled ? 'pointer-events-none opacity-70' : ''}`}
        >
          <input
            type="radio"
            name="route-option"
            value={option.id}
            className="sr-only"
            checked={selectedId === option.id}
            onChange={() => onSelect(option.id)}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-content">{option.name}</span>
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selectedId === option.id ? 'border-accent bg-accent text-white' : 'border-slate-300'}`}
            >
              {selectedId === option.id && <Check className="h-3 w-3" />}
            </span>
          </div>
          <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
            {option.isRecommended && <StatusBadge tone="accent">Recommended</StatusBadge>}
            {options.length > 1 && option.isFastest && <StatusBadge>Fastest</StatusBadge>}
            {options.length > 1 && option.isShortest && <StatusBadge>Shortest</StatusBadge>}
          </div>
          <dl className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-content-muted">
                <Route className="h-3.5 w-3.5" />
                Distance
              </dt>
              <dd className="font-semibold tabular-nums">{decimal.format(option.distanceKm)} km</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-content-muted">
                <Clock3 className="h-3.5 w-3.5" />
                Est. time
              </dt>
              <dd className="font-semibold tabular-nums">
                {decimal.format(option.durationMinutes)} min
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
              <dt className="flex items-center gap-1.5 text-content-muted">
                {option.resourceUnit === 'kWh' ? (
                  <Zap className="h-3.5 w-3.5" />
                ) : (
                  <Fuel className="h-3.5 w-3.5" />
                )}
                Estimated {option.resourceUnit === 'kWh' ? 'energy' : 'fuel'}
              </dt>
              <dd className="text-xl font-bold tracking-tight tabular-nums text-content">
                {resource.format(option.estimatedResource)} {option.resourceUnit}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs font-medium text-accent">
            {option.isRecommended
              ? `Lowest estimated ${option.resourceUnit === 'kWh' ? 'energy' : 'fuel'}${options.length > 1 ? ' of these routes' : ' · only route available'}`
              : selectedId === option.id
                ? 'Selected route'
                : 'Select this route'}
          </p>
        </label>
      ))}
    </fieldset>
  );
}
