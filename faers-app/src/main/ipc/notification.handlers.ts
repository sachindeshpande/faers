/**
 * Notification IPC Handlers
 * Phase 3: Multi-User & Workflow Management
 *
 * Handles notification-related IPC requests from the renderer process.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse, Notification, NotificationListResponse } from '../../shared/types/ipc.types';
import { getDatabase } from '../database/connection';
import { getCurrentSessionId } from './auth.handlers';
import { AuthService } from '../services/authService';

/**
 * Get the current user ID from session
 */
function getCurrentUserId(): string | null {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return null;

  try {
    const db = getDatabase();
    const authService = new AuthService(db);
    const validation = authService.validateSession(sessionId);

    if (!validation.valid || !validation.user) return null;
    return validation.user.id;
  } catch {
    return null;
  }
}

/**
 * Check if notifications table exists
 */
function notificationsTableExists(): boolean {
  try {
    const db = getDatabase();
    const result = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'
    `).get();
    return !!result;
  } catch {
    return false;
  }
}

/**
 * Get notifications for the current user
 */
async function getNotifications(limit: number = 20): Promise<IPCResponse<NotificationListResponse>> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return {
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0 }
      };
    }

    if (!notificationsTableExists()) {
      return {
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0 }
      };
    }

    const db = getDatabase();

    // Get notifications for the user
    const notifications = db
      .prepare(`
        SELECT id, user_id as userId, type, title, message,
               entity_type as entityType, entity_id as entityId,
               is_read as isRead, created_at as createdAt, read_at as readAt
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(userId, limit) as Notification[];

    // Get total count
    const totalResult = db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?')
      .get(userId) as { count: number };

    // Get unread count
    const unreadResult = db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(userId) as { count: number };

    return {
      success: true,
      data: {
        notifications: notifications.map(n => ({
          ...n,
          isRead: Boolean(n.isRead)
        })),
        total: totalResult?.count || 0,
        unreadCount: unreadResult?.count || 0
      }
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return {
      success: true,
      data: { notifications: [], total: 0, unreadCount: 0 }
    };
  }
}

/**
 * Mark a notification as read
 */
async function markNotificationRead(id: number): Promise<IPCResponse<void>> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!notificationsTableExists()) {
      return { success: true };
    }

    const db = getDatabase();

    db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(id, userId);

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Get unread notification count for the current user
 */
async function getUnreadNotificationCount(): Promise<IPCResponse<number>> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: true, data: 0 };
    }

    if (!notificationsTableExists()) {
      return { success: true, data: 0 };
    }

    const db = getDatabase();

    const result = db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(userId) as { count: number } | undefined;

    return { success: true, data: result?.count || 0 };
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return { success: true, data: 0 };
  }
}

/**
 * Create a notification (internal use by other services)
 */
export function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string
): void {
  try {
    if (!notificationsTableExists()) {
      console.warn('Notifications table does not exist');
      return;
    }

    const db = getDatabase();

    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `).run(userId, type, title, message, entityType || null, entityId || null);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Register notification IPC handlers
 */
export function registerNotificationHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_GET, async (_event, limit?: number) => {
    return getNotifications(limit);
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_MARK_READ, async (_event, id: number) => {
    return markNotificationRead(id);
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_GET_UNREAD_COUNT, async () => {
    return getUnreadNotificationCount();
  });

  console.log('Notification handlers registered');
}
