import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

export const schedulePublishRouter = Router();

schedulePublishRouter.use(requireAuth);

schedulePublishRouter.get('/', async (req: Request, res: Response) => {
  try {
    const schedules = await db.all(
      `SELECT id, video_id, platforms, scheduled_time, status, error_message, created_at
       FROM publish_schedules
       WHERE user_id = ?
       ORDER BY scheduled_time ASC`,
      [req.session.userId],
    );

    const mapped = (schedules || []).map((s: any) => ({
      id: s.id,
      videoId: s.video_id,
      platforms: JSON.parse(s.platforms || '[]'),
      scheduledTime: s.scheduled_time,
      status: s.status,
      errorMessage: s.error_message,
      createdAt: s.created_at,
    }));

    res.json({ success: true, schedules: mapped });
  } catch (err: any) {
    Logger.error('GET /api/v1/schedule-publish failed', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

schedulePublishRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { videoId, platforms, scheduledTime } = req.body;

    if (!videoId || !platforms || !scheduledTime) {
      return res.status(400).json({ success: false, error: 'videoId, platforms ve scheduledTime zorunludur' });
    }

    const job = await db.get('SELECT id, user_id FROM video_jobs WHERE id = ?', [videoId]);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Video bulunamadı' });
    }
    if (job.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Bu video size ait değil' });
    }

    const id = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const platformsJson = JSON.stringify(platforms);

    await db.run(
      `INSERT INTO publish_schedules (id, user_id, video_id, platforms, scheduled_time, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'awaiting', datetime('now'))`,
      [id, req.session.userId, videoId, platformsJson, scheduledTime],
    );

    Logger.info(`Schedule created: ${id} video=${videoId} platforms=${platformsJson} time=${scheduledTime}`);

    res.status(201).json({
      success: true,
      schedule: {
        id,
        videoId,
        platforms,
        scheduledTime,
        status: 'awaiting',
      },
    });
  } catch (err: any) {
    Logger.error('POST /api/v1/schedule-publish failed', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

schedulePublishRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const schedule = await db.get(
      'SELECT id FROM publish_schedules WHERE id = ? AND user_id = ?',
      [id, req.session.userId],
    );

    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Plan bulunamadı' });
    }

    await db.run('DELETE FROM publish_schedules WHERE id = ?', [id]);

    Logger.info(`Schedule deleted: ${id} by user ${req.session.userId}`);

    res.json({ success: true });
  } catch (err: any) {
    Logger.error('DELETE /api/v1/schedule-publish/:id failed', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
