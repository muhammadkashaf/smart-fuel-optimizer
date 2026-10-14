import { Check } from 'lucide-react';

export default function TripRouteSteps({ active }: { active: 'details' | 'route' }) {
  return (
    <nav aria-label="Trip planning progress" className="flex items-center gap-3 text-xs font-medium sm:text-sm">
      <span aria-current={active === 'details' ? 'step' : undefined} className={`inline-flex items-center gap-2 ${active === 'details' ? 'text-accent' : 'text-success'}`}>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${active === 'details' ? 'bg-accent text-white' : 'bg-success-soft text-success'}`}>
          {active === 'details' ? '1' : <Check className="h-3.5 w-3.5" />}
        </span>Trip details
      </span>
      <span aria-hidden="true" className="h-px w-6 bg-line sm:w-12" />
      <span aria-current={active === 'route' ? 'step' : undefined} className={`inline-flex items-center gap-2 ${active === 'route' ? 'text-accent' : 'text-content-muted'}`}>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${active === 'route' ? 'bg-accent text-white' : 'border border-line bg-surface'}`}>2</span>Route planning
      </span>
    </nav>
  );
}
