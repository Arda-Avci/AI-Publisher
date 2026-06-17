import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { analyzeNiche, getNichePromptEnhancement } from '../services/nicheProfile.js';
import { Logger } from '../lib/logger.js';

export const nicheRouter = Router();

nicheRouter.post(
  '/niche/analyze',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { masterPrompt, productionNotes } = req.body;
      if (!masterPrompt) {
        return res.status(400).json({ success: false, error: 'masterPrompt gerekli' });
      }
      const result = await analyzeNiche(masterPrompt, productionNotes);
      res.json({ success: true, data: result });
    } catch (err: any) {
      Logger.error('[NICHE] Analyze error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Niche analiz hatası' });
    }
  },
);

nicheRouter.post(
  '/niche/enhance-prompt',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { profile, platform, originalPrompt } = req.body;
      if (!profile || !platform || !originalPrompt) {
        return res
          .status(400)
          .json({ success: false, error: 'profile, platform, originalPrompt gerekli' });
      }
      const enhanced = getNichePromptEnhancement(profile, platform, originalPrompt);
      res.json({ success: true, data: { original: originalPrompt, enhanced } });
    } catch (err: any) {
      Logger.error('[NICHE] Enhance error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Prompt geliştirme hatası' });
    }
  },
);
