import { Application, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { registerRoute } from '../lib/routeAlias.js';

export function registerAnalyticsRoutes(app: Application): void {
  registerRoute(app, 'get', '/api/v1/analytics/dashboard', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session!.userId;

      const [statusCounts, sceneStats, viralScoreResult, exportCountResult, creditResult, recentActivity] =
        await Promise.all([
          db.all('SELECT status, COUNT(*) as count FROM video_jobs WHERE user_id = ? GROUP BY status', [
            userId,
          ]),
          db.get(
            'SELECT COALESCE(SUM(total_scenes), 0) as total, COALESCE(SUM(completed_scenes), 0) as completed FROM video_jobs WHERE user_id = ?',
            [userId],
          ),
          db.get(
            'SELECT AVG(viral_score) as avg_score FROM video_jobs WHERE user_id = ? AND viral_score IS NOT NULL',
            [userId],
          ),
          db.get(
            "SELECT COUNT(*) as count FROM audit_log WHERE user_id = ? AND action = 'export_zip'",
            [userId],
          ),
          db.get(
            'SELECT COALESCE(SUM(ABS(amount)), 0) as total_used FROM credit_transactions WHERE user_id = ? AND amount < 0',
            [userId],
          ),
          db.all(
            'SELECT id, action, entity_type, entity_id, details, created_at FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [userId],
          ),
        ]);

      const jobsByStatus: Record<string, number> = {};
      for (const row of statusCounts as any[]) {
        jobsByStatus[row.status] = row.count;
      }

      res.json({
        success: true,
        data: {
          jobsByStatus,
          totalScenes: (sceneStats as any)?.total || 0,
          completedScenes: (sceneStats as any)?.completed || 0,
          avgViralScore: (viralScoreResult as any)?.avg_score ?? null,
          exportCount: (exportCountResult as any)?.count || 0,
          creditUsage: (creditResult as any)?.total_used || 0,
          recentActivity: (recentActivity as any[]) || [],
        },
      });
    } catch (err: any) {
      Logger.error('Analytics dashboard failed', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  registerRoute(app, 'get', '/api/v1/analytics/jobs/history', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session!.userId;

      const rows = await db.all(
        `SELECT
          DATE(created_at) as date,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
        FROM video_jobs
        WHERE user_id = ? AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC`,
        [userId],
      );

      const avgScenesResult = await db.get(
        'SELECT AVG(total_scenes) as avg_scenes FROM video_jobs WHERE user_id = ? AND total_scenes IS NOT NULL',
        [userId],
      );

      res.json({
        success: true,
        data: {
          daily: (rows as any[]) || [],
          avgScenesPerJob: (avgScenesResult as any)?.avg_scenes ?? null,
          estimatedDurationSeconds:
            (avgScenesResult as any)?.avg_scenes != null
              ? Math.round(Number((avgScenesResult as any).avg_scenes) * 120)
              : null,
        },
      });
    } catch (err: any) {
      Logger.error('Analytics jobs history failed', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  registerRoute(app, 'get', '/api/v1/analytics/platforms', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session!.userId;

      const row = await db.get(
        `SELECT
          COUNT(CASE WHEN yt_status = 'published' THEN 1 END) as youtube_published,
          COUNT(CASE WHEN yt_status = 'failed' THEN 1 END) as youtube_failed,
          COUNT(CASE WHEN tt_status = 'published' THEN 1 END) as tiktok_published,
          COUNT(CASE WHEN tt_status = 'failed' THEN 1 END) as tiktok_failed,
          COUNT(CASE WHEN x_status = 'published' THEN 1 END) as x_published,
          COUNT(CASE WHEN x_status = 'failed' THEN 1 END) as x_failed,
          COUNT(CASE WHEN meta_status = 'published' THEN 1 END) as meta_published,
          COUNT(CASE WHEN meta_status = 'failed' THEN 1 END) as meta_failed
        FROM video_jobs WHERE user_id = ?`,
        [userId],
      );

      res.json({
        success: true,
        data: {
          youtube: {
            published: (row as any)?.youtube_published || 0,
            failed: (row as any)?.youtube_failed || 0,
          },
          tiktok: {
            published: (row as any)?.tiktok_published || 0,
            failed: (row as any)?.tiktok_failed || 0,
          },
          x: {
            published: (row as any)?.x_published || 0,
            failed: (row as any)?.x_failed || 0,
          },
          meta: {
            published: (row as any)?.meta_published || 0,
            failed: (row as any)?.meta_failed || 0,
          },
        },
      });
    } catch (err: any) {
      Logger.error('Analytics platforms failed', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
