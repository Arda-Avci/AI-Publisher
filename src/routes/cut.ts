/**
 * Cut Service Route — Sessiz ve Statik Kesim API
 * @description POST /api/v1/cut/silence, POST /api/v1/cut/static
 */

import { Router } from 'express';
import {
  detectSilenceRanges,
  autoCutVideo,
  TimeRange,
} from '../services/autoEditor.js';
import { Logger } from '../lib/logger.js';

const router = Router();

// ── POST /api/v1/cut/silence ────────────────────────────────────────────────

/**
 * @route POST /api/v1/cut/silence
 * @body { videoPath: string, thresholdDb?: number, minSilenceSec?: number }
 * @desc  Video sesindeki sessiz bölümleri tespit eder ve keser.
 */
router.post('/silence', async (req, res) => {
  const { videoPath, thresholdDb, minSilenceSec, aggressive } = req.body as {
    videoPath: string;
    thresholdDb?: number;
    minSilenceSec?: number;
    aggressive?: boolean;
  };

  if (!videoPath) {
    res.status(400).json({ error: 'videoPath gerekli' });
    return;
  }

  try {
    const outputPath = await autoCutVideo(videoPath, {
      silenceThresholdDb: thresholdDb ?? -40,
      minSilenceSec: minSilenceSec ?? 0.5,
      aggressive: aggressive ?? false,
    });
    res.json({ success: true, outputPath });
  } catch (err: any) {
    Logger.error('cut/silence endpoint hatası', err);
    res.status(500).json({ error: err.message || 'Sessiz kesim başarısız' });
  }
});

// ── POST /api/v1/cut/static ──────────────────────────────────────────────────

/**
 * @route POST /api/v1/cut/static
 * @body { videoPath: string, threshold?: number }
 * @desc  Düşük hareketli (statik) bölümleri tespit eder ve keser.
 */
router.post('/static', async (req, res) => {
  const { videoPath, threshold } = req.body as {
    videoPath: string;
    threshold?: number;
  };

  if (!videoPath) {
    res.status(400).json({ error: 'videoPath gerekli' });
    return;
  }

  try {
    const outputPath = await autoCutVideo(videoPath, {
      staticThreshold: threshold ?? 0.01,
      minStaticSec: 1.0,
    });
    res.json({ success: true, outputPath });
  } catch (err: any) {
    Logger.error('cut/static endpoint hatası', err);
    res.status(500).json({ error: err.message || 'Statik kesim başarısız' });
  }
});

// ── GET /api/v1/cut/silence-ranges ──────────────────────────────────────────

/**
 * @route GET /api/v1/cut/silence-ranges?videoPath=...
 * @desc  Sessiz bölüm aralıklarını döndürür (kesim yapmaz).
 */
router.get('/silence-ranges', async (req, res) => {
  const { videoPath, thresholdDb, minSilenceSec } = req.query as {
    videoPath?: string;
    thresholdDb?: string;
    minSilenceSec?: string;
  };

  if (!videoPath) {
    res.status(400).json({ error: 'videoPath gerekli' });
    return;
  }

  try {
    const ranges: TimeRange[] = await detectSilenceRanges(
      videoPath,
      thresholdDb ? parseFloat(thresholdDb) : -40,
      minSilenceSec ? parseFloat(minSilenceSec) : 0.5,
    );
    res.json({ videoPath, ranges, count: ranges.length });
  } catch (err: any) {
    Logger.error('cut/silence-ranges hatası', err);
    res.status(500).json({ error: err.message || 'Sessizlik tespiti başarısız' });
  }
});

export default router;
