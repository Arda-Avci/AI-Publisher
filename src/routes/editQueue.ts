import { Router } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

const router = Router();

router.post('/enqueue', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { jobId, command, targetScene } = req.body;
    if (!jobId || !command) return res.status(400).json({ error: 'jobId ve command gerekli' });

    const job: any = await db.get(
      'SELECT id FROM video_jobs WHERE id = ? AND user_id = ?',
      [jobId, req.session.userId]
    );
    if (!job) return res.status(404).json({ error: 'Job bulunamadı' });

    const { enqueueEdit } = await import('../services/editQueue.js');
    const editId = await enqueueEdit(req.session.userId!, jobId, command, targetScene);

    res.json({ success: true, editId, message: 'Edit kuyruğa eklendi' });
  } catch (err: any) {
    Logger.error('[EditQueue] Enqueue error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/apply/:editIdStr', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const editId = parseInt(req.params.editIdStr as string, 10);
    const jobId = Number(req.body.jobId);
    if (!jobId) return res.status(400).json({ error: 'jobId gerekli' });

    const edit: any = await db.get(
      'SELECT * FROM edit_queue WHERE id = ? AND user_id = ?',
      [editId, req.session.userId!]
    );
    if (!edit) return res.status(404).json({ error: 'Edit bulunamadı' });

    const scenesBaseDir = path.join(process.cwd(), 'videolar', `job_${jobId}`);
    const sceneDirs = await fs.readdir(scenesBaseDir).catch(() => [] as string[]);
    const scenes = sceneDirs
      .filter(d => d.startsWith('scene_'))
      .map(d => ({
        sceneNumber: parseInt(d.replace('scene_', ''), 10),
        videoPath: path.join(scenesBaseDir, d, 'video.mp4'),
        audioPath: path.join(scenesBaseDir, d, 'speech.mp3'),
      }))
      .filter(s => !isNaN(s.sceneNumber));

    if (scenes.length === 0) return res.status(400).json({ error: 'Sahne bulunamadı' });

    const outputDir = path.join(process.cwd(), 'videolar', `edit_apply_${editId}_${Date.now()}`);
    await fs.ensureDir(outputDir);

    const { applyEditQueueItem } = await import('../services/editQueue.js');
    const applied = await applyEditQueueItem(jobId, editId, scenes, outputDir);

    res.json({ success: applied, message: applied ? 'Edit uygulandı' : 'Edit uygulanamadı' });
  } catch (err: any) {
    Logger.error('[EditQueue] Apply error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/undo/:editIdStr', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const editId = parseInt(req.params.editIdStr as string, 10);
    const jobId = Number(req.body.jobId);

    const edit: any = await db.get(
      'SELECT * FROM edit_queue WHERE id = ? AND user_id = ?',
      [editId, req.session.userId!]
    );
    if (!edit) return res.status(404).json({ error: 'Edit bulunamadı' });

    const { undoEdit } = await import('../services/editQueue.js');
    const undone = await undoEdit(editId, jobId);

    res.json({ success: undone, message: undone ? 'Edit geri alındı' : 'Geri alınamadı' });
  } catch (err: any) {
    Logger.error('[EditQueue] Undo error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/:jobIdStr', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobIdStr as string, 10);

    const job: any = await db.get(
      'SELECT id FROM video_jobs WHERE id = ? AND user_id = ?',
      [jobId, req.session.userId!]
    );
    if (!job) return res.status(404).json({ error: 'Job bulunamadı' });

    const { getEditHistory } = await import('../services/editQueue.js');
    const history = await getEditHistory(jobId);

    res.json({ success: true, history });
  } catch (err: any) {
    Logger.error('[EditQueue] History error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
