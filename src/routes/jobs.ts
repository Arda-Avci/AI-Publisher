import { Application, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { db } from '../db.js';
import { checkQueue, broadcast } from '../queue.js';
import { requireAuth } from '../middleware/auth.js';
import { heavyLimiter, mediumLimiter } from '../middleware/rate-limit.js';
import { upload } from '../lib/upload.js';
import { logAudit } from '../lib/audit.js';

/**
 * Job lifecycle routes:
 * - POST /create-job          (multipart: material, creates a new pending job)
 * - POST /save-meta/:id       (updates YouTube/TikTok/X/Meta copy)
 * - POST /delete-job/:id      (removes job + cleans up disk files)
 * - POST /retry-job/:id       (resets a failed job back to pending)
 * - POST /start-job/:jobId    (manually enqueues a pending job)
 * - POST /cancel-job/:id      (S6: marks pending/processing job as cancelled)
 *
 * S6 hardening:
 *   - rate-limited (heavyLimiter / mediumLimiter) per route
 *   - audit log entries for create/delete/retry/start/cancel
 */
export function registerJobRoutes(app: Application): void {
  // Is Ekleme
  app.post('/create-job', heavyLimiter, requireAuth, upload.single('material'), async (req: any, res) => {
    const { master_prompt, production_notes, character_features, platforms, playlist_id, has_shorts, has_subtitles } = req.body;
    const material_path = req.file ? req.file.path : '';
    const userId = req.session.userId;

    const targetPlatforms = Array.isArray(platforms) ? platforms : (platforms ? [platforms] : []);
    const shortsVal = has_shorts === '1' ? 1 : 0;
    const subVal = has_subtitles === '1' ? 1 : 0;

    try {
      const insertResult: any = await db.run(
        `INSERT INTO video_jobs (
        user_id, master_prompt, production_notes, character_features, material_path, target_platforms, playlist_id, has_shorts, has_subtitles
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, master_prompt, production_notes, character_features, material_path, JSON.stringify(targetPlatforms), playlist_id || '', shortsVal, subVal]
      );

      const newJobId = Number(insertResult.lastID);

      // Audit the job creation (best-effort).
      logAudit({
        userId,
        action: 'job.create',
        entityType: 'video_job',
        entityId: newJobId,
        details: { platforms: targetPlatforms, has_shorts: shortsVal, has_subtitles: subVal },
        req
      });

      res.redirect('/');
      // Arka planda is kuyrugunu tetikle
      checkQueue();
    } catch (err: any) {
      console.error('[ERROR] /create-job failed:', err);
      res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // Meta veri guncelleme rotasi
  app.post('/save-meta/:id', mediumLimiter, requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;
    const { yt_title, yt_desc, yt_tags, tt_desc, tt_tags, x_desc, x_tags, meta_desc, meta_tags } = req.body;

    try {
      // Verify ownership before mutating.
      const job: any = await db.get(
        'SELECT id FROM video_jobs WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      if (!job) {
        return res.status(403).json({ success: false, error: 'Bu job\'a erisim yetkiniz yok' });
      }

      await db.run(
        `UPDATE video_jobs SET
        yt_title = ?, yt_desc = ?, yt_tags = ?,
        tt_desc = ?, tt_tags = ?,
        x_desc = ?, x_tags = ?,
        meta_desc = ?, meta_tags = ?
      WHERE id = ?`,
        [yt_title, yt_desc, yt_tags, tt_desc, tt_tags, x_desc, x_tags, meta_desc, meta_tags, id]
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[ERROR] /save-meta failed:', err);
      res.json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // Proje Silme Rotasi
  app.post('/delete-job/:id', mediumLimiter, requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;
    try {
      const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?', [id, userId]);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found or not owned by user' });
      }
      // Varsa nihai video dosyasini diskten sil
      if (job.final_filename) {
        const filePath = path.join(process.cwd(), 'videolar', job.final_filename);
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
        }
      }
      // Varsa shorts varyantini da sil (film_id.mp4 ve shorts_id.mp4)
      if (job.final_filename) {
        const shortsPath = path.join(process.cwd(), 'videolar', 'shorts_' + job.final_filename.replace(/^film_/, ''));
        if (await fs.pathExists(shortsPath)) await fs.remove(shortsPath);
      }
      // Varsa yuklenen baslangic materyalini diskten sil
      if (job.material_path) {
        const filePath = path.join(process.cwd(), job.material_path);
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
        }
      }
      await db.run('DELETE FROM video_jobs WHERE id = ?', [id]);

      logAudit({
        userId,
        action: 'job.delete',
        entityType: 'video_job',
        entityId: parseInt(String(id), 10),
        req
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/retry-job/:id', mediumLimiter, requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;
    try {
      // Sahiplik kontrolu
      const job: any = await db.get('SELECT id, status FROM video_jobs WHERE id = ? AND user_id = ?', [id, userId]);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found or not owned by user' });
      }
      await db.run(
        `UPDATE video_jobs SET
        status = 'pending',
        current_stage = 'Kuyrukta',
        progress_percent = 0,
        completed_scenes = 0
      WHERE id = ?`,
        [id]
      );

      logAudit({
        userId,
        action: 'job.retry',
        entityType: 'video_job',
        entityId: parseInt(String(id), 10),
        req
      });

      res.json({ success: true });
      checkQueue();
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /start-job/:jobId
  // Manuel kuyruga alma. Sadece status='pending' joblar baslatilabilir.
  app.post('/start-job/:jobId', mediumLimiter, requireAuth, async (req, res) => {
    const jobId = parseInt(String(req.params.jobId), 10);
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
    }
    if (!jobId || Number.isNaN(jobId)) {
      return res.status(400).json({ success: false, error: 'INVALID_JOB_ID' });
    }

    try {
      const job: any = await db.get(
        'SELECT id, status FROM video_jobs WHERE id = ? AND user_id = ?',
        [jobId, userId]
      );
      if (!job) {
        return res.json({ success: false, error: 'Job bulunamadi veya size ait degil.' });
      }
      if (job.status !== 'pending') {
        return res.json({
          success: false,
          error: "Job '" + job.status + "' durumunda, baslatilamaz. Sadece 'pending' durumundaki joblar baslatilabilir."
        });
      }

      logAudit({
        userId,
        action: 'job.start',
        entityType: 'video_job',
        entityId: jobId,
        req
      });

      setImmediate(() => { checkQueue(); });
      return res.json({ success: true, message: 'Proje kuyruga eklendi, uretim basliyor.' });
    } catch (err: any) {
      console.error('[ERROR] /start-job failed:', err);
      return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // ── S6: POST /cancel-job/:id ──────────────────────────────────────────────
  // Kullanici tarafindan manuel iptal. Sadece aktif job'lar
  // (pending / processing / processing_phase1 / awaiting_approval)
  // iptal edilebilir. Queue'daki checkQueue() 'pending' joblari
  // filtreledigi icin cancelled job otomatik olarak alinmaz; aktif
  // job'lar ise scene boundary'de kontrol edilip durdurulur.
  app.post('/cancel-job/:id', mediumLimiter, requireAuth, async (req, res) => {
    const jobId = parseInt(String(req.params.id), 10);
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
    }
    if (!jobId || Number.isNaN(jobId)) {
      return res.status(400).json({ success: false, error: 'INVALID_JOB_ID' });
    }

    try {
      const job: any = await db.get(
        'SELECT id, status FROM video_jobs WHERE id = ? AND user_id = ?',
        [jobId, userId]
      );
      if (!job) {
        return res.json({ success: false, error: 'Job bulunamadi veya size ait degil.' });
      }

      const cancellable = ['pending', 'processing', 'processing_phase1', 'awaiting_approval'];
      if (!cancellable.includes(job.status)) {
        return res.json({
          success: false,
          error: "Bu job '" + job.status + "' durumunda, iptal edilemez. Sadece aktif joblar iptal edilebilir."
        });
      }

      await db.run(
        `UPDATE video_jobs SET
          status = 'cancelled',
          current_stage = 'Kullanici tarafindan iptal edildi'
         WHERE id = ?`,
        [jobId]
      );

      logAudit({
        userId,
        action: 'job.cancel',
        entityType: 'video_job',
        entityId: jobId,
        details: { previousStatus: job.status },
        req
      });

      // S6: Broadcast SSE so the open progress stream updates
      // immediately (no need to wait for the next scene boundary
      // check or for the page to reload).
      try {
        broadcast(jobId, {
          stage: 'Iptal Edildi',
          status: 'cancelled',
          percent: 0
        });
      } catch (broadcastErr) {
        console.warn('[WARN] /cancel-job broadcast failed:', broadcastErr);
      }

      res.json({ success: true, message: 'Job iptal edildi.' });
    } catch (err: any) {
      console.error('[ERROR] /cancel-job failed:', err);
      res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });
}
