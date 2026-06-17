import { Router, Request, Response } from 'express';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import {
  applySplitScreen,
  generateSplitScreenPreview,
  SplitLayout,
} from '../services/splitScreen.js';
import { Logger } from '../lib/logger.js';

export const splitRouter = Router();

splitRouter.post(
  '/split/preview',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { primaryVideo, secondaryVideo, layout, position } = req.body;
      if (!primaryVideo || !secondaryVideo) {
        return res
          .status(400)
          .json({ success: false, error: 'primaryVideo ve secondaryVideo gerekli' });
      }
      const previewPath = await generateSplitScreenPreview(
        primaryVideo,
        secondaryVideo,
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
      const { primaryVideo, secondaryVideo, layout, position, outputPath } = req.body;
      if (!primaryVideo || !secondaryVideo) {
        return res
          .status(400)
          .json({ success: false, error: 'primaryVideo ve secondaryVideo gerekli' });
      }
      const outPath = outputPath || path.join(process.cwd(), 'uploads', `split_${Date.now()}.mp4`);
      await applySplitScreen(
        primaryVideo,
        secondaryVideo,
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
