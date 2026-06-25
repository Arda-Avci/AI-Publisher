import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, db } from './db.js';
import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from './services/notificationService.js';

describe('Notification Service', () => {
  let testUserId: number;
  let testJobId: number;

  beforeAll(async () => {
    await initDatabase();
    const result = await db.run(
      "INSERT INTO users (username, password) VALUES ('test_notif_user', ?)",
      ['dummy_hash'],
    );
    testUserId = result?.lastID ?? 0;
    const jobResult = await db.run(
      "INSERT INTO video_jobs (user_id, master_prompt, status) VALUES (?, 'notif test', 'pending')",
      [testUserId],
    );
    testJobId = jobResult?.lastID ?? 0;
    await db.run('DELETE FROM notifications WHERE user_id = ?', [testUserId]);
  });

  afterAll(async () => {
    if (testUserId > 0) {
      await db.run('DELETE FROM notifications WHERE user_id = ?', [testUserId]);
      await db.run('DELETE FROM video_jobs WHERE id = ?', [testJobId]);
      await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    }
  });

  it('createNotification should insert a notification', async () => {
    const id = await createNotification(testUserId, 'info', 'Test Title', 'Test message');
    expect(id).toBeGreaterThan(0);
    const row = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);
    expect(row).not.toBeNull();
    expect(row.title).toBe('Test Title');
    expect(row.is_read).toBe(false);
  });

  it('createNotification with jobId should set job_id', async () => {
    const id = await createNotification(testUserId, 'success', 'Job Done', 'Video ready', testJobId);
    expect(id).toBeGreaterThan(0);
    const row = await db.get('SELECT job_id FROM notifications WHERE id = ?', [id]);
    expect(row.job_id).toBe(testJobId);
  });

  it('getNotifications should return user notifications', async () => {
    const list = await getNotifications(testUserId);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].user_id).toBe(testUserId);
  });

  it('getNotifications with type filter should work', async () => {
    await createNotification(testUserId, 'warning', 'Warning Title', 'Warning msg');
    const warnings = await getNotifications(testUserId, 20, 'warning');
    expect(warnings.length).toBeGreaterThan(0);
    warnings.forEach((n) => expect(n.type).toBe('warning'));
  });

  it('getNotifications with limit should cap results', async () => {
    const limited = await getNotifications(testUserId, 1);
    expect(limited.length).toBeLessThanOrEqual(1);
  });

  it('getUnreadCount should return correct count', async () => {
    const count = await getUnreadCount(testUserId);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('markAsRead should set is_read = true', async () => {
    const id = await createNotification(testUserId, 'error', 'Read Test', 'Will be read');
    await markAsRead(id);
    const row = await db.get('SELECT is_read FROM notifications WHERE id = ?', [id]);
    expect(row.is_read).toBe(true);
  });

  it('markAllAsRead should mark all user notifications as read', async () => {
    await createNotification(testUserId, 'info', 'Bulk 1', 'Bulk msg');
    await createNotification(testUserId, 'info', 'Bulk 2', 'Bulk msg');
    await markAllAsRead(testUserId);
    const unread = await getUnreadCount(testUserId);
    expect(unread).toBe(0);
  });

  it('deleteNotification should remove notification with ownership check', async () => {
    const id = await createNotification(testUserId, 'info', 'Delete me', 'Will be deleted');
    const result = await deleteNotification(id, testUserId);
    expect(result).toBe(true);
    const row = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);
    expect(row).toBeUndefined();
  });

  it('deleteNotification should fail for wrong userId', async () => {
    const id = await createNotification(testUserId, 'info', 'Ownership', 'Check');
    const result = await deleteNotification(id, testUserId + 9999);
    expect(result).toBe(false);
  });

  it('getNotifications should return empty array for nonexistent user', async () => {
    const list = await getNotifications(999999);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(0);
  });
});
