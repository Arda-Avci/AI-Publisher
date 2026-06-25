import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import {
  generateFullStoryboard,
  getStoryboardImages,
  deleteStoryboardImages,
  type StoryboardRequest,
} from './storyboardGenerator.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';

export const storyboardRouter = Router();

// POST /api/v1/storyboard/generate — Storyboard olustur
storyboardRouter.post(
  '/storyboard/generate',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const body = req.body as StoryboardRequest;

      if (!body.scriptId) {
        res.status(400).json({ error: 'scriptId zorunludur.' });
        return;
      }

      if (!body.scenes || !Array.isArray(body.scenes) || body.scenes.length === 0) {
        res.status(400).json({ error: 'scenes dizisi zorunludur ve en az bir sahne icermelidir.' });
        return;
      }

      // Script'in bu kullaniciya ait oldugunu dogrula
      const script = await db.get(
        'SELECT id FROM scripts WHERE id = ? AND user_id = ?',
        [body.scriptId, userId],
      );
      if (!script) {
        res.status(404).json({ error: 'Script bulunamadi veya bu kullaniciya ait degil.' });
        return;
      }

      const result = await generateFullStoryboard({
        scriptId: body.scriptId,
        userId,
        scenes: body.scenes,
        artStyle: body.artStyle,
        resolution: body.resolution,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      Logger.error('[StoryboardRoutes] Generate error:', error);
      res.status(500).json({ error: error.message || 'Storyboard olusturulamadi.' });
    }
  },
);

// GET /api/v1/storyboard/:scriptId — Olusan storyboard goruntulerini getir
storyboardRouter.get(
  '/storyboard/:scriptId',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const scriptId = Number(req.params.scriptId);

      if (!scriptId) {
        res.status(400).json({ error: 'Gecersiz scriptId.' });
        return;
      }

      const script = await db.get(
        'SELECT id FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId],
      );
      if (!script) {
        res.status(404).json({ error: 'Script bulunamadi.' });
        return;
      }

      const images = await getStoryboardImages(scriptId);
      res.json({ success: true, data: { scriptId, images } });
    } catch (error: any) {
      Logger.error('[StoryboardRoutes] Get error:', error);
      res.status(500).json({ error: error.message || 'Storyboard alinamadi.' });
    }
  },
);

// DELETE /api/v1/storyboard/:scriptId — Storyboard goruntulerini sil
storyboardRouter.delete(
  '/storyboard/:scriptId',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const scriptId = Number(req.params.scriptId);

      if (!scriptId) {
        res.status(400).json({ error: 'Gecersiz scriptId.' });
        return;
      }

      const script = await db.get(
        'SELECT id FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId],
      );
      if (!script) {
        res.status(404).json({ error: 'Script bulunamadi.' });
        return;
      }

      const deleted = await deleteStoryboardImages(scriptId);
      res.json({ success: true, data: { deleted: deleted ? 'silindi' : 'silinecek kayit bulunamadi' } });
    } catch (error: any) {
      Logger.error('[StoryboardRoutes] Delete error:', error);
      res.status(500).json({ error: error.message || 'Storyboard silinemedi.' });
    }
  },
);
