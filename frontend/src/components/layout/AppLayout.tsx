import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  CarFront,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
  Layers,
  Users,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { getNotificationUnreadCount } from '@/api/notificationApi';
import NotificationBell from '@/components/notifications/NotificationBell';
import { NotificationContext } from '@/context/NotificationContext';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const memberGroups = [
    {
      label: 'Overview',
      links: [
        { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
        { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
      ],
    },
    {
      label: 'Management',
      links: [
        { to: '/vehicles', label: 'My Vehicles', Icon: CarFront },
        { to: '/fuel-records', label: 'Fuel Records', Icon: Fuel },
        { to: '/fuel-budget', label: 'Fuel Budget', Icon: Wallet },
        { to: '/trips', label: 'Trips', Icon: CalendarDays },
      ],
    },
    {
      label: 'Optimization',
      links: [{ to: '/crisis-mode', label: 'Crisis Mode', Icon: ShieldCheck }],
    },
    { label: 'Account', links: [{ to: '/profile', label: 'Profile', Icon: UserRound }] },
  ];
  const adminGroups = [
    { label: 'Overview', links: [{ to: '/admin', label: 'Dashboard', Icon: LayoutDashboard }] },
    { label: 'Management', links: [
      { to: '/admin/users', label: 'Manage Users', Icon: Users },
      { to: '/admin/vehicles', label: 'Manage Vehicles', Icon: CarFront },
    ] },
    { label: 'Account', links: [{ to: '/profile', label: 'Profile', Icon: UserRound }] },
  ];
  const isAdmin = user?.role === 'Admin';
  const allLinks = (isAdmin ? adminGroups : memberGroups).flatMap((group) => group.links);
  const pageTitle =
    (allLinks.find((link) => pathname === link.to) ??
      allLinks.find((link) => pathname.startsWith(`${link.to}/`)))?.label ?? 'Notifications';
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  const refreshUnreadCount = useCallback(async () => {
    if (isAdmin) return;
    try {
      const response = await getNotificationUnreadCount();
      setUnreadCount(response.data.unreadCount);
    } catch {
      // Keep the last known count. A failed request is not a zero count.
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    void refreshUnreadCount();
    const onFocus = () => {
      void refreshUnreadCount();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('notifications:refresh', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications:refresh', onFocus);
    };
  }, [isAdmin, refreshUnreadCount]);

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
          end={to === '/admin'}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent-border ${
              isActive
                ? 'bg-blue-500/15 text-blue-200 ring-1 ring-inset ring-blue-400/20'
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
    <NotificationContext.Provider value={{ onCountChange: setUnreadCount }}>
      <div className="min-h-screen bg-canvas">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 shadow-xl transition-transform duration-200 ease-in-out md:translate-x-0 ${
            open ? 'visible translate-x-0' : 'invisible -translate-x-full md:visible'
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
              <span className="block text-base font-bold tracking-tight text-white">
                SmartFuel
              </span>
              <span className="text-[11px] font-medium tracking-wide text-slate-400">
                {isAdmin ? 'Admin workspace' : 'Fuel & Vehicle Management'}
              </span>
            </div>
          </div>

          {/* Navigation Group */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-5">
            <nav aria-label={isAdmin ? 'Admin navigation' : 'Member navigation'} className="space-y-5">
              {(isAdmin ? adminGroups : memberGroups).map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {group.label}
                  </p>
                  {renderNavLinks(group.links)}
                </div>
              ))}
            </nav>
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
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-slate-600 transition hover:bg-surface-muted hover:text-slate-900 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="ml-3 hidden min-w-0 text-sm font-semibold text-slate-700 sm:block md:ml-0">
              {pageTitle}
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-4">
              {!isAdmin && (
                <NotificationBell unreadCount={unreadCount} onCountChange={setUnreadCount} />
              )}
              <div className="flex items-center gap-3">
                <div className="min-w-0 max-w-28 text-right sm:max-w-none">
                  <p className="truncate text-sm font-semibold text-slate-900 leading-tight">
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
          <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </NotificationContext.Provider>
  );
}
