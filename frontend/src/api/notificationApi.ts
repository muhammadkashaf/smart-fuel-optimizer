import api from './axios';
import type { Notification } from '@/types';

type ListResponse = {
  notifications: Notification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
};

export const getNotifications = (status: 'all' | 'unread' = 'all', page = 1, limit = 20) =>
  api.get<ListResponse>('/notifications', { params: { status, page, limit } });
export const getNotificationUnreadCount = () => api.get<{ unreadCount: number }>('/notifications/unread-count');
export const markNotificationRead = (id: string) =>
  api.patch<{ notification: Notification; unreadCount: number }>(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch<{ unreadCount: number }>('/notifications/read-all');
