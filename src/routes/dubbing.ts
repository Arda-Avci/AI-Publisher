/**
 * Dubbing Routes — REST API for auto-dubbing operations.
 *
 * POST /api/v1/dubbing/dub — Start a dubbing job
 * GET  /api/v1/dubbing/status/:jobId — Get dubbing job status
 *
 * @module routes/dubbing
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { autoDub } from '../services/autoDubbing.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';

const router = Router();

/**
 * POST /api/v1/dubbing/dub
 *
 * Body: {
 *   videoPath: string,       // absolute path to video file
 *   targetLang: string,    // target language code (en, es, fr, ar, etc.)
 *   sourceLang?: string,    // source language code (default 'tr')
 *   voice?: string,         // XTTS voice name (default 'Claribel Dervla')
 *   userId: number          // user ID for credits
 * }
 */
router.post('/dub', async (req, res) => {
  try {
    const { videoPath, targetLang, sourceLang, voice, userId } = req.body as {
      videoPath: string;
      targetLang: string;
      sourceLang?: string;
      voice?: string;
      userId: number;
    };

    if (!videoPath || !targetLang || !userId) {
      res.status(400).json({ error: 'videoPath, targetLang, and userId are required' });
      return;
    }

    // Validate video exists
    const resolvedPath = path.isAbsolute(videoPath)
      ? videoPath
      : path.join(process.cwd(), videoPath);

    if (!(await fs.pathExists(resolvedPath))) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    // Check credits (simplified — dubbing costs 20 credits)
    const DUBBING_COST = 20;
    const user: any = await db.get('SELECT credits FROM users WHERE id = ?', [userId]);
    if (!user || (user.credits || 0) < DUBBING_COST) {
      res.status(402).json({ error: 'Insufficient credits', required: DUBBING_COST });
      return;
    }

    // Output path
    const outputPath = path.join(process.cwd(), 'videolar', `dubbed_${userId}_${Date.now()}.mp4`);

    // Start dubbing in background (non-blocking)
    autoDub(resolvedPath, {
      sourceLang: sourceLang || 'tr',
      targetLang,
      voice: voice || 'Claribel Dervla',
      outputPath,
    })
      .then(async (result) => {
        // Deduct credits on success
        await db.run('UPDATE users SET credits = credits - ? WHERE id = ?', [DUBBING_COST, userId]);
        Logger.info('[dubbing] Dubbing job completed', {
          jobId: result.outputPath,
          originalDuration: result.originalDuration,
          dubbedDuration: result.dubbedDuration,
        });
      })
      .catch(async (err) => {
        Logger.error('[dubbing] Dubbing job failed', err);
      });

    res.json({
      status: 'processing',
      outputPath: `/videolar/${path.basename(outputPath)}`,
      message: 'Dubbing started. Check status endpoint for progress.',
    });
  } catch (err: any) {
    Logger.error('[dubbing] POST /dub error', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/dubbing/status/:jobId
 *
 * Returns the status of a dubbing job.
 * Note: This is a simplified implementation. For full job tracking,
 * a dubbing_jobs table should be created.
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // For now, we just check if the output file exists
    // A full implementation would use a dubbing_jobs table
    const videolarDir = path.join(process.cwd(), 'videolar');
    let foundFile = '';

    try {
      const files = await fs.readdir(videolarDir);
      for (const f of files) {
        if (f.startsWith(`dubbed_`) && f.endsWith('.mp4')) {
          foundFile = f;
          break;
        }
      }
    } catch {}

    if (foundFile) {
      res.json({
        status: 'completed',
        outputPath: `/videolar/${foundFile}`,
      });
    } else {
      res.json({
        status: 'processing',
        message: 'Dubbing still in progress',
      });
    }
  } catch (err: any) {
    Logger.error('[dubbing] GET /status error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
