import { useId, useState } from 'react';
import { Fuel, TrendingUp } from 'lucide-react';
import { formatPkr } from '@/components/budgets/BudgetOverview';
import type { MonthlyTotal, VehicleTotal } from '@/utils/analytics';

const quantity = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-PK', { notation: 'compact', maximumFractionDigits: 1 });
export const formatLiters = (value: number) => `${quantity.format(value)} L`;
const fullMonth = (month: MonthlyTotal) =>
  new Date(`${month.key}-01T00:00:00`).toLocaleDateString('en-PK', {
    month: 'short',
    year: 'numeric',
  });

const width = 640;
const left = 56;
const right = 612;
const top = 24;
const bottom = 224;
const chartHeight = bottom - top;
const tickIndexes = (length: number) => (length <= 6 ? 1 : 3);
const niceCeiling = (value: number) => {
  if (value <= 0) return 1;
  const order = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / order) * order;
};

function ChartReadout({ label, title, value }: { label: string; title: string; value: string }) {
  return (
    <div
      aria-live="polite"
      className="min-w-0 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-card"
    >
      <p className="text-[11px] font-medium text-content-muted">{label}</p>
      <p className="mt-0.5 text-xs text-content-muted">{title}</p>
      <p className="mt-1 break-words text-sm font-bold tabular-nums text-content">{value}</p>
    </div>
  );
}

function MonthButtons({
  months,
  selected,
  onSelect,
  metric,
}: {
  months: MonthlyTotal[];
  selected: number;
  onSelect: (index: number) => void;
  metric: 'cost' | 'quantity';
}) {
  return (
    <div
      className="mt-1 grid grid-cols-3 gap-1 sm:grid-cols-6"
      aria-label={`Choose a month for ${metric === 'cost' ? 'spending' : 'fuel quantity'}`}
    >
      {months.map((month, index) => (
        <button
          key={month.key}
          type="button"
          aria-pressed={index === selected}
          aria-label={`${month.label}: ${metric === 'cost' ? formatPkr(month.cost) : formatLiters(month.quantity)}`}
          onMouseEnter={() => onSelect(index)}
          onFocus={() => onSelect(index)}
          onClick={() => onSelect(index)}
          className={`min-w-0 rounded-md px-1 py-1.5 text-[11px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent ${index === selected ? 'bg-accent-soft font-semibold text-accent' : 'text-content-muted hover:bg-slate-50'}`}
        >
          {month.label}
        </button>
      ))}
    </div>
  );
}

export function FuelCostChart({ months }: { months: MonthlyTotal[] }) {
  const [active, setActive] = useState(months.length - 1);
  const selected = Math.min(active, months.length - 1);
  const gradientId = useId().replaceAll(':', '');
  const max = niceCeiling(Math.max(...months.map((month) => month.cost)));
  const x = (index: number) => left + index * ((right - left) / (months.length - 1));
  const y = (value: number) => bottom - (value / max) * chartHeight;
  const points = months.map((month, index) => `${x(index)},${y(month.cost)}`).join(' ');
  const area = `M ${left} ${bottom} L ${points.replaceAll(' ', ' L ')} L ${right} ${bottom} Z`;
  const current = months[selected];

  return (
    <section className="app-panel min-w-0 p-5 sm:p-6" aria-labelledby="analytics-cost-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp aria-hidden="true" className="h-4 w-4 text-accent" />
            <h2 id="analytics-cost-title" className="text-base font-semibold text-content">
              Fuel spending
            </h2>
          </div>
          <p className="mt-1 text-xs text-content-muted">
            Track fuel expenses in PKR over the selected period.
          </p>
        </div>
        <ChartReadout
          label={fullMonth(current)}
          title="Amount spent"
          value={formatPkr(current.cost)}
        />
      </div>
      <div className="mt-5 min-w-0">
        <svg
          viewBox="0 0 640 260"
          className="block w-full"
          role="img"
          aria-label={`Monthly spending trend: ${months.map((month) => `${month.label}, ${formatPkr(month.cost)}`).join('; ')}`}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const position = ((event.clientX - bounds.left) / bounds.width) * width;
            setActive(
              Math.max(
                0,
                Math.min(
                  months.length - 1,
                  Math.round((position - left) / ((right - left) / (months.length - 1))),
                ),
              ),
            );
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1={left}
                x2={right}
                y1={y(max * fraction)}
                y2={y(max * fraction)}
                stroke="#e2e8f0"
                strokeDasharray={fraction ? '3 5' : undefined}
              />
              <text x="48" y={y(max * fraction) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">
                {compact.format(max * fraction)}
              </text>
            </g>
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <polyline
            className="spending-line"
            points={points}
            pathLength="1"
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1={x(selected)}
            x2={x(selected)}
            y1={top}
            y2={bottom}
            stroke="#bfdbfe"
            strokeDasharray="4 5"
          />
          {months.map((month, index) => (
            <circle
              key={month.key}
              cx={x(index)}
              cy={y(month.cost)}
              r={index === selected ? 6 : 3.5}
              fill="#2563eb"
              stroke="white"
              strokeWidth="2.5"
            />
          ))}
          {months.map(
            (month, index) =>
              (index % tickIndexes(months.length) === 0 || index === months.length - 1) && (
                <text
                  key={month.key}
                  x={x(index)}
                  y="250"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="11"
                >
                  {month.label}
                </text>
              ),
          )}
        </svg>
      </div>
      <MonthButtons months={months} selected={selected} onSelect={setActive} metric="cost" />
    </section>
  );
}

export function FuelQuantityChart({
  months,
  hasSupportedQuantity,
}: {
  months: MonthlyTotal[];
  hasSupportedQuantity: boolean;
}) {
  const [active, setActive] = useState(months.length - 1);
  const selected = Math.min(active, months.length - 1);
  const max = niceCeiling(Math.max(...months.map((month) => month.quantity)));
  const step = (right - left) / months.length;
  const barWidth = Math.min(34, step * 0.56);
  const y = (value: number) => bottom - (value / max) * chartHeight;
  const current = months[selected];

  return (
    <section className="app-panel min-w-0 p-5 sm:p-6" aria-labelledby="analytics-quantity-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Fuel aria-hidden="true" className="h-4 w-4 text-accent" />
            <h2 id="analytics-quantity-title" className="text-base font-semibold text-content">
              Fuel quantity over time
            </h2>
          </div>
          <p className="mt-1 text-xs text-content-muted">Petrol and diesel purchases in liters.</p>
        </div>
        {hasSupportedQuantity && (
          <ChartReadout
            label={fullMonth(current)}
            title="Fuel purchased"
            value={formatLiters(current.quantity)}
          />
        )}
      </div>
      {!hasSupportedQuantity ? (
        <div className="flex min-h-64 flex-col justify-center rounded-xl bg-slate-50/70 p-6 text-center">
          <p className="text-sm font-semibold text-content">
            No liter quantities in this selection
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-content-muted">
            Electric purchase records do not specify a kWh unit, so their quantities cannot be
            charted as energy.
          </p>
        </div>
      ) : (
        <>
          <svg
            viewBox="0 0 640 260"
            className="mt-5 block w-full"
            role="img"
            aria-label={`Monthly petrol and diesel quantity: ${months.map((month) => `${month.label}, ${formatLiters(month.quantity)}`).join('; ')}`}
            onPointerMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const position = ((event.clientX - bounds.left) / bounds.width) * width;
              setActive(
                Math.max(0, Math.min(months.length - 1, Math.floor((position - left) / step))),
              );
            }}
          >
            {[0, 0.5, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  x1={left}
                  x2={right}
                  y1={y(max * fraction)}
                  y2={y(max * fraction)}
                  stroke="#e2e8f0"
                  strokeDasharray={fraction ? '3 5' : undefined}
                />
                <text
                  x="48"
                  y={y(max * fraction) + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="11"
                >
                  {compact.format(max * fraction)}
                </text>
              </g>
            ))}
            {months.map((month, index) => (
              <g key={month.key}>
                <rect
                  className="analytics-bar-rise"
                  x={left + step * index + (step - barWidth) / 2}
                  y={y(month.quantity)}
                  width={barWidth}
                  height={Math.max(0, bottom - y(month.quantity))}
                  rx="5"
                  fill={index === selected ? '#2563eb' : '#93c5fd'}
                  style={{ animationDelay: `${index * 35}ms` }}
                />
                {(index % tickIndexes(months.length) === 0 || index === months.length - 1) && (
                  <text
                    x={left + step * (index + 0.5)}
                    y="250"
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="11"
                  >
                    {month.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
          <MonthButtons
            months={months}
            selected={selected}
            onSelect={setActive}
            metric="quantity"
          />
        </>
      )}
    </section>
  );
}

export function VehicleComparisonChart({ vehicles }: { vehicles: VehicleTotal[] }) {
  const max = Math.max(vehicles[0]?.cost ?? 0, 1);
  return (
    <section className="app-panel min-w-0 p-5 sm:p-6" aria-labelledby="analytics-comparison-title">
      <h2 id="analytics-comparison-title" className="text-base font-semibold text-content">
        Vehicle spending comparison
      </h2>
      <p className="mt-1 text-xs text-content-muted">
        Total purchase cost by vehicle in the selected period.
      </p>
      <div className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
        {vehicles.map((vehicle, index) => (
          <div
            key={vehicle.id}
            className="min-w-0"
            title={`${vehicle.name} · ${vehicle.registration} · ${vehicle.purchases} purchases · ${formatPkr(vehicle.cost)}`}
          >
            <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-3">
              <span className="truncate text-xs font-medium text-content" title={vehicle.name}>
                {vehicle.name}
              </span>
              <strong className="shrink-0 text-xs font-semibold tabular-nums text-content">
                {formatPkr(vehicle.cost)}
              </strong>
            </div>
            <div
              role="img"
              aria-label={`${vehicle.name}: ${formatPkr(vehicle.cost)}, ${vehicle.purchases} purchases`}
              className="h-2.5 overflow-hidden rounded-full bg-slate-100"
            >
              <div
                className={`analytics-bar-grow h-full rounded-full ${index === 0 ? 'bg-accent' : 'bg-blue-300'}`}
                style={{
                  width: `${(vehicle.cost / max) * 100}%`,
                  animationDelay: `${index * 45}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
