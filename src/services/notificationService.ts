import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import { redisPub } from '../lib/redis.js';

export interface Notification {
  id: number;
  user_id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  job_id?: number;
  is_read: boolean;
  created_at: string;
}

export async function createNotification(
  userId: number,
  type: Notification['type'],
  title: string,
  message: string,
  jobId?: number,
): Promise<number> {
  try {
    const result = await db.run(
      'INSERT INTO notifications (user_id, type, title, message, job_id) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, message, jobId ?? null],
    );
    const notifId = result?.lastID ?? 0;
    Logger.info(`[NOTIFICATION] Created: user=${userId}, type=${type}, id=${notifId}`);
    void broadcastNotification(userId, {
      id: notifId, user_id: userId, type, title, message, job_id: jobId, is_read: false, created_at: new Date().toISOString(),
    });
    return notifId;
  } catch (err) {
    Logger.error('[NOTIFICATION] createNotification error:', err);
    return 0;
  }
}

export async function getNotifications(userId: number, limit = 20, type?: string): Promise<Notification[]> {
  try {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [userId];
    if (type && ['info', 'success', 'warning', 'error'].includes(type)) {
      query += ' AND type = ?';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return await db.all(query, params);
  } catch (err) {
    Logger.error('[NOTIFICATION] getNotifications error:', err);
    return [];
  }
}

export async function markAsRead(notificationId: number): Promise<void> {
  try {
    await db.run('UPDATE notifications SET is_read = TRUE WHERE id = ?', [notificationId]);
  } catch (err) {
    Logger.error('[NOTIFICATION] markAsRead error:', err);
  }
}

export async function markAllAsRead(userId: number): Promise<void> {
  try {
    await db.run('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
  } catch (err) {
    Logger.error('[NOTIFICATION] markAllAsRead error:', err);
  }
}

export async function getUnreadCount(userId: number): Promise<number> {
  try {
    const row = await db.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]);
    return row?.count != null ? Number(row.count) : 0;
  } catch (err) {
    Logger.error('[NOTIFICATION] getUnreadCount error:', err);
    return 0;
  }
}

export async function deleteNotification(notificationId: number, userId: number): Promise<boolean> {
  try {
    const result = await db.run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId],
    );
    return (result?.changes ?? 0) > 0;
  } catch (err) {
    Logger.error('[NOTIFICATION] deleteNotification error:', err);
    return false;
  }
}

export async function broadcastNotification(userId: number, notification: Notification): Promise<void> {
  try {
    await redisPub.publish(`notification:user:${userId}`, JSON.stringify(notification));
  } catch (err) {
    Logger.error('[NOTIFICATION] broadcastNotification error:', err);
  }
}
