/**
 * Notification Store - Zustand state management for user notifications
 * Phase 3: Multi-User & Workflow Management
 */

import { create } from 'zustand';
import type { Notification } from '../../shared/types/ipc.types';

interface NotificationState {
  // Notification state
  notifications: Notification[];
  totalNotifications: number;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Polling state
  pollingEnabled: boolean;
  pollingInterval: number; // in milliseconds
  lastFetched: number | null;

  // Actions
  fetchNotifications: (limit?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<boolean>;
  markAllAsRead: () => Promise<void>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
  clearError: () => void;
}

let pollingTimer: ReturnType<typeof setInterval> | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  notifications: [],
  totalNotifications: 0,
  unreadCount: 0,
  isLoading: false,
  error: null,
  pollingEnabled: false,
  pollingInterval: 60000, // Default 1 minute
  lastFetched: null,

  // Actions
  fetchNotifications: async (limit = 20) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.getNotifications(limit);

      if (response.success && response.data) {
        set({
          notifications: response.data.notifications,
          totalNotifications: response.data.total,
          unreadCount: response.data.unreadCount,
          isLoading: false,
          lastFetched: Date.now()
        });
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch notifications'
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications'
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await window.electronAPI.getUnreadNotificationCount();

      if (response.success && response.data !== undefined) {
        set({ unreadCount: response.data });
      }
    } catch {
      // Silent failure for unread count
    }
  },

  markAsRead: async (id: number) => {
    try {
      const response = await window.electronAPI.markNotificationRead(id);

      if (response.success) {
        // Update local state
        const notifications = get().notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        );

        const unreadCount = Math.max(0, get().unreadCount - 1);

        set({ notifications, unreadCount });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  markAllAsRead: async () => {
    const { notifications } = get();
    const unreadNotifications = notifications.filter((n) => !n.isRead);

    // Mark all unread as read
    for (const notification of unreadNotifications) {
      if (notification.id) {
        await get().markAsRead(notification.id);
      }
    }
  },

  startPolling: (intervalMs?: number) => {
    const interval = intervalMs || get().pollingInterval;

    // Clear existing timer
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }

    set({ pollingEnabled: true, pollingInterval: interval });

    // Start polling
    pollingTimer = setInterval(() => {
      get().fetchUnreadCount();
    }, interval);

    // Initial fetch
    get().fetchUnreadCount();
  },

  stopPolling: () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    set({ pollingEnabled: false });
  },

  clearError: () => {
    set({ error: null });
  }
}));

// Selector hooks for cleaner component access
export const useNotifications = () =>
  useNotificationStore((state) => ({
    notifications: state.notifications,
    total: state.totalNotifications,
    unreadCount: state.unreadCount,
    isLoading: state.isLoading
  }));

export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);

export const useNotificationActions = () =>
  useNotificationStore((state) => ({
    fetchNotifications: state.fetchNotifications,
    fetchUnreadCount: state.fetchUnreadCount,
    markAsRead: state.markAsRead,
    markAllAsRead: state.markAllAsRead,
    startPolling: state.startPolling,
    stopPolling: state.stopPolling,
    clearError: state.clearError
  }));
