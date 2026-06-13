/**
 * Color Grade API Route
 * @description POST /api/v1/color/grade — Doğal dil renk grading endpoint
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { applyColorGrade, parseColorCommand, generateLUTFromCommand, colorBalance, ColorGrade } from '../services/colorGrader.js';
import { Logger } from '../lib/logger.js';

const router = Router();

interface GradeRequestBody {
  videoPath: string;
  command?: string;    // "sıcak sinematik tonlar" gibi doğal dil komutu
  grade?: ColorGrade;  // veya doğrudan ColorGrade objesi
  shadows?: string;    // "rs/gs/bs" formatında
  midtones?: string;
  highlights?: string;
  outputPath?: string;
}

// ── POST /api/v1/color/grade ────────────────────────────────────────────────

/**
 * @route POST /api/v1/color/grade
 * @body { videoPath: string, command?: string, grade?: ColorGrade, shadows?, midtones?, highlights? }
 * @desc  Video renk grading uygular. command veya grade objesi ile belirtilir.
 */
router.post('/grade', async (req, res) => {
  const { videoPath, command, grade, shadows, midtones, highlights } = req.body as GradeRequestBody;

  if (!videoPath) {
    res.status(400).json({ error: 'videoPath gerekli' });
    return;
  }

  if (!(await fs.pathExists(videoPath))) {
    res.status(400).json({ error: `Video dosyası bulunamadı: ${videoPath}` });
    return;
  }

  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  const outputPath = req.body.outputPath || path.join(uploadsDir, `color_${Date.now()}.mp4`);

  try {
    // colorBalance modu (shadows/midtones/highlights verilmişse)
    if (shadows && midtones && highlights) {
      await colorBalance(videoPath, shadows, midtones, highlights, outputPath);
      res.json({ success: true, outputPath, mode: 'colorBalance' });
      return;
    }

    // Grade objesi doğrudan verilmişse
    if (grade) {
      await applyColorGrade(videoPath, grade, outputPath);
      res.json({ success: true, outputPath, mode: 'grade', grade });
      return;
    }

    // command string verilmişse (doğal dil)
    if (command) {
      const parsed = parseColorCommand(command);
      await applyColorGrade(videoPath, parsed, outputPath);
      res.json({ success: true, outputPath, mode: 'command', command, parsed });
      return;
    }

    res.status(400).json({ error: 'command, grade veya shadows/midtones/highlights gerekli' });
  } catch (err: any) {
    Logger.error('color/grade endpoint hatası', err);
    res.status(500).json({ error: err.message || 'Renk grading başarısız' });
  }
});

// ── POST /api/v1/color/lut ───────────────────────────────────────────────────

/**
 * @route POST /api/v1/color/lut
 * @body { videoPath: string, lutPath: string }
 * @desc  .cube LUT dosyası uygular.
 */
router.post('/lut', async (req, res) => {
  const { videoPath, lutPath } = req.body as { videoPath: string; lutPath: string };

  if (!videoPath || !lutPath) {
    res.status(400).json({ error: 'videoPath ve lutPath gerekli' });
    return;
  }

  if (!(await fs.pathExists(videoPath))) {
    res.status(400).json({ error: `Video dosyası bulunamadı: ${videoPath}` });
    return;
  }

  if (!(await fs.pathExists(lutPath))) {
    res.status(400).json({ error: `LUT dosyası bulunamadı: ${lutPath}` });
    return;
  }

  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  const outputPath = path.join(uploadsDir, `lut_${Date.now()}.mp4`);

  try {
    const { applyLUT } = await import('../services/colorGrader.js');
    await applyLUT(videoPath, lutPath, outputPath);
    res.json({ success: true, outputPath });
  } catch (err: any) {
    Logger.error('color/lut endpoint hatası', err);
    res.status(500).json({ error: err.message || 'LUT uygulaması başarısız' });
  }
});

// ── POST /api/v1/color/parse ─────────────────────────────────────────────────

/**
 * @route POST /api/v1/color/parse
 * @body { command: string }
 * @desc  Doğal dil komutunu ColorGrade objesine parse eder (test için).
 */
router.post('/parse', (req, res) => {
  const { command } = req.body as { command: string };

  if (!command) {
    res.status(400).json({ error: 'command gerekli' });
    return;
  }

  const parsed = parseColorCommand(command);
  res.json({ command, parsed });
});

export default router;
