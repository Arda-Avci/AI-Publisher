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
import { validateCreateJob, validateSaveMeta } from '../lib/validation.js';
import { CreditService } from '../services/creditService.js';
import { Logger } from '../lib/logger.js';
import { registerRoute } from '../lib/routeAlias.js';

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
  registerRoute(app, 'post', '/create-job',
    heavyLimiter,
    requireAuth,
    upload.fields([
      { name: 'material', maxCount: 1 },
      { name: 'background_music', maxCount: 1 },
    ]),
    async (req: any, res) => {
      const validation = validateCreateJob(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, errors: validation.errors });
      }

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
        tts_voice,
        production_template,
        trend_enabled,
        trend_context,
      } = req.body;

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let materialPath = '';
      if (files && files['material'] && files['material'][0]) {
        materialPath = `/uploads/${files['material'][0].filename}`;
      } else if (material_path_hidden) {
        materialPath = String(material_path_hidden);
      }

      let backgroundMusicPath = '';
      if (files && files['background_music'] && files['background_music'][0]) {
        backgroundMusicPath = `/uploads/${files['background_music'][0].filename}`;
      }

      const userId = req.session.userId;

      const targetPlatforms = Array.isArray(platforms) ? platforms : platforms ? [platforms] : [];
      const platformsJson = JSON.stringify(targetPlatforms);
      const hasShorts = has_shorts === '1' ? 1 : 0;
      const hasSubtitles = has_subtitles === '1' ? 1 : 0;
      const differentiationLayout = differentiation_layout === '1' ? 1 : 0;
      const differentiationDurationMode = differentiation_duration_mode || 'same';

      try {
        const finalTtsProvider = tts_provider || 'xtts';
        const finalTtsVoice =
          tts_voice || (finalTtsProvider === 'openai' ? 'alloy' : 'Claribel Dervla');
        const finalProductionTemplate = production_template || 'cinematic';

        const trendEnabled = trend_enabled === '1' ? 1 : 0;
        const insertResult: any = await db.run(
          `INSERT INTO video_jobs (
        user_id, master_prompt, production_notes, character_features, material_path, target_platforms, playlist_id, has_shorts, has_subtitles, transcript_translated, differentiation_layout, differentiation_duration_mode, tts_provider, tts_voice, production_template, background_music_path, trend_enabled, trend_context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            master_prompt,
            production_notes || '',
            character_features || '',
            materialPath,
            platformsJson,
            playlist_id || '',
            hasShorts,
            hasSubtitles,
            transcript_text || '',
            differentiationLayout,
            differentiationDurationMode,
            finalTtsProvider,
            finalTtsVoice,
            finalProductionTemplate,
            backgroundMusicPath,
            trendEnabled,
            trend_context || '',
          ],
        );

        const newJobId = Number(insertResult.lastID);

        // Audit the job creation (best-effort).
        logAudit({
          userId,
          action: 'job.create',
          entityType: 'video_job',
          entityId: newJobId,
          details: {
            platforms: targetPlatforms,
            has_shorts: hasShorts,
            has_subtitles: hasSubtitles,
            differentiation_layout: differentiationLayout,
            differentiation_duration_mode: differentiationDurationMode,
            background_music_path: backgroundMusicPath,
          },
          req,
        });

        res.redirect('/');
        // Arka planda is kuyrugunu tetikle
        await sendToQueue(VIDEO_JOBS_QUEUE, { jobId: newJobId });
      } catch (err: any) {
        Logger.error('/create-job failed', err);
        res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
      }
    },
  );

  // Meta veri guncelleme rotasi
  registerRoute(app, 'post', '/save-meta/:id', mediumLimiter, requireAuth, async (req, res) => {
    const validation = validateSaveMeta(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const { id } = req.params;
    const userId = req.session.userId;
    const { yt_title, yt_desc, yt_tags, tt_desc, tt_tags, x_desc, x_tags, meta_desc, meta_tags } =
      req.body;

    try {
      // Verify ownership before mutating.
      const job: any = await db.get('SELECT id FROM video_jobs WHERE id = ?', [id]);
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
        [yt_title, yt_desc, yt_tags, tt_desc, tt_tags, x_desc, x_tags, meta_desc, meta_tags, id],
      );
      res.json({ success: true });
    } catch (err: any) {
      Logger.error('/save-meta failed', err);
      res.json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // Proje Silme Rotasi
  registerRoute(app, 'post', '/delete-job/:id', mediumLimiter, requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;
    try {
      const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ?', [id]);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job bulunamadı.' });
      }
      // Safe file removal helper to prevent Path Traversal
      const safeRemove = async (targetPath: string) => {
        const resolvedPath = path.resolve(targetPath);
        const allowedDirs = [
          path.resolve(path.join(process.cwd(), 'uploads')),
          path.resolve(path.join(process.cwd(), 'videolar')),
        ];
        const isAllowed = allowedDirs.some((dir) => resolvedPath.startsWith(dir));
        if (isAllowed && (await fs.pathExists(resolvedPath))) {
          await fs.remove(resolvedPath);
        }
      };

      // Varsa nihai video dosyasini diskten sil
      if (job.final_filename) {
        await safeRemove(path.join(process.cwd(), 'videolar', job.final_filename));
      }
      // Varsa shorts varyantini da sil (film_id.mp4 ve shorts_id.mp4)
      if (job.final_filename) {
        await safeRemove(
          path.join(
            process.cwd(),
            'videolar',
            'shorts_' + job.final_filename.replace(/^film_/, ''),
          ),
        );
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
        req,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  registerRoute(app, 'post', '/retry-job/:id', mediumLimiter, requireAuth, async (req, res) => {
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
        [id],
      );

      logAudit({
        userId,
        action: 'job.retry',
        entityType: 'video_job',
        entityId: parseInt(String(id), 10),
        req,
      });

      res.json({ success: true });
      await sendToQueue(VIDEO_JOBS_QUEUE, { jobId: parseInt(String(id), 10) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /start-job/:jobId
  // Manuel kuyruga alma. Sadece status='pending' joblar baslatilabilir.
  registerRoute(app, 'post', '/start-job/:jobId', mediumLimiter, requireAuth, express.json(), async (req, res) => {
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
        'SELECT id, status, total_scenes, differentiation_layout FROM video_jobs WHERE id = ?',
        [jobId],
      );
      if (!job) {
        return res.json({ success: false, error: 'Job bulunamadı.' });
      }
      if (job.status !== 'pending') {
        return res.json({
          success: false,
          error:
            "Job '" +
            job.status +
            "' durumunda, baslatilamaz. Sadece 'pending' durumundaki joblar baslatilabilir.",
        });
      }

      // Kredi ön-kontrolü
      const userCredits = await CreditService.getUserCredits(userId);
      const totalScenes = job.total_scenes || 1;
      let estimatedRequiredCredits = totalScenes * 10 + 5;
      if (job.differentiation_layout === 1) {
        estimatedRequiredCredits += 15;
      }

      if (userCredits.credits < estimatedRequiredCredits) {
        return res.json({
          success: false,
          error: `Yetersiz Kredi! Bu işlem için en az ${estimatedRequiredCredits} kredi gerekiyor. Mevcut Krediniz: ${userCredits.credits}`,
        });
      }

      logAudit({
        userId,
        action: 'job.start',
        entityType: 'video_job',
        entityId: jobId,
        req,
      });

      if (req.body && req.body.master_prompt) {
        await db.run(
          'UPDATE video_jobs SET master_prompt = ?, production_notes = ?, transcript_translated = ? WHERE id = ?',
          [
            req.body.master_prompt,
            req.body.production_notes,
            req.body.transcript_translated,
            jobId,
          ],
        );
      }

      await db.run(
        "UPDATE video_jobs SET status = 'pending', current_stage = 'Kuyruğa Eklendi', progress_percent = 5 WHERE id = ?",
        [jobId],
      );

      await sendToQueue(VIDEO_JOBS_QUEUE, { jobId });
      return res.json({ success: true, message: 'Proje kuyruga eklendi, uretim basliyor.' });
    } catch (err: any) {
      Logger.error('/start-job failed', err);
      return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // ── S6: POST /cancel-job/:id ──────────────────────────────────────────────
  // Kullanici tarafindan manuel iptal. Sadece aktif job'lar
  // (pending / processing / processing_phase1 / awaiting_approval)
  // iptal edilebilir. Queue'daki checkQueue() 'pending' joblari
  // filtreledigi icin cancelled job otomatik olarak alinmaz; aktif
  // job'lar ise scene boundary'de kontrol edilip durdurulur.
  registerRoute(app, 'post', '/cancel-job/:id', mediumLimiter, requireAuth, async (req, res) => {
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
        [jobId, userId],
      );
      if (!job) {
        return res.json({ success: false, error: 'Job bulunamadi veya size ait degil.' });
      }

      const cancellable = ['pending', 'processing', 'processing_phase1', 'awaiting_approval'];
      if (!cancellable.includes(job.status)) {
        return res.json({
          success: false,
          error:
            "Bu job '" +
            job.status +
            "' durumunda, iptal edilemez. Sadece aktif joblar iptal edilebilir.",
        });
      }

      await db.run(
        `UPDATE video_jobs SET
          status = 'cancelled',
          current_stage = 'Kullanici tarafindan iptal edildi'
         WHERE id = ?`,
        [jobId],
      );

      logAudit({
        userId,
        action: 'job.cancel',
        entityType: 'video_job',
        entityId: jobId,
        details: { previousStatus: job.status },
        req,
      });

      // S6: Broadcast SSE so the open progress stream updates
      // immediately (no need to wait for the next scene boundary
      // check or for the page to reload).
      try {
        broadcast(jobId, {
          stage: 'Iptal Edildi',
          status: 'cancelled',
          percent: 0,
        });
      } catch (broadcastErr) {
        Logger.warn('/cancel-job broadcast failed', broadcastErr);
      }

      res.json({ success: true, message: 'Job iptal edildi.' });
    } catch (err: any) {
      Logger.error('/cancel-job failed', err);
      res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // POST /select-cover
  registerRoute(app, 'post', '/select-cover', mediumLimiter, requireAuth, async (req, res) => {
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

      await db.run('UPDATE video_jobs SET cover_image_path = ? WHERE id = ?', [
        selectedAbsPath,
        jobId,
      ]);

      logAudit({
        userId,
        action: 'job.select_cover',
        entityType: 'video_job',
        entityId: jobId,
        details: { coverIndex, selectedRelativePath },
        req,
      });

      res.json({ success: true, coverImagePath: selectedRelativePath });
    } catch (err: any) {
      Logger.error('/select-cover failed', err);
      res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // ── TIMELINE SCENE ROTASI: GET /api/v1/jobs/:jobId/scenes ──
  app.get('/api/v1/jobs/:jobId/scenes', requireAuth, async (req, res) => {
    const jobId = parseInt(req.params.jobId as string, 10);
    try {
      const scenes = await db.all(
        'SELECT * FROM video_scenes WHERE job_id = ? ORDER BY sort_order ASC',
        [jobId],
      );
      res.json({ success: true, scenes });
    } catch (err: any) {
      Logger.error('GET /api/v1/jobs/:jobId/scenes failed', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── TIMELINE SCENE ROTASI: POST /api/v1/jobs/:jobId/scenes (Toplu Güncelleme) ──
  app.post(
    '/api/v1/jobs/:jobId/scenes',
    mediumLimiter,
    requireAuth,
    express.json(),
    async (req, res) => {
      const jobId = parseInt(req.params.jobId as string, 10);
      const { scenes } = req.body;

      if (!Array.isArray(scenes)) {
        return res.status(400).json({ success: false, error: 'scenes bir dizi olmalıdır.' });
      }

      try {
        // Sahiplik kontrolü
        const jobExists = await db.get('SELECT id FROM video_jobs WHERE id = ?', [jobId]);
        if (!jobExists) {
          return res.status(404).json({ success: false, error: 'Job bulunamadı.' });
        }

        // Her sahneyi güncelle veya ekle
        for (const scene of scenes) {
          const {
            id,
            scene_number,
            video_prompt,
            speech_text,
            sfx_prompt,
            camera_motion,
            sort_order,
            music_volume,
            speaker,
          } = scene;
          const volume = typeof music_volume === 'number' ? music_volume : 0.2;
          const spk = speaker || null;
          if (id) {
            // Güncelleme
            await db.run(
              `UPDATE video_scenes SET
              scene_number = ?,
              video_prompt = ?,
              speech_text = ?,
              sfx_prompt = ?,
              camera_motion = ?,
              sort_order = ?,
              music_volume = ?,
              speaker = ?
             WHERE id = ? AND job_id = ?`,
              [
                scene_number,
                video_prompt,
                speech_text || '',
                sfx_prompt || '',
                camera_motion || 'none',
                sort_order,
                volume,
                spk,
                id,
                jobId,
              ],
            );
          } else {
            // Yeni ekleme
            await db.run(
              `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order, music_volume, speaker)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
              [
                jobId,
                scene_number,
                video_prompt,
                speech_text || '',
                sfx_prompt || '',
                camera_motion || 'none',
                sort_order,
                volume,
                spk,
              ],
            );
          }
        }

        // DB'deki sahne sayısı ile video_jobs tablosundaki total_scenes kolonunu eşitle
        const countRes = await db.get(
          'SELECT COUNT(*) as count FROM video_scenes WHERE job_id = ?',
          [jobId],
        );
        const actualCount = countRes?.count || 0;
        await db.run('UPDATE video_jobs SET total_scenes = ? WHERE id = ?', [actualCount, jobId]);

        res.json({ success: true, message: 'Timeline sahneleri kaydedildi.' });
      } catch (err: any) {
        Logger.error('POST /api/v1/jobs/:jobId/scenes failed', err);
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  // ── TIMELINE SCENE ROTASI: POST /api/v1/jobs/:jobId/scenes/add (Yeni Sahne Ekle) ──
  app.post('/api/v1/jobs/:jobId/scenes/add', mediumLimiter, requireAuth, async (req, res) => {
    const jobId = parseInt(req.params.jobId as string, 10);
    try {
      const countRes = await db.get('SELECT COUNT(*) as count FROM video_scenes WHERE job_id = ?', [
        jobId,
      ]);
      const nextNumber = (countRes?.count || 0) + 1;

      const result = await db.run(
        `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order)
         VALUES (?, ?, 'New cinematic scene description', '', '', 'none', 'pending', ?)`,
        [jobId, nextNumber, nextNumber],
      );

      await db.run('UPDATE video_jobs SET total_scenes = ? WHERE id = ?', [nextNumber, jobId]);

      res.json({ success: true, sceneId: result.lastID, sceneNumber: nextNumber });
    } catch (err: any) {
      Logger.error('POST /api/v1/jobs/:jobId/scenes/add failed', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── TIMELINE SCENE ROTASI: POST /api/v1/jobs/:jobId/scenes/:sceneId/delete (Sahne Sil) ──
  app.post(
    '/api/v1/jobs/:jobId/scenes/:sceneId/delete',
    mediumLimiter,
    requireAuth,
    async (req, res) => {
      const jobId = parseInt(req.params.jobId as string, 10);
      const sceneId = parseInt(req.params.sceneId as string, 10);
      try {
        const scene = await db.get('SELECT * FROM video_scenes WHERE id = ? AND job_id = ?', [
          sceneId,
          jobId,
        ]);
        if (!scene) {
          return res.status(404).json({ success: false, error: 'Sahne bulunamadı.' });
        }

        // Silinen sahnenin yerel video/resim dosyalarını da diskten temizle
        const safeRemove = async (filepath: string) => {
          if (filepath && !filepath.startsWith('http')) {
            const absPath = path.join(process.cwd(), filepath);
            if (await fs.pathExists(absPath)) {
              await fs.remove(absPath);
            }
          }
        };
        await safeRemove(scene.image_path);
        await safeRemove(scene.video_path);
        await safeRemove(scene.audio_path);

        // Veritabanından sil
        await db.run('DELETE FROM video_scenes WHERE id = ? AND job_id = ?', [sceneId, jobId]);

        // Kalan sahnelerin scene_number ve sort_order değerlerini yeniden numaralandır
        const remainingScenes = await db.all(
          'SELECT id FROM video_scenes WHERE job_id = ? ORDER BY sort_order ASC',
          [jobId],
        );
        for (let i = 0; i < remainingScenes.length; i++) {
          await db.run('UPDATE video_scenes SET scene_number = ?, sort_order = ? WHERE id = ?', [
            i + 1,
            i + 1,
            remainingScenes[i].id,
          ]);
        }

        await db.run('UPDATE video_jobs SET total_scenes = ? WHERE id = ?', [
          remainingScenes.length,
          jobId,
        ]);

        res.json({ success: true, message: 'Sahne silindi ve kalan sahneler yeniden sıralandı.' });
      } catch (err: any) {
        Logger.error('POST /api/v1/jobs/:jobId/scenes/:sceneId/delete failed', err);
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  // ── TIMELINE SCENE ROTASI: POST /api/v1/jobs/:jobId/scenes/:sceneId/regenerate (Tek Sahne Yenileme) ──
  app.post(
    '/api/v1/jobs/:jobId/scenes/:sceneId/regenerate',
    mediumLimiter,
    requireAuth,
    async (req, res) => {
      const jobId = parseInt(req.params.jobId as string, 10);
      const sceneId = parseInt(req.params.sceneId as string, 10);
      const userId = req.session.userId;
      try {
        const scene = await db.get('SELECT * FROM video_scenes WHERE id = ? AND job_id = ?', [
          sceneId,
          jobId,
        ]);
        if (!scene) {
          return res.status(404).json({ success: false, error: 'Sahne bulunamadı.' });
        }

        // Sahne durumunu pending yap, eski video/audio yollarını sıfırla ki yeniden üretebilelim
        // Disk dosyalarını da sil
        const safeRemove = async (filepath: string) => {
          if (filepath && !filepath.startsWith('http')) {
            const absPath = path.join(process.cwd(), filepath);
            if (await fs.pathExists(absPath)) {
              await fs.remove(absPath);
            }
          }
        };
        await safeRemove(scene.video_path);
        await safeRemove(scene.audio_path);

        await db.run(
          `UPDATE video_scenes SET
          status = 'pending',
          video_path = NULL,
          audio_path = NULL
         WHERE id = ?`,
          [sceneId],
        );

        // İşin durumunu da güncelle
        await db.run(
          `UPDATE video_jobs SET
          status = 'pending',
          current_stage = 'Kuyrukta (Tek Sahne Yenileniyor)',
          progress_percent = 5
         WHERE id = ?`,
          [jobId],
        );

        logAudit({
          userId,
          action: 'scene.regenerate',
          entityType: 'video_scene',
          entityId: sceneId,
          details: { jobId, sceneNumber: scene.scene_number },
          req,
        });

        // Kuyruğa işi tekrar at
        await sendToQueue(VIDEO_JOBS_QUEUE, { jobId });

        res.json({
          success: true,
          message: `Sahne #${scene.scene_number} yeniden üretim kuyruğuna eklendi.`,
        });
      } catch (err: any) {
        Logger.error('POST /api/v1/jobs/:jobId/scenes/:sceneId/regenerate failed', err);
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  // ── YENİ: AI Viralite Skoru Analiz Rotası ──
  app.post('/api/v1/jobs/:jobId/viral-score', requireAuth, async (req, res) => {
    const jobId = parseInt(String(req.params.jobId), 10);
    const userId = req.session.userId;
    try {
      const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Proje bulunamadı.' });
      }

      let hookFrameBase64 = '';
      if (job.final_filename) {
        const videoAbsPath = path.join(process.cwd(), 'videolar', job.final_filename);
        if (await fs.pathExists(videoAbsPath)) {
          const { extractReferenceFrameAtTime } = await import('../services/videoService.js');
          hookFrameBase64 = await extractReferenceFrameAtTime(videoAbsPath, 1.5);
        }
      }

      const { predictViralScore } = await import('../services/aiService.js');
      const analysis = await predictViralScore(job.cover_image_path || '', hookFrameBase64);

      await db.run('UPDATE video_jobs SET viral_score = ? WHERE id = ?', [analysis.score, jobId]);

      res.json({
        success: true,
        analysis,
      });
    } catch (err: any) {
      Logger.error('predictViralScore failed', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
