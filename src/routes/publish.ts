import { Application, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';
import { sendToQueue } from '../lib/rabbitmq.js';
import { activePublishBrowsers } from '../publisher.js';
import { broadcastProgress } from '../lib/redis.js';
import { Logger } from '../lib/logger.js';
import { registerRoute } from '../lib/routeAlias.js';
import { DIRECTORIES } from '../constants.js';

const AUTH_DIR = path.join(process.cwd(), '.auth');

/**
 * Publish route: POST /publish/:id/:platform.
 *
 * S6 hardening: this route is now NON-BLOCKING. The HTTP request
 * returns immediately with `{ success: true, async: true, ... }` after
 * flipping the platform status to 'publishing'. The actual Playwright
 * upload (3-5 minutes) runs in the background via `setImmediate`.
 * Status flips to 'published' / 'failed' when the upload completes,
 * and an SSE event is broadcast so the frontend updates without
 * polling.
 *
 * Pre-checks (auth cookie, ownership, file exists) are still done
 * synchronously so we can fail fast.
 */
const VALID_PLATFORMS = ['youtube', 'tiktok', 'x', 'meta'] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

const AUTH_FILE_MAP: Record<Platform, string> = {
  youtube: path.join(AUTH_DIR, 'auth_youtube.json'),
  tiktok: path.join(AUTH_DIR, 'auth_tiktok.json'),
  x: path.join(AUTH_DIR, 'auth_x.json'),
  meta: path.join(AUTH_DIR, 'auth_meta.json'),
};

const STATUS_FIELD_MAP: Record<Platform, string> = {
  youtube: 'yt_status',
  tiktok: 'tt_status',
  x: 'x_status',
  meta: 'meta_status',
};

function isPlatform(value: string | string[] | undefined): value is Platform {
  return typeof value === 'string' && (VALID_PLATFORMS as readonly string[]).includes(value);
}

export function registerPublishRoutes(app: Application): void {
  registerRoute(app, 'post',
    '/publish/:id/:platform',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      const { id, platform } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      // Narrow types
      const jobId = typeof id === 'string' ? parseInt(id, 10) : NaN;
      if (isNaN(jobId) || jobId <= 0) {
        return res.json({ success: false, error: 'Gecersiz job ID.' });
      }
      if (!isPlatform(platform)) {
        return res.json({ success: false, error: 'Gecersiz platform.' });
      }

      try {
        // C1 — Pre-check: auth cookie dosyasi var mi?
        const authFile = AUTH_FILE_MAP[platform];
        const authPath = path.join(process.cwd(), authFile);
        const authExists = await fs.pathExists(authPath);
        if (!authExists) {
          return res.json({
            success: false,
            error: 'AUTH_MISSING',
            message: `Auth file '${authFile}' not found. Please connect your ${platform} account in Settings first.`,
            authFile,
          });
        }

        // Sahiplik kontrolu
        const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?', [
          jobId,
          userId,
        ]);
        if (!job || !job.final_filename) {
          return res.json({
            success: false,
            error: 'Video dosyasi bulunamadi veya bu job size ait degil.',
          });
        }

        const videoPath = path.join(process.cwd(), DIRECTORIES.VIDEO_OUTPUT, job.final_filename);
        const statusField = STATUS_FIELD_MAP[platform];

        // Set status to 'publishing' immediately so the UI reflects it.
        await db.run('UPDATE video_jobs SET ' + statusField + ' = ? WHERE id = ?', [
          'publishing',
          jobId,
        ]);

        // Audit the publish start (best-effort, never throws).
        logAudit({
          userId,
          action: ('publish.' + platform) as any,
          entityType: 'video_job',
          entityId: jobId,
          req,
        });

        // Return IMMEDIATELY — the actual Playwright upload runs in
        // the background so the HTTP connection is not held for 3-5
        // minutes.
        res.json({
          success: true,
          async: true,
          message: 'Yayın kuyruğa alındı, arka planda çalışıyor. Durum için sayfayı yenileyin.',
        });

        // Run the upload in the publish queue (concurrency=1 to prevent OOM).
        const payload = {
          jobId,
          platform,
          videoPath,
          statusField,
          jobData: {
            yt_title: job.yt_title,
            yt_desc: job.yt_desc,
            yt_tags: job.yt_tags,
            playlist_id: job.playlist_id,
            tt_desc: job.tt_desc,
            tt_tags: job.tt_tags,
            x_desc: job.x_desc,
            x_tags: job.x_tags,
            meta_desc: job.meta_desc,
            meta_tags: job.meta_tags,
          },
        };

        await sendToQueue('publish_jobs_queue', payload);
      } catch (err: any) {
        Logger.error('/publish pre-check failed', err);
        try {
          res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
        } catch {
          // response already sent
        }
      }
    },
  );

  registerRoute(app, 'post',
    '/cancel-publish/:id/:platform',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      const { id, platform } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const jobId = typeof id === 'string' ? parseInt(id, 10) : NaN;
      if (isNaN(jobId) || jobId <= 0) {
        return res.json({ success: false, error: 'Gecersiz job ID.' });
      }
      if (!isPlatform(platform)) {
        return res.json({ success: false, error: 'Gecersiz platform.' });
      }

      try {
        const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?', [
          jobId,
          userId,
        ]);
        if (!job) {
          return res.json({ success: false, error: 'Bu job bulunamadi veya size ait degil.' });
        }

        const statusField = STATUS_FIELD_MAP[platform];
        if (job[statusField] !== 'publishing') {
          return res.json({
            success: false,
            error: 'Bu paylasim aktif olarak calismiyor, iptal edilemez.',
          });
        }

        const key = `${jobId}-${platform}`;
        const browser = activePublishBrowsers.get(key);
        if (browser) {
          await browser.close().catch(() => {});
          activePublishBrowsers.delete(key);
          Logger.info(`Aktif ${platform} paylasimi iptal edildi, browser kapatildi: #${jobId}`);
        }

        await db.run('UPDATE video_jobs SET ' + statusField + ' = ? WHERE id = ?', [
          'cancelled',
          jobId,
        ]);

        try {
          await broadcastProgress(jobId, {
            jobId,
            currentStage: 'Yayın kullanıcı tarafından iptal edildi',
            progressPercent: 0,
            completedScenes: 0,
            totalScenes: 0,
            event: 'publish-complete',
            platform,
            success: false,
            stage: 'Yayın kullanıcı tarafından iptal edildi',
            percent: 0,
          });
        } catch (broadcastErr) {
          Logger.warn('cancel-publish broadcast failed', broadcastErr);
        }

        logAudit({
          userId,
          action: 'publish.cancel' as any,
          entityType: 'video_job',
          entityId: jobId,
          req,
        });

        res.json({ success: true, message: 'Yayinlama iptal edildi.' });
      } catch (err: any) {
        Logger.error('/cancel-publish failed', err);
        res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
      }
    },
  );

  registerRoute(app, 'post', '/publish-all/:id', mediumLimiter, requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
    }

    const jobId = typeof id === 'string' ? parseInt(id, 10) : NaN;
    if (isNaN(jobId) || jobId <= 0) {
      return res.json({ success: false, error: 'Gecersiz job ID.' });
    }

    try {
      const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?', [jobId, req.session.userId]);
      if (!job) {
        return res.json({ success: false, error: 'Job bulunamadi.' });
      }

      if (job.status !== 'completed') {
        return res.json({ success: false, error: 'Video henuz tamamlanmamis.' });
      }

      const videoPath = path.join(
        process.cwd(),
        DIRECTORIES.VIDEO_OUTPUT,
        job.final_filename || `final_${jobId}.mp4`,
      );
      if (!(await fs.pathExists(videoPath))) {
        return res.json({ success: false, error: 'Video dosyasi bulunamadi.' });
      }

      const platformStatus: Record<Platform, string> = {
        youtube: job.yt_status || 'pending',
        tiktok: job.tt_status || 'pending',
        x: job.x_status || 'pending',
        meta: job.meta_status || 'pending',
      };

      const targetPlatforms = VALID_PLATFORMS.filter((p) => {
        const raw = job.target_platforms;
        if (!raw) return true;
        try {
          const platforms = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return Array.isArray(platforms) && platforms.includes(p);
        } catch {
          return true;
        }
      });

      const queued: string[] = [];
      for (const platform of targetPlatforms) {
        if (platformStatus[platform] === 'published' || platformStatus[platform] === 'publishing') {
          continue;
        }

        const statusField = STATUS_FIELD_MAP[platform];
        await db.run(`UPDATE video_jobs SET ${statusField} = 'publishing' WHERE id = ?`, [jobId]);

        const payload = {
          jobId,
          platform,
          videoPath,
          statusField,
          jobData: {
            yt_title: job.yt_title,
            yt_desc: job.yt_desc,
            yt_tags: job.yt_tags,
            playlist_id: job.playlist_id,
            tt_desc: job.tt_desc,
            tt_tags: job.tt_tags,
            x_desc: job.x_desc,
            x_tags: job.x_tags,
            meta_desc: job.meta_desc,
            meta_tags: job.meta_tags,
          },
        };

        await sendToQueue('publish_jobs_queue', payload);
        queued.push(platform);
      }

      logAudit({
        userId,
        action: 'publish.youtube' as any,
        entityType: 'video_job',
        entityId: jobId,
        details: { type: 'publish_all', platforms: queued },
        req,
      });

      res.json({
        success: true,
        data: { queued, skipped: targetPlatforms.length - queued.length },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });
}
