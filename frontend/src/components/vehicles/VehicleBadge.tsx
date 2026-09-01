import type { Vehicle } from '@/types';

const badgeStyles: Record<
  Vehicle['fuelType'],
  { container: string; dot: string }
> = {
  Petrol: {
    container: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  Diesel: {
    container: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },
  Electric: {
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
};

export default function VehicleBadge({ fuel }: { fuel: Vehicle['fuelType'] }) {
  const style = badgeStyles[fuel] || badgeStyles.Petrol;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${style.container}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {fuel}
    </span>
  );
}

