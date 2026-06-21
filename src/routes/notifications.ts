import { requireAuth } from '../middleware/auth.js';
import { sseLimiter } from '../middleware/rate-limit.js';
import { db } from '../db.js';
import { redisSub } from '../lib/redis.js';
import { Application, Request, Response } from 'express';
import { Logger } from '../lib/logger.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../services/notificationService.js';

function handleNotificationSseConnection(
  req: Request,
  res: Response,
  userId: number,
): void {
  const channel = `notification:user:${userId}`;

  const subscriber = redisSub.duplicate();
  subscriber.subscribe(channel).catch((err: Error) => {
    Logger.error(`SSE notification subscribe failed for user ${userId}`, err);
    if (!res.headersSent) res.status(500).end();
    return;
  });

  subscriber.on('message', (chan, message) => {
    if (chan === channel) {
      try {
        res.write(`data: ${message}\n\n`);
      } catch (err) {
        Logger.error(`SSE notification write error for user ${userId}`, err);
      }
    }
  });

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    subscriber.unsubscribe(channel).catch(() => {});
    subscriber.quit().catch(() => {});
    Logger.info(`SSE notification stream closed for user ${userId}`);
  });
}

function writeSseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

export function registerNotificationRoutes(app: Application): void {
  // Canlı bildirim tüneli (SSE)
  app.get('/api/v1/notifications/stream', sseLimiter, requireAuth, async (req: Request, res: Response) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Oturum açmanız gerekiyor' });
    }

    try {
      writeSseHeaders(res);
      res.write(': connected\n\n');

      Logger.info(`SSE notifications stream connected for user ${userId}`);
      handleNotificationSseConnection(req, res, userId);
    } catch (err: any) {
      Logger.error(`SSE notifications stream error for user ${userId}`, err);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
      }
    }
  });

  // Son bildirimleri listele
  app.get('/api/v1/notifications', requireAuth, async (req: Request, res: Response) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Oturum açmanız gerekiyor' });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const list = await getNotifications(userId, limit);
      const unreadCount = await getUnreadCount(userId);
      res.json({ success: true, notifications: list, unreadCount });
    } catch (err: any) {
      Logger.error(`Error fetching notifications for user ${userId}`, err);
      res.status(500).json({ success: false, error: err.message || 'database_error' });
    }
  });

  // Bildirimi okundu olarak işaretle
  app.post('/api/v1/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Oturum açmanız gerekiyor' });
    }

    try {
      const idParam = req.params.id;
      const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
      const notificationId = parseInt(idStr || '', 10);
      if (isNaN(notificationId)) {
        return res.status(400).json({ success: false, error: 'Geçersiz bildirim ID' });
      }

      // Sahiplik doğrulaması
      const notif = await db.get('SELECT user_id FROM notifications WHERE id = ?', [notificationId]);
      if (!notif) {
        return res.status(404).json({ success: false, error: 'Bildirim bulunamadı' });
      }
      if (notif.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok' });
      }

      await markAsRead(notificationId);
      res.json({ success: true });
    } catch (err: any) {
      Logger.error(`Error marking notification read for user ${userId}`, err);
      res.status(500).json({ success: false, error: err.message || 'database_error' });
    }
  });

  // Tümünü okundu olarak işaretle
  app.post('/api/v1/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Oturum açmanız gerekiyor' });
    }

    try {
      await markAllAsRead(userId);
      res.json({ success: true });
    } catch (err: any) {
      Logger.error(`Error marking all notifications read for user ${userId}`, err);
      res.status(500).json({ success: false, error: err.message || 'database_error' });
    }
  });
}
