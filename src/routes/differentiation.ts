import { Application, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { heavyLimiter, mediumLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';
import { sendToQueue, VIDEO_JOBS_QUEUE } from '../lib/rabbitmq.js';
import {
  createDifferentiationJob,
  runPhase1Background,
  differentiateVideoPhase2,
  isValidDurationMode,
  type SourceVideoMeta,
  type DurationMode,
} from '../lib/differentiate.js';
import { Logger } from '../lib/logger.js';
import { registerRoute } from '../lib/routeAlias.js';

/**
 * Differentiation routes for the opportunity funnel:
 * - POST /differentiate-video  (Phase 1: async, returns jobId immediately,
 *                              background work runs via setImmediate)
 * - GET  /differentiate-status/:jobId (Poll for Phase 1 progress)
 * - POST /approve-translation/:jobId  (Phase 2: scene prompts + status=pending)
 * - POST /differentiate-cancel/:jobId (Cancel awaiting_approval job)
 */
export function registerDifferentiationRoutes(app: Application): void {
  // Fırsat Hunisi: Video Özgünleştirme (S2.5) — 2 fazlı akış ───────────────
  // POST /differentiate-video
  // Body: { videoId, sourceMeta, targetLang, durationMode }
  //
  // ASYNC (2026-06-03): returns IMMEDIATELY with { jobId } after creating
  // the pending row. The slow work (transcript fetch + 2x Gemini calls)
  // runs in the background via setImmediate(). Frontend polls
  // GET /differentiate-status/:jobId every 3s.
  registerRoute(app, 'post', '/differentiate-video', heavyLimiter, requireAuth, async (req, res) => {
    const { videoId, sourceMeta, targetLang, durationMode } = req.body || {};
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
    }
    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ success: false, error: 'INVALID_VIDEO_ID' });
    }
    if (!targetLang || typeof targetLang !== 'string') {
      return res.status(400).json({ success: false, error: 'INVALID_LANG' });
    }
    if (!isValidDurationMode(durationMode)) {
      return res.status(400).json({ success: false, error: 'INVALID_DURATION_MODE' });
    }

    try {
      const meta: SourceVideoMeta =
        sourceMeta && typeof sourceMeta === 'object'
          ? sourceMeta
          : { videoId, title: '', channelTitle: '', thumbnail: '' };

      // Create the pending job (fast, ~50ms)
      const created = await createDifferentiationJob(
        videoId,
        meta,
        targetLang,
        durationMode as DurationMode,
        userId,
      );

      // Queue the job immediately to RabbitMQ
      await sendToQueue(VIDEO_JOBS_QUEUE, { jobId: created.jobId });

      logAudit({
        userId,
        action: 'differentiate.create',
        entityType: 'video_job',
        entityId: created.jobId,
        details: { sourceVideoId: videoId, targetLang, durationMode },
        req,
      });

      // Return immediately with the jobId so the client can poll
      return res.json({
        success: true,
        jobId: created.jobId,
      });
    } catch (err: any) {
      Logger.error('/differentiate-video failed', err);
      return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // GET /differentiate-status/:jobId
  // Polled by the frontend every 3s. Returns the current state of a
  // differentiation job so the modal can show progress, completion, or
  // error.
  registerRoute(app, 'get', '/differentiate-status/:jobId', requireAuth, async (req, res) => {
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
        `SELECT id, status, current_stage, progress_percent,
                source_video_meta, source_video_id,
                differentiation_target_lang, differentiation_duration_mode,
                transcript, transcript_cleaned, transcript_translated,
                master_prompt, production_notes, material_path
         FROM video_jobs WHERE id = ? AND user_id = ?`,
        [jobId, userId],
      );

      if (!job) {
        return res.json({ success: false, error: 'Job bulunamadı veya size ait değil' });
      }

      const response: any = {
        success: true,
        jobId: job.id,
        status: job.status,
        stage: job.current_stage,
        progress: job.progress_percent,
        targetLang: job.differentiation_target_lang,
        sourceVideoMeta: job.source_video_meta ? JSON.parse(job.source_video_meta) : null,
      };

      if (job.status === 'pending') {
        // Differentiation is complete, return the fields to auto-fill the form
        response.translatedText = job.transcript_translated || '';
        response.masterPrompt = job.master_prompt || '';
        response.productionNotes = job.production_notes || '';
        response.materialPath = job.material_path || '';
      } else if (job.status === 'failed') {
        // current_stage contains the error message in the form "Hata: ..."
        const stage = String(job.current_stage || '');
        response.error = stage.startsWith('Hata:') ? stage.substring(5).trim() : stage;
      }

      return res.json(response);
    } catch (err: any) {
      Logger.error('/differentiate-status failed', err);
      return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // POST /differentiate-cancel/:jobId
  // Onay bekleyen bir differentiation job'ını siler.
  registerRoute(app, 'post', '/differentiate-cancel/:jobId', mediumLimiter, requireAuth, async (req, res) => {
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
        [jobId, userId],
      );
      if (!job) {
        return res.json({ success: false, error: 'Job bulunamadı.' });
      }
      if (
        job.status !== 'awaiting_approval' &&
        job.status !== 'processing_phase1' &&
        job.status !== 'failed'
      ) {
        return res.json({
          success: false,
          error: 'Sadece onay bekleyen / işlenen joblar iptal edilebilir.',
        });
      }
      await db.run('DELETE FROM video_jobs WHERE id = ?', [jobId]);

      logAudit({
        userId,
        action: 'differentiate.cancel',
        entityType: 'video_job',
        entityId: jobId,
        req,
      });

      return res.json({ success: true });
    } catch (err: any) {
      Logger.error('/differentiate-cancel failed', err);
      return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });

  // POST /approve-translation/:jobId
  // Phase 2: User approves/edits the translation, and we generate the scene prompts
  registerRoute(app, 'post', '/approve-translation/:jobId', mediumLimiter, requireAuth, async (req, res) => {
    const jobId = parseInt(String(req.params.jobId), 10);
    const userId = req.session.userId;
    const { editedTranslation } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
    }
    if (!jobId || Number.isNaN(jobId)) {
      return res.status(400).json({ success: false, error: 'INVALID_JOB_ID' });
    }
    if (!editedTranslation || typeof editedTranslation !== 'string') {
      return res.status(400).json({ success: false, error: 'INVALID_TRANSLATION' });
    }

    try {
      const result = await differentiateVideoPhase2(jobId, userId, editedTranslation);

      logAudit({
        userId,
        action: 'differentiate.approve',
        entityType: 'video_job',
        entityId: jobId,
        details: { sceneCount: result.sceneCount },
        req,
      });

      return res.json({
        success: true,
        jobId: result.jobId,
      });
    } catch (err: any) {
      Logger.error('/approve-translation failed', err);
      return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
    }
  });
}
