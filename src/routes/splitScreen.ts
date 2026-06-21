import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { db } from '../db.js';
import {
  applySplitScreen,
  generateSplitScreenPreview,
  SplitLayout,
} from '../services/splitScreen.js';
import { Logger } from '../lib/logger.js';

export const splitRouter = Router();

async function resolveVideoPath(pathOrJobId: string | undefined, jobId?: number): Promise<string | null> {
  if (!pathOrJobId && !jobId) return null;
  if (pathOrJobId && (pathOrJobId.startsWith('/') || pathOrJobId.startsWith('C:'))) {
    return (await fs.pathExists(pathOrJobId)) ? pathOrJobId : null;
  }
  if (jobId) {
    const job: any = await db.get('SELECT final_filename FROM video_jobs WHERE id = ?', [jobId]);
    if (job?.final_filename) {
      const absPath = path.join(process.cwd(), 'videolar', job.final_filename);
      if (await fs.pathExists(absPath)) return absPath;
    }
  }
  return null;
}

splitRouter.post(
  '/split/preview',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { primaryVideo, secondaryVideo, layout, position, jobId } = req.body;
      const primaryPath = await resolveVideoPath(primaryVideo, jobId);
      const secondaryPath = await resolveVideoPath(secondaryVideo, jobId);
      if (!primaryPath || !secondaryPath) {
        return res
          .status(400)
          .json({ success: false, error: 'primaryVideo ve secondaryVideo gerekli (veya jobId)' });
      }
      const previewPath = await generateSplitScreenPreview(
        primaryPath,
        secondaryPath,
        (layout as SplitLayout) || '50/50',
        position || 'top',
      );
      res.json({
        success: true,
        data: {
          previewUrl: `/uploads/${path.basename(previewPath)}`,
          layout: layout || '50/50',
          position: position || 'top',
        },
      });
    } catch (err: any) {
      Logger.error('[SPLIT] Preview error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Split preview hatası' });
    }
  },
);

splitRouter.post(
  '/split/apply',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { primaryVideo, secondaryVideo, layout, position, outputPath, jobId } = req.body;
      const primaryPath = await resolveVideoPath(primaryVideo, jobId);
      const secondaryPath = await resolveVideoPath(secondaryVideo, jobId);
      if (!primaryPath || !secondaryPath) {
        return res
          .status(400)
          .json({ success: false, error: 'primaryVideo ve secondaryVideo gerekli (veya jobId)' });
      }
      const outPath = outputPath || path.join(process.cwd(), 'uploads', `split_${Date.now()}.mp4`);
      await applySplitScreen(
        primaryPath,
        secondaryPath,
        outPath,
        (layout as SplitLayout) || '50/50',
        position || 'top',
      );
      res.json({
        success: true,
        data: {
          outputPath: outPath,
          layout: layout || '50/50',
          position: position || 'top',
        },
      });
    } catch (err: any) {
      Logger.error('[SPLIT] Apply error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Split uygulama hatası' });
    }
  },
);
