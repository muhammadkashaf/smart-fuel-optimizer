import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getNotifications, markNotificationRead } from '@/api/notificationApi';
import { Button, Skeleton } from '@/components/common';
import type { Notification } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';
import { notificationIcon, notificationTime } from '@/utils/notificationDisplay';

const hasInternalAction = (item: Notification) =>
  !item.isResolved && typeof item.actionPath === 'string' &&
  item.actionPath.startsWith('/') && !item.actionPath.startsWith('//') &&
  !item.actionPath.includes('\\');

export default function NotificationBell({ unreadCount, onCountChange }: {
  unreadCount: number | null;
  onCountChange: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [recent, setRecent] = useState<Notification[]>([]);
  const [busyId, setBusyId] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = async () => {
    setStatus('loading');
    try {
      const response = await getNotifications('all', 1, 5);
      setRecent(response.data.notifications);
      onCountChange(response.data.unreadCount);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => { document.removeEventListener('pointerdown', onOutside); document.removeEventListener('keydown', onEscape); };
  }, [open]);

  const openNotification = async (notification: Notification) => {
    if (!hasInternalAction(notification) || busyId) return;
    setBusyId(notification._id);
    try {
      if (!notification.isRead) {
        const response = await markNotificationRead(notification._id);
        onCountChange(response.data.unreadCount);
      }
      setOpen(false);
      navigate(notification.actionPath);
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'Could not open this notification.'));
    } finally { setBusyId(''); }
  };

  return <div ref={container} className="relative">
    <button type="button" aria-label={unreadCount === null ? 'Notifications, count unavailable' : `Notifications, ${unreadCount} unread`}
      aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((current) => !current); if (!open) void load(); }}
      className="relative grid h-9 w-9 place-items-center rounded-control text-slate-600 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <Bell className="h-5 w-5" />
      {unreadCount !== null && unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div role="dialog" aria-label="Recent notifications" className="fixed left-4 right-4 top-16 z-40 overflow-hidden rounded-card border border-line bg-surface shadow-overlay sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-88">
      <div className="border-b border-line px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">Notifications</h2><p className="text-xs text-content-muted">Recent updates</p></div>
      {status === 'loading' ? <div role="status" aria-label="Loading notifications" className="space-y-3 p-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        : status === 'error' ? <div className="p-4 text-center"><p role="alert" className="text-sm text-danger">Could not load notifications.</p><Button size="sm" variant="secondary" onClick={load} className="mt-3">Try again</Button></div>
          : recent.length === 0 ? <p className="px-4 py-8 text-center text-sm text-content-muted">You're all caught up.</p>
            : <div className="max-h-[min(24rem,60vh)] divide-y divide-line overflow-y-auto overflow-x-hidden">{recent.map((item) => {
              const Icon = notificationIcon(item.type);
              const actionable = hasInternalAction(item);
              const row = <>
                <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.isResolved ? 'bg-slate-100 text-slate-500' : item.severity === 'HIGH' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}><Icon aria-hidden="true" className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start gap-2"><p className="min-w-0 flex-1 break-words text-xs font-semibold text-slate-900">{item.title}</p>{!item.isRead && !item.isResolved && <span aria-label="Unread" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}</div>
                  <p className="mt-0.5 line-clamp-2 break-words text-xs text-content-muted">{item.message}</p>
                  <p className="mt-1.5 text-[11px] text-content-subtle">{notificationTime(item.lastTriggeredAt ?? item.createdAt)}{item.isResolved ? ' · Resolved' : ''}</p>
                </div>
                {actionable && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 self-end text-content-subtle" />}
              </>;
              const rowClass = `flex w-full min-w-0 gap-3 px-4 py-3 text-left ${!item.isRead && !item.isResolved ? 'bg-accent-soft/40' : ''}`;
              return actionable
                ? <button key={item._id} type="button" disabled={Boolean(busyId)} aria-label={`Open ${item.isRead ? '' : 'unread '}notification: ${item.title}`}
                  onClick={() => void openNotification(item)}
                  className={`${rowClass} transition-colors hover:bg-accent-soft focus-visible:bg-accent-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60`}>{row}</button>
                : <div key={item._id} className={rowClass}>{row}</div>;
            })}</div>}
      <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-xs font-semibold text-accent hover:bg-surface-muted">View all notifications</Link>
    </div>}
  </div>;
}
