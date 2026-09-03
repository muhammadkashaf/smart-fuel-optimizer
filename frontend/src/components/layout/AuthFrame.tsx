import type { ReactNode } from 'react';
import { Layers, ShieldCheck, Gauge, Zap } from 'lucide-react';

export default function AuthFrame({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left Marketing Banner */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex border-r border-sidebar-border">
        {/* Subtle background glow */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Brand logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-lg font-bold tracking-tight text-white">Smart Fuel</span>
            <span className="text-xs text-slate-400 font-medium">Optimization & Resource Management</span>
          </div>
        </div>

        {/* Main pitch */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Smart Fuel Resource Management
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Complete visibility over your entire vehicle ecosystem.
          </h1>

          <p className="text-base leading-relaxed text-slate-400">
            Streamline fuel optimization, monitor consumption metrics, and empower your fleet managers with real-time operational insights.
          </p>

          <div className="space-y-3.5 pt-4">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-accent">
                <Gauge className="h-4 w-4" />
              </div>
              <span>Real-time fuel efficiency & consumption analytics</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-accent">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span>Role-based access for administrators & fleet managers</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-accent">
                <Zap className="h-4 w-4" />
              </div>
              <span>Instant vehicle status and automated reporting</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Smart Fuel System. All rights reserved.</p>
          <span className="font-mono">v2.4.0</span>
        </div>
      </section>

      {/* Right Form Card Container */}
      <section className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="app-panel p-7 sm:p-9 shadow-panel">
            <div className="mb-6">
              {/* Mobile Brand Logo */}
              <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-base font-bold text-slate-900">Smart Fuel</span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
              <p className="mt-1.5 text-sm text-content-muted">{text}</p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
