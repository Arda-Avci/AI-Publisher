import { Router, Request, Response } from 'express';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { generateTalkingHead, preloadModel } from '../services/museTalkService.js';
import { Logger } from '../lib/logger.js';

export const museTalkRouter = Router();

// In-memory job status store (keyed by client-generated jobId)
const jobStore = new Map<string, { status: string; outputPath?: string; error?: string }>();

museTalkRouter.post('/musetalk/generate', mediumLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { faceImagePath, audioPath, bbox, jobId } = req.body;
    if (!faceImagePath || !audioPath) {
      return res.status(400).json({ success: false, error: 'faceImagePath ve audioPath gerekli' });
    }

    const id = jobId || `mt_${Date.now()}`;
    jobStore.set(id, { status: 'processing' });

    // Fire and forget — client polls status
    generateTalkingHead({ faceImagePath, audioPath, bbox })
      .then((result) => {
        jobStore.set(id, { status: 'completed', outputPath: result.outputPath });
      })
      .catch((err: any) => {
        Logger.error('[MuseTalk] Generate error:', err);
        jobStore.set(id, { status: 'failed', error: err.message });
      });

    res.json({ success: true, jobId: id });
  } catch (err: any) {
    Logger.error('[MuseTalk] Route error:', err);
    res.status(500).json({ success: false, error: err?.message || 'MuseTalk hatası' });
  }
});

museTalkRouter.get('/musetalk/status/:jobId', mediumLimiter, requireAuth, async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const entry = jobStore.get(String(jobId));
  if (!entry) {
    return res.status(404).json({ success: false, error: 'İş bulunamadı' });
  }
  res.json({ success: true, ...entry });
});

museTalkRouter.post('/musetalk/preload', mediumLimiter, requireAuth, async (_req: Request, res: Response) => {
  try {
    const ok = await preloadModel();
    res.json({ success: ok, status: ok ? 'success' : 'failed' });
  } catch (err: any) {
    Logger.error('[MuseTalk] Preload error:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});
