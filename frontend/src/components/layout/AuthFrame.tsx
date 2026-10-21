import type { ReactNode } from 'react';
import { CarFront, Layers, Route, Wallet } from 'lucide-react';

export default function AuthFrame({
  title,
  text,
  children,
  compact = false,
}: {
  title: string;
  text: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <main className="grid min-h-screen min-w-0 bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section
        className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex xl:p-14"
        aria-label="SmartFuel overview"
      >
        <div className="pointer-events-none absolute -right-24 top-1/4 h-80 w-80 rounded-full border border-blue-400/10 bg-accent/5 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white shadow-xs">
            <Layers aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">SmartFuel</span>
            <span className="block text-xs text-slate-400">Fuel & Vehicle Management</span>
          </span>
        </div>
        <div className="relative max-w-lg">
          <p className="eyebrow text-blue-300">Your workspace</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Keep every journey and fuel purchase in view.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            Manage vehicles, record spending, and plan trips from one organized workspace.
          </p>
          <div className="mt-9 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-300">
            <p className="flex items-center gap-3">
              <CarFront aria-hidden="true" className="h-4 w-4 text-blue-300" />
              Keep vehicle details together
            </p>
            <p className="flex items-center gap-3">
              <Wallet aria-hidden="true" className="h-4 w-4 text-blue-300" />
              Track fuel spending by month
            </p>
            <p className="flex items-center gap-3">
              <Route aria-hidden="true" className="h-4 w-4 text-blue-300" />
              Plan and review journeys
            </p>
          </div>
        </div>
        <p className="relative text-xs text-slate-500">
          SmartFuel · Fuel Optimization & Resource Management
        </p>
      </section>
      <section className="flex min-w-0 flex-col items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className={`w-full ${compact ? 'max-w-md' : 'max-w-lg'}`}>
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white">
              <Layers aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-content">SmartFuel</span>
          </div>
          <div className="app-panel dashboard-enter min-w-0 p-6 sm:p-8">
            <div className={compact ? 'mb-6' : 'mb-7'}>
              <h2 className="page-title">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-content-muted">{text}</p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
