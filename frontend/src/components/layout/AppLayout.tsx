import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CarFront, LayoutDashboard, LogOut, Menu, UserRound, X, Layers, Users, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'Admin';

  const leave = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const renderNavLinks = (links: { to: string; label: string; Icon: typeof LayoutDashboard }[]) => (
    <div className="space-y-1">
      {links.map(({ to, label, Icon }) => (
        <NavLink
          onClick={() => setOpen(false)}
          key={to}
          to={to}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? 'bg-accent text-white shadow-xs'
                : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-100'
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  );



  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 shadow-xl transition-transform duration-200 ease-in-out md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile close button */}
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Brand Header */}
        <div className="mb-6 flex items-center gap-3 px-2 pt-1">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-bold tracking-tight text-white">Fleetline</span>
            <span className="text-[11px] font-medium tracking-wide text-slate-400">
              Fleet Operations
            </span>
          </div>
        </div>

        {/* Navigation Group */}
        <div className="space-y-4">
          {!isAdmin && (
            <div>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400/90">
                Workspace
              </p>
              {renderNavLinks([
                { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
                { to: '/vehicles', label: 'My Vehicles', Icon: CarFront },
                { to: '/profile', label: 'Profile', Icon: UserRound },
              ])}
            </div>
          )}

          {isAdmin && (
            <div>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400/90">
                Admin Panel
              </p>
              {renderNavLinks([
                { to: '/admin/users', label: 'Manage Users', Icon: Users },
                { to: '/admin/vehicles', label: 'Manage Vehicles', Icon: ShieldAlert },
                { to: '/profile', label: 'Profile', Icon: UserRound },
              ])}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto border-t border-sidebar-border/80 pt-3">
          <button
            onClick={leave}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-col md:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
          <button
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-slate-600 transition hover:bg-surface-muted hover:text-slate-900 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </div>

            <div className="hidden h-5 w-px bg-line sm:block" />

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {user?.fullName}
                </p>
                <p className="text-xs text-content-muted leading-tight mt-0.5">{user?.role}</p>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white ring-2 ring-slate-100">
                {user?.fullName?.slice(0, 1).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

