import { AlertTriangle, Route, ShieldAlert } from 'lucide-react';
import type { Notification } from '@/types';

export const notificationIcon = (type: Notification['type']) => {
  if (type === 'BUDGET_EXCEEDED') return AlertTriangle;
  if (type === 'INEFFICIENT_TRIP') return Route;
  return ShieldAlert;
};

export const notificationTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0)
    return `Today, ${date.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}`;
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const notificationActionLabel = (type: Notification['type']) => {
  if (type === 'BUDGET_EXCEEDED') return 'View budget';
  if (type === 'INEFFICIENT_TRIP') return 'Review route';
  return 'View recommendation';
};

export const notificationHasAction = (item: Notification) =>
  !item.isResolved &&
  typeof item.actionPath === 'string' &&
  item.actionPath.startsWith('/') &&
  !item.actionPath.startsWith('//') &&
  !item.actionPath.includes('\\');

export const notificationIconStyle = (item: Notification) => {
  if (item.isResolved) return 'bg-slate-100 text-slate-500';
  if (item.type === 'BUDGET_EXCEEDED') return 'bg-warning-soft text-warning';
  if (item.type === 'INEFFICIENT_TRIP') return 'bg-accent-soft text-accent';
  return 'bg-slate-100 text-slate-700';
};
