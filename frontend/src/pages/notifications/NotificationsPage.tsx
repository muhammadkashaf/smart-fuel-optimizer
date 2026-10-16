import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/notificationApi';
import { Button, EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/common';
import { NotificationContext } from '@/context/NotificationContext';
import type { Notification } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';
import { notificationActionLabel, notificationIcon, notificationTime } from '@/utils/notificationDisplay';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { onCountChange } = useContext(NotificationContext);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await getNotifications(filter, page);
      if (page > 1 && response.data.notifications.length === 0) { setPage(page - 1); return; }
      setItems(response.data.notifications);
      setTotal(response.data.pagination.total);
      setUnreadCount(response.data.unreadCount);
      onCountChange(response.data.unreadCount);
      setStatus('ready');
    } catch (reason) {
      setError(getErrorMessage(reason, 'We could not load your notifications.'));
      setStatus('error');
    }
  }, [filter, page, onCountChange]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (item: Notification, followAction = false) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!item.isRead) {
        const response = await markNotificationRead(item._id);
        onCountChange(response.data.unreadCount);
        setUnreadCount(response.data.unreadCount);
        setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, isRead: true } : entry));
      }
      if (followAction && item.actionPath && !item.isResolved) navigate(item.actionPath);
      else if (filter === 'unread') await load();
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'Could not mark this notification as read.'));
    } finally { setBusy(false); }
  };

  const markAll = async () => {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    try {
      const response = await markAllNotificationsRead();
      onCountChange(response.data.unreadCount);
      setUnreadCount(response.data.unreadCount);
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      if (filter === 'unread') { setItems([]); setTotal(0); setPage(1); }
      toast.success('Notifications marked as read');
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'Could not mark notifications as read.'));
    } finally { setBusy(false); }
  };

  const changeFilter = (next: 'all' | 'unread') => { if (next !== filter) { setStatus('loading'); setPage(1); setFilter(next); } };

  return <div className="space-y-6">
    <PageHeader title="Notifications" subtitle="Critical fuel, route, and Crisis Mode updates." />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Notification status" className="inline-flex rounded-control border border-line bg-surface p-1">
        {(['all', 'unread'] as const).map((item) => <button key={item} role="tab" type="button" aria-selected={filter === item} onClick={() => changeFilter(item)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${filter === item ? 'bg-accent text-white' : 'text-content-muted hover:bg-surface-muted hover:text-content'}`}>{item === 'all' ? 'All' : 'Unread'}</button>)}
      </div>
      {status === 'ready' && unreadCount > 0 && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void markAll()}><CheckCheck className="h-4 w-4" />Mark all as read</Button>}
    </div>

    {status === 'loading' ? <PageSkeleton /> : status === 'error' ? <ErrorState message={error} retry={load} />
      : items.length === 0 ? <EmptyState icon={Bell} title={filter === 'unread' ? 'No unread notifications.' : "You're all caught up."} description={filter === 'unread' ? 'New critical updates will appear here when they arrive.' : 'Critical fuel, route, and Crisis Mode updates will appear here.'} />
        : <>
          <div className="app-panel divide-y divide-line overflow-hidden">
            {items.map((item) => {
              const Icon = notificationIcon(item.type);
              const activeUnread = !item.isRead && !item.isResolved;
              return <article key={item._id} className={`flex min-w-0 gap-3 p-4 sm:gap-4 sm:p-5 ${activeUnread ? 'bg-accent-soft/40' : ''}`}>
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${item.isResolved ? 'bg-slate-100 text-slate-500' : item.severity === 'HIGH' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-sm font-semibold text-slate-900">{item.title}</h2>{activeUnread && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-accent" />}{item.isResolved && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Resolved</span>}</div>
                  <p className="mt-1 break-words text-sm leading-6 text-content-muted">{item.message}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-content-subtle">{notificationTime(item.lastTriggeredAt ?? item.createdAt)}</span>
                    <div className="flex flex-wrap gap-2">
                      {!item.isRead && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void markRead(item)}><Check className="h-3.5 w-3.5" />Mark read</Button>}
                      {item.actionPath && !item.isResolved && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void markRead(item, true)}>{notificationActionLabel(item.type)}<ChevronRight className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                </div>
              </article>;
            })}
          </div>
          {total > 20 && <div className="flex items-center justify-between gap-3"><p className="text-xs text-content-muted">Page {page} of {Math.ceil(total / 20)}</p><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page === 1} onClick={() => { setStatus('loading'); setPage((current) => current - 1); }}><ChevronLeft className="h-4 w-4" />Previous</Button><Button size="sm" variant="secondary" disabled={page * 20 >= total} onClick={() => { setStatus('loading'); setPage((current) => current + 1); }}>Next<ChevronRight className="h-4 w-4" /></Button></div></div>}
        </>}
  </div>;
}
