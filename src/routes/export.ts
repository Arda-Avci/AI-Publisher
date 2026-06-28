import { Application, Request, Response } from 'express';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { exportJob } from '../services/exportService.js';
import { registerRoute } from '../lib/routeAlias.js';

export function registerExportRoutes(app: Application): void {
  // Export job as ZIP (final video + scenes + FilmFreeway metadata)
  registerRoute(app, 'post', '/api/v1/export/:jobId', mediumLimiter, requireAuth, async (req: Request, res: Response) => {
    const rawId = req.params.jobId as string;
    if (!rawId) return res.status(400).json({ success: false, error: 'Gecersiz jobId' });
    const jobId = parseInt(rawId, 10);
    const userId = req.session.userId;
    if (isNaN(jobId)) {
      return res.status(400).json({ success: false, error: 'Gecersiz jobId' });
    }

    try {
      const job = await db.get('SELECT id, user_id FROM video_jobs WHERE id = ?', [jobId]);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job bulunamadi' });
      }

      const zipUrl = await exportJob(jobId);
      Logger.info(`Export completed for job #${jobId} (user #${userId}): ${zipUrl}`);

      res.json({
        success: true,
        url: zipUrl,
        filename: path.basename(zipUrl),
      });
    } catch (err: any) {
      Logger.error(`Export failed for job #${jobId}:`, err);
      res.status(500).json({ success: false, error: err.message || 'EXPORT_HATASI' });
    }
  });

  // Check export status
  registerRoute(app, 'get', '/api/v1/export/:jobId/status', requireAuth, async (req: Request, res: Response) => {
    const rawId = req.params.jobId as string;
    if (!rawId) return res.status(400).json({ success: false, error: 'Gecersiz jobId' });
    const jobId = parseInt(rawId, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({ success: false, error: 'Gecersiz jobId' });
    }

    try {
      const scenes = await db.all('SELECT id, status FROM video_scenes WHERE job_id = ?', [jobId]);
      const completedScenes = scenes.filter((s: any) => s.status === 'completed').length;
      const exportReady = scenes.length > 0 && completedScenes === scenes.length;

      res.json({
        success: true,
        totalScenes: scenes.length,
        completedScenes,
        exportReady,
      });
    } catch (err: any) {
      Logger.error(`Export status failed for job #${jobId}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
