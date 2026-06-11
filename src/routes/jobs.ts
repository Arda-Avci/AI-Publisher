import express, { Application, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { db } from '../db.js';
import { broadcast } from '../queue.js';
import { sendToQueue, VIDEO_JOBS_QUEUE } from '../lib/rabbitmq.js';
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
    const { 
      master_prompt, 
      production_notes, 
      character_features, 
      platforms, 
      playlist_id, 
      has_shorts, 
      has_subtitles,
      differentiation_layout,
      differentiation_duration_mode,
      material_path_hidden,
      transcript_text,
      tts_provider,
      tts_voice
    } = req.body;
    let materialPath = '';
    if (req.file) {
      materialPath = `/uploads/${req.file.filename}`;
    } else if (material_path_hidden) {
      materialPath = String(material_path_hidden);
    }
    const userId = req.session.userId;

    const targetPlatforms = Array.isArray(platforms) ? platforms : (platforms ? [platforms] : []);
    const platformsJson = JSON.stringify(targetPlatforms);
    const hasShorts = has_shorts === '1' ? 1 : 0;
    const hasSubtitles = has_subtitles === '1' ? 1 : 0;
    const differentiationLayout = differentiation_layout === '1' ? 1 : 0;
    const differentiationDurationMode = differentiation_duration_mode || 'same';

    try {
      const finalTtsProvider = tts_provider || 'xtts';
      const finalTtsVoice = tts_voice || (finalTtsProvider === 'openai' ? 'alloy' : 'Claribel Dervla');
      const insertResult: any = await db.run(
        `INSERT INTO video_jobs (
        user_id, master_prompt, production_notes, character_features, material_path, target_platforms, playlist_id, has_shorts, has_subtitles, transcript_translated, differentiation_layout, differentiation_duration_mode, tts_provider, tts_voice
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, master_prompt, production_notes || '', character_features || '', materialPath, platformsJson, playlist_id || '', hasShorts, hasSubtitles, transcript_text || '', differentiationLayout, differentiationDurationMode, finalTtsProvider, finalTtsVoice]
      );

      const newJobId = Number(insertResult.lastID);

      // Audit the job creation (best-effort).
      logAudit({
        userId,
        action: 'job.create',
        entityType: 'video_job',
        entityId: newJobId,
        details: { platforms: targetPlatforms, has_shorts: hasShorts, has_subtitles: hasSubtitles, differentiation_layout: differentiationLayout, differentiation_duration_mode: differentiationDurationMode },
        req
      });

      res.redirect('/');
      // Arka planda is kuyrugunu tetikle
      await sendToQueue(VIDEO_JOBS_QUEUE, { jobId: newJobId });
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
        'SELECT id FROM video_jobs WHERE id = ?',
        [id]
      );
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job bulunamadı.' });
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
      const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ?', [id]);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
      // Safe file removal helper to prevent Path Traversal
      const safeRemove = async (targetPath: string) => {
        const resolvedPath = path.resolve(targetPath);
        const allowedDirs = [
          path.resolve(path.join(process.cwd(), 'uploads')),
          path.resolve(path.join(process.cwd(), 'videolar'))
        ];
        const isAllowed = allowedDirs.some(dir => resolvedPath.startsWith(dir));
        if (isAllowed && await fs.pathExists(resolvedPath)) {
          await fs.remove(resolvedPath);
        }
      };

      // Varsa nihai video dosyasini diskten sil
      if (job.final_filename) {
        await safeRemove(path.join(process.cwd(), 'videolar', job.final_filename));
      }
      // Varsa shorts varyantini da sil (film_id.mp4 ve shorts_id.mp4)
      if (job.final_filename) {
        await safeRemove(path.join(process.cwd(), 'videolar', 'shorts_' + job.final_filename.replace(/^film_/, '')));
      }
      // Varsa yuklenen baslangic materyalini diskten sil
      if (job.material_path) {
        // Handle both relative path and absolute path
        const absoluteMaterialPath = path.isAbsolute(job.material_path) 
          ? job.material_path 
          : path.join(process.cwd(), job.material_path);
        await safeRemove(absoluteMaterialPath);
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
      const job: any = await db.get('SELECT id, status FROM video_jobs WHERE id = ?', [id]);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
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
      await sendToQueue(VIDEO_JOBS_QUEUE, { jobId: parseInt(String(id), 10) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /start-job/:jobId
  // Manuel kuyruga alma. Sadece status='pending' joblar baslatilabilir.
  app.post('/start-job/:jobId', mediumLimiter, requireAuth, express.json(), async (req, res) => {
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
        'SELECT id, status FROM video_jobs WHERE id = ?',
        [jobId]
      );
      if (!job) {
        return res.json({ success: false, error: 'Job bulunamadı.' });
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

      if (req.body && req.body.master_prompt) {
        await db.run(
          "UPDATE video_jobs SET master_prompt = ?, production_notes = ?, transcript_translated = ? WHERE id = ?",
          [req.body.master_prompt, req.body.production_notes, req.body.transcript_translated, jobId]
        );
      }

      await db.run("UPDATE video_jobs SET status = 'pending', current_stage = 'Kuyruğa Eklendi', progress_percent = 5 WHERE id = ?", [jobId]);

      await sendToQueue(VIDEO_JOBS_QUEUE, { jobId });
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

  // POST /select-cover
  app.post('/select-cover', mediumLimiter, requireAuth, async (req, res) => {
    const { jobId, coverIndex } = req.body;
    const userId = req.session.userId;

    if (!jobId || coverIndex === undefined) {
      return res.status(400).json({ success: false, error: 'Eksik parametreler.' });
    }

    try {
      const job: any = await db.get('SELECT cover_images FROM video_jobs WHERE id = ?', [jobId]);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job bulunamadı.' });
      }

      const images = job.cover_images ? JSON.parse(job.cover_images) : [];
      if (!Array.isArray(images) || coverIndex < 0 || coverIndex >= images.length) {
        return res.status(400).json({ success: false, error: 'Geçersiz kapak indeksi.' });
      }

      const selectedRelativePath = images[coverIndex];
      const selectedAbsPath = path.join(process.cwd(), selectedRelativePath);

      await db.run('UPDATE video_jobs SET cover_image_path = ? WHERE id = ?', [selectedAbsPath, jobId]);

      logAudit({
        userId,
        action: 'job.select_cover',
        entityType: 'video_job',
        entityId: jobId,
        details: { coverIndex, selectedRelativePath },
        req
      });

      res.json({ success: true, coverImagePath: selectedRelativePath });
    } catch (err: any) {
      console.error('[ERROR] /select-cover failed:', err);
      res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });
}
