import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { runStoryboardAgent } from '../services/storyboardAgent/index.js';
import { validateSceneConsistency } from '../services/mllmValidator.js';
import { Logger } from '../lib/logger.js';

const router = Router();

router.post('/generate', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { masterPrompt, productionNotes, characterFeatures, sceneCount } = req.body;
    if (!masterPrompt) return res.status(400).json({ error: 'masterPrompt gerekli' });

    const result = await runStoryboardAgent({
      masterPrompt,
      productionNotes,
      characterFeatures,
      sceneCount: sceneCount || 6,
    });

    res.json({
      success: true,
      storyboard: {
        title: result.script.title,
        logline: result.script.logline,
        genre: result.script.genre,
        frames: result.script.frames,
      },
      scenes: result.scenes,
      consistency: result.consistencyReport,
    });
  } catch (err: any) {
    Logger.error('[Storyboard] Generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/validate', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { scenes } = req.body;
    if (!scenes || !Array.isArray(scenes)) {
      return res.status(400).json({ error: 'Scenes array gerekli' });
    }

    const report = await validateSceneConsistency(scenes);
    res.json({ success: true, report });
  } catch (err: any) {
    Logger.error('[Storyboard] Validate error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/frames', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { storyboardVectorStore } = await import('../services/storyboardAgent/vectorStore.js');
    res.json({ success: true, frameCount: storyboardVectorStore.size });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
