/**
 * Beat Sync Routes
 * API endpoints for beat-synced video editing
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import { buildBeatMarkers, BeatMarker, BeatAnalysisResult } from '../services/beatAnalyzer';
import { applyBeatSync, quickBeatSync, BeatSyncOptions } from '../services/beatSyncEditor';
import path from 'path';
import fs from 'fs-extra';

const router = Router();

/**
 * POST /api/v1/beatsync/analyze
 * Analyze audio file and return BPM + beat markers
 */
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { audioPath } = req.body;

    if (!audioPath) {
      return res.status(400).json({ error: 'audioPath is required' });
    }

    // Support both full paths and relative paths
    let fullPath = audioPath;
    if (!path.isAbsolute(audioPath)) {
      fullPath = path.join(process.cwd(), audioPath);
    }

    if (!await fs.pathExists(fullPath)) {
      return res.status(400).json({ error: 'Audio file not found' });
    }

    Logger.info(`[BeatSync] Analyzing audio: ${fullPath}`);

    const result: BeatAnalysisResult = await buildBeatMarkers(fullPath);

    res.json({
      success: true,
      bpm: result.bpm,
      duration: result.duration,
      beatCount: result.beats.length,
      beats: result.beats.map(b => ({
        timestamp: b.timestamp,
        strength: b.strength,
        beatNumber: b.beatNumber,
        bar: b.bar
      }))
    });

  } catch (error) {
    Logger.error('[BeatSync] Analysis failed:', error);
    res.status(500).json({ error: 'Audio analysis failed' });
  }
});

/**
 * POST /api/v1/beatsync/apply
 * Apply beat-synced editing to video
 */
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const {
      videoPath,
      audioPath,
      beats,
      bpm,
      crossfadeDur = 0.5,
      minSegmentDur = 2.0,
      alignToBeats = true,
      outputPath: requestedOutputPath
    } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    // Resolve full paths
    let videoFullPath = videoPath;
    if (!path.isAbsolute(videoPath)) {
      videoFullPath = path.join(process.cwd(), videoPath);
    }

    if (!await fs.pathExists(videoFullPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    let audioFullPath: string | undefined;
    if (audioPath) {
      audioFullPath = path.isAbsolute(audioPath)
        ? audioPath
        : path.join(process.cwd(), audioPath);
    }

    // Determine output path
    const outputDir = path.join(process.cwd(), 'videolar');
    await fs.ensureDir(outputDir);

    const outputPath = requestedOutputPath
      || path.join(outputDir, `beatsync_${Date.now()}.mp4`);

    // Get beat markers: either use provided beats or detect them
    let beatMarkers: BeatMarker[];

    if (beats && Array.isArray(beats) && beats.length > 0) {
      // Use provided beat markers
      beatMarkers = beats.map((b: any) => ({
        timestamp: b.timestamp,
        strength: b.strength || 0.8,
        beatNumber: b.beatNumber || 0,
        bar: b.bar || 1
      }));
      Logger.info(`[BeatSync] Using provided ${beatMarkers.length} beat markers`);
    } else if (bpm) {
      // Detect beats at specified BPM
      const { findBeatPeaks } = await import('../services/beatAnalyzer.js');
      beatMarkers = await findBeatPeaks(videoFullPath, bpm);
      Logger.info(`[BeatSync] Generated ${beatMarkers.length} beats at ${bpm} BPM`);
    } else {
      // Auto-detect from audio
      const analysisResult = await buildBeatMarkers(videoFullPath);
      beatMarkers = analysisResult.beats;
      Logger.info(`[BeatSync] Auto-detected ${beatMarkers.length} beats at ${analysisResult.bpm} BPM`);
    }

    const options: BeatSyncOptions = {
      videoPath: videoFullPath,
      audioPath: audioFullPath,
      crossfadeDur,
      minSegmentDur,
      alignToBeats
    };

    Logger.info(`[BeatSync] Applying beat-sync to: ${videoFullPath}`);

    // Start async processing
    applyBeatSync(options, beatMarkers, outputPath)
      .then(() => {
        Logger.info(`[BeatSync] Beat-sync complete: ${outputPath}`);
      })
      .catch((err) => {
        Logger.error(`[BeatSync] Beat-sync failed:`, err);
      });

    // Return immediately with output path for polling
    res.json({
      success: true,
      message: 'Beat-sync processing started',
      outputPath,
      beatCount: beatMarkers.length
    });

  } catch (error) {
    Logger.error('[BeatSync] Apply failed:', error);
    res.status(500).json({ error: 'Beat-sync processing failed' });
  }
});

/**
 * POST /api/v1/beatsync/quick
 * Apply beat-sync with auto-detected BPM (convenience endpoint)
 */
router.post('/quick', requireAuth, async (req, res) => {
  try {
    const { videoPath, bpm, outputPath: requestedOutputPath } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    const videoFullPath = path.isAbsolute(videoPath)
      ? videoPath
      : path.join(process.cwd(), videoPath);

    if (!await fs.pathExists(videoFullPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    const outputDir = path.join(process.cwd(), 'videolar');
    await fs.ensureDir(outputDir);

    const outputPath = requestedOutputPath
      || path.join(outputDir, `beatsync_quick_${Date.now()}.mp4`);

    Logger.info(`[BeatSync] Quick beat-sync starting: ${videoFullPath}`);

    // Run async
    quickBeatSync(videoFullPath, outputPath, bpm)
      .then(() => {
        Logger.info(`[BeatSync] Quick beat-sync complete: ${outputPath}`);
      })
      .catch((err) => {
        Logger.error(`[BeatSync] Quick beat-sync failed:`, err);
      });

    res.json({
      success: true,
      message: 'Quick beat-sync processing started',
      outputPath
    });

  } catch (error) {
    Logger.error('[BeatSync] Quick beat-sync failed:', error);
    res.status(500).json({ error: 'Quick beat-sync failed' });
  }
});

export default router;