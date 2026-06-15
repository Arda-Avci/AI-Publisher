import { Router } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { upload } from '../lib/upload.js';
import { Logger } from '../lib/logger.js';

const router = Router();

function outputPath(prefix: string): string {
  return path.join(process.cwd(), 'videolar', `${prefix}_${Date.now()}.mp4`);
}

function outputImagePath(prefix: string): string {
  return path.join(process.cwd(), 'uploads', `${prefix}_${Date.now()}.png`);
}

// POST /api/v1/studio/enhance-audio — Studio Sound
router.post('/enhance-audio', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { videoPath, denoise, equalize, deecho, levelDb } = req.body;
    if (!videoPath) return res.status(400).json({ error: 'videoPath gerekli' });
    if (!await fs.pathExists(videoPath)) return res.status(404).json({ error: 'Video bulunamadı' });

    const outPath = outputPath('enhanced');
    const { enhanceVideoAudio } = await import('../services/aiStudio.js');
    const result = await enhanceVideoAudio(videoPath, outPath, { denoise, equalize, deecho, levelDb });
    res.json({ success: true, outputPath: result.outputPath, usedColab: result.usedColab, durationMs: result.durationMs });
  } catch (err: any) {
    Logger.error('[AI Studio] enhance-audio error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/studio/smart-reframe — Smart reframe
router.post('/smart-reframe', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { videoPath, useFaceTracking = true, startTime = 0, duration } = req.body;
    if (!videoPath) return res.status(400).json({ error: 'videoPath gerekli' });
    if (!await fs.pathExists(videoPath)) return res.status(404).json({ error: 'Video bulunamadı' });

    const outPath = outputPath('reframe');
    const { smartReframe } = await import('../services/aiStudio.js');
    const result = await smartReframe(videoPath, outPath, { useFaceTracking, startTime, duration });
    res.json({ success: true, outputPath: result.outputPath, usedColab: result.usedColab, durationMs: result.durationMs });
  } catch (err: any) {
    Logger.error('[AI Studio] smart-reframe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/studio/remove-background — Remove BG
router.post('/remove-background', mediumLimiter, requireAuth, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Görsel gerekli' });

    const outPath = outputImagePath('nobg');
    const { removeBackground } = await import('../services/aiStudio.js');
    const result = await removeBackground(req.file.path, outPath);
    await fs.remove(req.file.path);

    res.json({
      success: true,
      url: `/uploads/${path.basename(outPath)}`,
      usedColab: result.usedColab,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    Logger.error('[AI Studio] remove-background error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/studio/generate-image — Generate image
router.post('/generate-image', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { prompt, model_type } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt gerekli' });

    const outPath = outputImagePath('gen');
    const { generateImage } = await import('../services/aiStudio.js');
    const result = await generateImage(prompt, outPath, model_type);
    res.json({ success: true, url: `/uploads/${path.basename(outPath)}`, usedColab: result.usedColab, durationMs: result.durationMs });
  } catch (err: any) {
    Logger.error('[AI Studio] generate-image error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/studio/inpaint — Inpaint
router.post('/inpaint', mediumLimiter, requireAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 },
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const imageFile = files?.['image']?.[0];
    const maskFile = files?.['mask']?.[0];
    const { prompt } = req.body;
    if (!imageFile || !maskFile || !prompt) return res.status(400).json({ error: 'Görsel, maske ve prompt gerekli' });

    const outPath = outputImagePath('inpaint');
    const { inpaintImage } = await import('../services/aiStudio.js');
    const result = await inpaintImage(imageFile.path, maskFile.path, prompt, outPath);
    await fs.remove(imageFile.path);
    await fs.remove(maskFile.path);

    res.json({ success: true, url: `/uploads/${path.basename(outPath)}`, usedColab: result.usedColab, durationMs: result.durationMs });
  } catch (err: any) {
    Logger.error('[AI Studio] inpaint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/studio/gaze-fix — Gaze correction
router.post('/gaze-fix', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { videoPath, smooth = true } = req.body;
    if (!videoPath) return res.status(400).json({ error: 'videoPath gerekli' });
    if (!await fs.pathExists(videoPath)) return res.status(404).json({ error: 'Video bulunamadı' });

    const outPath = outputPath('gaze_fixed');
    const { correctGaze } = await import('../services/aiStudio.js');
    const result = await correctGaze(videoPath, outPath, smooth);
    res.json({ success: true, outputPath: result.outputPath, usedColab: result.usedColab, durationMs: result.durationMs });
  } catch (err: any) {
    Logger.error('[AI Studio] gaze-fix error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/studio/enhance-audio-only — Audio-only enhancement (no video passthrough)
router.post('/enhance-audio-only', mediumLimiter, requireAuth, async (req, res) => {
  try {
    const { videoPath, denoise, equalize, deecho, levelDb } = req.body;
    if (!videoPath) return res.status(400).json({ error: 'videoPath gerekli' });
    if (!await fs.pathExists(videoPath)) return res.status(404).json({ error: 'Video bulunamadı' });

    const outPath = outputPath('audio_enhanced');
    const { enhanceAudio } = await import('../services/aiStudio.js');
    const result = await enhanceAudio(videoPath, outPath, { denoise, equalize, deecho, levelDb });
    res.json({ success: true, outputPath: result.outputPath, usedColab: result.usedColab, durationMs: result.durationMs });
  } catch (err: any) {
    Logger.error('[AI Studio] enhance-audio-only error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
