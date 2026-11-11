import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notificationApi';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/common';
import StatusBadge from '@/components/common/StatusBadge';
import { NotificationContext } from '@/context/NotificationContext';
import type { Notification } from '@/types';
import { getErrorMessage } from '@/utils/errorHandler';
import {
  notificationHasAction,
  notificationIcon,
  notificationIconStyle,
  notificationTime,
} from '@/utils/notificationDisplay';

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
      if (page > 1 && response.data.notifications.length === 0) {
        setPage(page - 1);
        return;
      }
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

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (item: Notification, followAction = false) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!item.isRead) {
        const response = await markNotificationRead(item._id);
        onCountChange(response.data.unreadCount);
        setUnreadCount(response.data.unreadCount);
        setItems((current) =>
          current.map((entry) => (entry._id === item._id ? { ...entry, isRead: true } : entry)),
        );
      }
      if (followAction && item.actionPath && !item.isResolved) navigate(item.actionPath);
      else if (filter === 'unread') await load();
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'Could not mark this notification as read.'));
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    try {
      const response = await markAllNotificationsRead();
      onCountChange(response.data.unreadCount);
      setUnreadCount(response.data.unreadCount);
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      if (filter === 'unread') {
        setItems([]);
        setTotal(0);
        setPage(1);
      }
      toast.success('Notifications marked as read');
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'Could not mark notifications as read.'));
    } finally {
      setBusy(false);
    }
  };

  const changeFilter = (next: 'all' | 'unread') => {
    if (next !== filter) {
      setStatus('loading');
      setPage(1);
      setFilter(next);
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Critical fuel, route and crisis updates."
        action={
          status === 'ready' &&
          unreadCount > 0 && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void markAll()}>
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Notification filters"
          className="inline-flex rounded-control border border-line bg-surface p-1 shadow-card"
        >
          {(['all', 'unread'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => changeFilter(item)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${filter === item ? 'bg-accent-soft text-accent' : 'text-content-muted hover:bg-surface-muted hover:text-content'}`}
            >
              {item === 'all' ? 'All' : 'Unread'}
              {item === 'unread' && unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {status === 'ready' && (
          <p className="text-xs text-content-muted">
            {total} {filter === 'unread' ? 'unread' : 'total'} notification{total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {status === 'loading' ? (
        <NotificationSkeleton />
      ) : status === 'error' ? (
        <ErrorState message={error} retry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'No unread notifications' : "You're all caught up"}
          description={
            filter === 'unread'
              ? 'New critical updates will appear here when they arrive.'
              : 'Critical fuel, route and crisis updates will appear here.'
          }
        />
      ) : (
        <>
          <section className="app-panel min-w-0 overflow-hidden" aria-label="Notification activity">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
              <h2 className="text-sm font-semibold text-content">Activity</h2>
              <span className="text-xs text-content-muted">Most recent first</span>
            </div>
            <div className="divide-y divide-line-subtle">
              {items.map((item) => {
                const Icon = notificationIcon(item.type);
                const actionable = notificationHasAction(item);
                const unread = !item.isRead && !item.isResolved;
                const content = (
                  <>
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${notificationIconStyle(item)}`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`min-w-0 break-words text-sm ${unread ? 'font-bold text-content' : 'font-semibold text-slate-700'}`}
                        >
                          {item.title}
                        </span>
                        {unread && (
                          <span
                            aria-label="Unread"
                            className="h-2 w-2 shrink-0 rounded-full bg-accent"
                          />
                        )}
                        {item.isResolved && <StatusBadge>Resolved</StatusBadge>}
                      </span>
                      <span
                        className="mt-1 line-clamp-3 break-words text-sm leading-5 text-content-muted"
                        title={item.message}
                      >
                        {item.message}
                      </span>
                      <span className="mt-2 block text-xs text-content-subtle">
                        {notificationTime(item.lastTriggeredAt ?? item.createdAt)}
                      </span>
                    </span>
                    {actionable && (
                      <ChevronRight
                        aria-hidden="true"
                        className="mt-3 h-4 w-4 shrink-0 text-content-subtle transition-colors group-hover:text-accent"
                      />
                    )}
                  </>
                );
                return (
                  <article
                    key={item._id}
                    className={`flex min-w-0 items-stretch gap-1 transition-colors duration-150 ${unread ? 'bg-accent-soft/40' : 'bg-surface'}`}
                  >
                    {actionable ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void markRead(item, true)}
                        aria-label={`Open ${unread ? 'unread ' : ''}notification: ${item.title}`}
                        className="group flex min-w-0 flex-1 items-start gap-3 py-4 pl-4 pr-2 text-left transition-colors duration-150 hover:bg-accent-soft/70 focus-visible:bg-accent-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 sm:gap-4 sm:pl-5"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-start gap-3 py-4 pl-4 pr-2 text-left sm:gap-4 sm:pl-5">
                        {content}
                      </div>
                    )}
                    {!item.isRead && (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Mark ${item.title} as read`}
                        title="Mark as read"
                        onClick={() => void markRead(item)}
                        className="icon-button mr-2 mt-4 shrink-0 self-start sm:mr-4"
                      >
                        <Check aria-hidden="true" className="h-4 w-4" />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
          {total > 20 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-content-muted">
                Page {page} of {Math.ceil(total / 20)}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => {
                    setStatus('loading');
                    setPage((current) => current - 1);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page * 20 >= total}
                  onClick={() => {
                    setStatus('loading');
                    setPage((current) => current + 1);
                  }}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div role="status" aria-label="Loading notifications" className="app-panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <Skeleton className="h-4 w-28" />
      </div>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex gap-4 border-b border-line-subtle p-5 last:border-0">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
