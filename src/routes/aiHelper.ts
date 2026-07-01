import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import {
  enhanceVideoPrompt,
  generateTutorialPrompts,
  generateLandingPageAssets,
  generateCustomThemes,
} from '../services/index.js';

const router = Router();

/**
 * POST /api/v1/ai-helper/enhance-prompt
 * Zenginleştirilmiş master prompt üretir
 */
router.post('/enhance-prompt', requireAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, cameraMotion, templateStyle, characterFeatures } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt alanı zorunludur.' });
    }

    const enhanced = await enhanceVideoPrompt(prompt, {
      cameraMotion,
      templateStyle,
      characterFeatures,
    });

    res.json({ success: true, enhancedPrompt: enhanced });
  } catch (error: any) {
    Logger.error('Prompt geliştirme hatası:', error);
    res.status(500).json({ success: false, error: error?.message || 'Prompt geliştirilemedi.' });
  }
});

/**
 * POST /api/v1/ai-helper/tutorial-prompts
 * Verilen özellik adı için Short/TikTok eğitim planı ve promptları üretir
 */
router.post('/tutorial-prompts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { featureName } = req.body;
    if (!featureName || typeof featureName !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'Özellik adı (featureName) zorunludur.' });
    }

    const result = await generateTutorialPrompts(featureName);
    res.json({ success: true, data: result });
  } catch (error: any) {
    Logger.error('Eğitim promptu üretme hatası:', error);
    res
      .status(500)
      .json({ success: false, error: error?.message || 'Eğitim promptları üretilemedi.' });
  }
});

/**
 * POST /api/v1/ai-helper/landing-assets
 * Belirtilen niş/kategori için açılış sayfası vitrin promptlarını üretir
 */
router.post('/landing-assets', requireAuth, async (req: Request, res: Response) => {
  try {
    const { niche } = req.body;
    if (!niche || typeof niche !== 'string') {
      return res.status(400).json({ success: false, error: 'Kategori/niche alanı zorunludur.' });
    }

    const result = await generateLandingPageAssets(niche);
    res.json({ success: true, data: result });
  } catch (error: any) {
    Logger.error('Landing assets promptu üretme hatası:', error);
    res
      .status(500)
      .json({ success: false, error: error?.message || 'Varlık promptları üretilemedi.' });
  }
});

/**
 * POST /api/v1/ai-helper/custom-theme
 * Stil açıklamasına göre HSL renk şeması sentezler
 */
router.post('/custom-theme', requireAuth, async (req: Request, res: Response) => {
  try {
    const { styleDescription } = req.body;
    if (!styleDescription || typeof styleDescription !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'Stil açıklaması (styleDescription) zorunludur.' });
    }

    const result = await generateCustomThemes(styleDescription);
    res.json({ success: true, data: result });
  } catch (error: any) {
    Logger.error('Tema rengi üretme hatası:', error);
    res
      .status(500)
      .json({ success: false, error: error?.message || 'Tema renk paleti üretilemedi.' });
  }
});

export default router;
