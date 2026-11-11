import { Check } from 'lucide-react';

export default function TripRouteSteps({ active }: { active: 'details' | 'route' }) {
  return (
    <nav
      aria-label="Trip planning progress"
      className="app-panel flex items-center gap-3 px-4 py-3 text-xs font-semibold sm:gap-5 sm:px-5 sm:text-sm"
    >
      <span
        aria-current={active === 'details' ? 'step' : undefined}
        className={`inline-flex shrink-0 items-center gap-2 ${active === 'details' ? 'text-accent' : 'text-success'}`}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${active === 'details' ? 'bg-accent text-white' : 'bg-success-soft text-success'}`}
        >
          {active === 'details' ? '1' : <Check className="h-3.5 w-3.5" />}
        </span>
        Trip details
      </span>
      <span aria-hidden="true" className="h-px min-w-3 max-w-20 flex-1 bg-line" />
      <span
        aria-current={active === 'route' ? 'step' : undefined}
        className={`inline-flex shrink-0 items-center gap-2 ${active === 'route' ? 'text-accent' : 'text-content-muted'}`}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${active === 'route' ? 'bg-accent text-white' : 'border border-line bg-surface'}`}
        >
          2
        </span>
        Route planning
      </span>
    </nav>
  );
}
