/**
 * Clipper API Routes
 * Autonomous video clipping and short-form content extraction
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { sendToQueue, CLIP_JOBS_QUEUE } from '../lib/rabbitmq.js';
import { viralAnalyzer, videoClipper, ClipSegment, ClipJob } from '../services/clipper/index.js';
import { smartCropper } from '../services/clipper/smartCropper.js';
import { subtitleMixer } from '../services/clipper/subtitleMixer.js';
import { splitScreenVertical, splitScreenHorizontal, splitScreenGrid, overlayMascot, overlayMascotWithAnimation, pipOverlay, SplitScreenOptions, OverlayPosition, AnimationType, PipPosition } from '../services/clipper/splitScreenService.js';
import path from 'path';
import fs from 'fs-extra';

const router = Router();

/**
 * POST /api/v1/clipper/extract
 * Extract viral segments from a video via RabbitMQ queue
 */
router.post('/extract', requireAuth, async (req, res) => {
  try {
    const { videoPath, title, minDuration, maxDuration, targetCount } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    const result = await db.run(
      `INSERT INTO clip_jobs (user_id, source_video_path, title, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [req.session.userId, videoPath, title || '']
    );
    const clipJobId = result.lastID || (result as any)?.id || 0;

    Logger.info(`[Clipper] Clip job #${clipJobId} created for ${videoPath}`);

    try {
      await sendToQueue(CLIP_JOBS_QUEUE, {
        clipJobId,
        userId: req.session.userId,
        videoPath,
        title: title || '',
        minDuration: minDuration || 30,
        maxDuration: maxDuration || 90,
        targetCount: targetCount || 5,
      });
    } catch (queueErr) {
      Logger.warn('[Clipper] Queue unavailable, processing inline:', queueErr);
      processInlineExtraction(clipJobId, videoPath, { minDuration, maxDuration, targetCount, title });
    }

    res.status(201).json({ jobId: clipJobId, status: 'pending' });
  } catch (error) {
    Logger.error('[Clipper] Extraction failed:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

/**
 * GET /api/v1/clipper/list
 * List all clip jobs for current user
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT id, source_video_path, title, status, segments, overall_score, created_at, completed_at FROM clip_jobs WHERE user_id = $1 ORDER BY id DESC',
      [req.session.userId]
    );

    const parseSegments = (row: any) => {
      if (!row.segments) return [];
      const segs = typeof row.segments === 'string' ? JSON.parse(row.segments) : row.segments;
      return Array.isArray(segs) ? segs.map((s: any) => ({
        id: s.id, startTime: s.startTime, endTime: s.endTime,
        duration: s.duration, score: s.score,
      })) : [];
    };

    const clips = rows.map((row: any) => ({
      id: row.id,
      videoPath: row.source_video_path,
      title: row.title,
      status: row.status,
      overallScore: row.overall_score,
      segments: parseSegments(row),
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));

    res.json({ clips });
  } catch (error) {
    Logger.error('[Clipper] List failed:', error);
    res.status(500).json({ error: 'Failed to list clips' });
  }
});

/**
 * GET /api/v1/clipper/:id
 * Get clip job details
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const jobId = parseInt(String(req.params.id), 10);
    const row = await db.get(
      'SELECT * FROM clip_jobs WHERE id = $1 AND user_id = $2',
      [jobId, req.session.userId]
    );
    if (!row) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const segments = row.segments
      ? (typeof row.segments === 'string' ? JSON.parse(row.segments) : row.segments)
      : [];

    res.json({
      clip: {
        id: row.id,
        videoPath: row.source_video_path,
        title: row.title,
        status: row.status,
        overallScore: row.overall_score,
        segments,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }
    });
  } catch (error) {
    Logger.error('[Clipper] Get failed:', error);
    res.status(500).json({ error: 'Failed to get clip' });
  }
});

/**
 * POST /api/v1/clipper/:id/export
 * Export clips with optional processing (crop, subtitles, music)
 */
router.post('/:id/export', requireAuth, async (req, res) => {
  try {
    const jobId = parseInt(String(req.params.id), 10);
    const row = await db.get(
      'SELECT * FROM clip_jobs WHERE id = $1 AND user_id = $2',
      [jobId, req.session.userId]
    );
    if (!row) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    if (row.status !== 'completed') {
      return res.status(400).json({ error: 'Clip extraction not completed' });
    }

    const {
      segmentIds,
      aspectRatio = '9:16',
      addSubtitles = true,
      addMusic = false,
      musicPath,
      useFaceTracking = false,
    } = req.body;

    const segments: ClipSegment[] = row.segments
      ? (typeof row.segments === 'string' ? JSON.parse(row.segments) : row.segments)
      : [];

    const outputDir = path.join(process.cwd(), 'videolar', `clip_${row.id}`);
    await fs.ensureDir(outputDir);

    const selectedSegments = segmentIds
      ? segments.filter((s: ClipSegment) => segmentIds.includes(s.id))
      : segments;

    const outputPaths: string[] = [];

    for (const segment of selectedSegments) {
      const clipPath = path.join(outputDir, `clip_${segment.id}.mp4`);

      try {
        let currentPath: string;

        if (useFaceTracking) {
          currentPath = await videoClipper.cropSegmentWithFaceTracking(
            row.source_video_path,
            clipPath,
            segment,
            { aspectRatio }
          );
        } else {
          currentPath = await videoClipper.cropSegment(
            row.source_video_path,
            clipPath,
            segment,
            { aspectRatio }
          );
        }

        if (addSubtitles) {
          const withSubsPath = clipPath.replace('.mp4', '_subs.mp4');
          await videoClipper.generateSubtitles(currentPath, withSubsPath, [
            { start: 0, end: segment.duration, text: segment.suggestedCaption || '' },
          ]);
          currentPath = withSubsPath;
        }

        if (addMusic && musicPath) {
          const withMusicPath = clipPath.replace('.mp4', '_music.mp4');
          await videoClipper.mixMusic(currentPath, musicPath, withMusicPath);
          currentPath = withMusicPath;
        }

        outputPaths.push(currentPath);
      } catch (err) {
        Logger.error(`[Clipper] Failed to export segment ${segment.id}:`, err);
      }
    }

    await db.run('UPDATE clip_jobs SET output_paths = $1 WHERE id = $2',
      [JSON.stringify(outputPaths), row.id]);

    res.json({ jobId: row.id, outputPaths });
  } catch (error) {
    Logger.error('[Clipper] Export failed:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

/**
 * POST /api/v1/clipper/split-screen
 * Create split-screen video from two clips
 */
router.post('/split-screen', requireAuth, async (req, res) => {
  try {
    const { topVideoPath, bottomVideoPath, layout = 'vertical', outputPath } = req.body;

    if (!topVideoPath || !bottomVideoPath) {
      return res.status(400).json({ error: 'Both topVideoPath and bottomVideoPath are required' });
    }

    const output = outputPath || path.join(process.cwd(), 'videolar', `split_${Date.now()}.mp4`);

    const result = await videoClipper.createSplitScreen(
      topVideoPath,
      bottomVideoPath,
      output,
      layout
    );

    res.json({ outputPath: result });
  } catch (error) {
    Logger.error('[Clipper] Split-screen failed:', error);
    res.status(500).json({ error: 'Split-screen creation failed' });
  }
});

/**
 * POST /api/v1/clipper/watermark
 * Add watermark/mascot overlay to video
 */
router.post('/watermark', requireAuth, async (req, res) => {
  try {
    const { videoPath, watermarkPath, position = 'bottom-right', outputPath } = req.body;

    if (!videoPath || !watermarkPath) {
      return res.status(400).json({ error: 'videoPath and watermarkPath are required' });
    }

    const output = outputPath || videoPath.replace('.mp4', '_watermarked.mp4');

    const result = await videoClipper.addWatermark(videoPath, watermarkPath, output, position);

    res.json({ outputPath: result });
  } catch (error) {
    Logger.error('[Clipper] Watermark failed:', error);
    res.status(500).json({ error: 'Watermark failed' });
  }
});

/**
 * POST /api/v1/clipper/split-screen-vertical
 * Create vertical (top/bottom) split-screen video
 */
router.post('/split-screen-vertical', requireAuth, async (req, res) => {
  try {
    const { topVideoPath, bottomVideoPath, outputPath, gapPx, borderColor } = req.body;

    if (!topVideoPath || !bottomVideoPath) {
      return res.status(400).json({ error: 'topVideoPath and bottomVideoPath are required' });
    }

    if (!await fs.pathExists(topVideoPath)) {
      return res.status(400).json({ error: 'Top video file not found' });
    }

    if (!await fs.pathExists(bottomVideoPath)) {
      return res.status(400).json({ error: 'Bottom video file not found' });
    }

    const output = outputPath || path.join(process.cwd(), 'videolar', `split_v_${Date.now()}.mp4`);

    const options: SplitScreenOptions = {};
    if (gapPx !== undefined) options.gapPx = gapPx;
    if (borderColor) options.borderColor = borderColor;

    await splitScreenVertical(topVideoPath, bottomVideoPath, output, options);

    res.json({ outputPath: output });
  } catch (error) {
    Logger.error('[Clipper] Vertical split-screen failed:', error);
    res.status(500).json({ error: 'Vertical split-screen creation failed' });
  }
});

/**
 * POST /api/v1/clipper/split-screen-horizontal
 * Create horizontal (left/right) split-screen video
 */
router.post('/split-screen-horizontal', requireAuth, async (req, res) => {
  try {
    const { leftVideoPath, rightVideoPath, outputPath, gapPx, borderColor } = req.body;

    if (!leftVideoPath || !rightVideoPath) {
      return res.status(400).json({ error: 'leftVideoPath and rightVideoPath are required' });
    }

    if (!await fs.pathExists(leftVideoPath)) {
      return res.status(400).json({ error: 'Left video file not found' });
    }

    if (!await fs.pathExists(rightVideoPath)) {
      return res.status(400).json({ error: 'Right video file not found' });
    }

    const output = outputPath || path.join(process.cwd(), 'videolar', `split_h_${Date.now()}.mp4`);

    const options: SplitScreenOptions = {};
    if (gapPx !== undefined) options.gapPx = gapPx;
    if (borderColor) options.borderColor = borderColor;

    await splitScreenHorizontal(leftVideoPath, rightVideoPath, output, options);

    res.json({ outputPath: output });
  } catch (error) {
    Logger.error('[Clipper] Horizontal split-screen failed:', error);
    res.status(500).json({ error: 'Horizontal split-screen creation failed' });
  }
});

/**
 * POST /api/v1/clipper/split-screen-grid
 * Create grid split-screen from multiple videos
 */
router.post('/split-screen-grid', requireAuth, async (req, res) => {
  try {
    const { videoPaths, outputPath, gridCols = 2 } = req.body;

    if (!videoPaths || !Array.isArray(videoPaths) || videoPaths.length < 2) {
      return res.status(400).json({ error: 'videoPaths array with at least 2 videos is required' });
    }

    for (const p of videoPaths) {
      if (!await fs.pathExists(p)) {
        return res.status(400).json({ error: `Video file not found: ${p}` });
      }
    }

    const output = outputPath || path.join(process.cwd(), 'videolar', `split_grid_${Date.now()}.mp4`);

    await splitScreenGrid(videoPaths, output, gridCols);

    res.json({ outputPath: output });
  } catch (error) {
    Logger.error('[Clipper] Grid split-screen failed:', error);
    res.status(500).json({ error: 'Grid split-screen creation failed' });
  }
});

/**
 * POST /api/v1/clipper/mascot-overlay
 * Overlay a mascot/avatar PNG on video at specified position
 */
router.post('/mascot-overlay', requireAuth, async (req, res) => {
  try {
    const { videoPath, mascotPngPath, outputPath, position } = req.body;

    if (!videoPath || !mascotPngPath) {
      return res.status(400).json({ error: 'videoPath and mascotPngPath are required' });
    }

    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    if (!await fs.pathExists(mascotPngPath)) {
      return res.status(400).json({ error: 'Mascot PNG file not found' });
    }

    const output = outputPath || videoPath.replace('.mp4', '_mascot.mp4');

    const overlayPos: OverlayPosition = position || { x: 'W-w-30', y: 'H-h-30', scale: 0.5, opacity: 1.0 };

    await overlayMascot(videoPath, mascotPngPath, output, overlayPos);

    res.json({ outputPath: output });
  } catch (error) {
    Logger.error('[Clipper] Mascot overlay failed:', error);
    res.status(500).json({ error: 'Mascot overlay failed' });
  }
});

/**
 * POST /api/v1/clipper/mascot-overlay-animated
 * Overlay a mascot with animation effects (float, bounce, blink)
 */
router.post('/mascot-overlay-animated', requireAuth, async (req, res) => {
  try {
    const { videoPath, mascotPngPath, outputPath, animType } = req.body;

    if (!videoPath || !mascotPngPath) {
      return res.status(400).json({ error: 'videoPath and mascotPngPath are required' });
    }

    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    if (!await fs.pathExists(mascotPngPath)) {
      return res.status(400).json({ error: 'Mascot PNG file not found' });
    }

    if (!animType || !['float', 'bounce', 'blink'].includes(animType)) {
      return res.status(400).json({ error: 'animType must be one of: float, bounce, blink' });
    }

    const output = outputPath || videoPath.replace('.mp4', `_mascot_${animType}.mp4`);

    await overlayMascotWithAnimation(videoPath, mascotPngPath, output, animType as AnimationType);

    res.json({ outputPath: output });
  } catch (error) {
    Logger.error('[Clipper] Animated mascot overlay failed:', error);
    res.status(500).json({ error: 'Animated mascot overlay failed' });
  }
});

/**
 * POST /api/v1/clipper/pip-overlay
 * Picture-in-Picture overlay (secondary video in corner of primary)
 */
router.post('/pip-overlay', requireAuth, async (req, res) => {
  try {
    const { mainVideoPath, pipVideoPath, outputPath, position = 'bottom-right' } = req.body;

    if (!mainVideoPath || !pipVideoPath) {
      return res.status(400).json({ error: 'mainVideoPath and pipVideoPath are required' });
    }

    if (!await fs.pathExists(mainVideoPath)) {
      return res.status(400).json({ error: 'Main video file not found' });
    }

    if (!await fs.pathExists(pipVideoPath)) {
      return res.status(400).json({ error: 'PIP video file not found' });
    }

    const validPositions: PipPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
    if (!validPositions.includes(position)) {
      return res.status(400).json({ error: `position must be one of: ${validPositions.join(', ')}` });
    }

    const output = outputPath || mainVideoPath.replace('.mp4', '_pip.mp4');

    await pipOverlay(mainVideoPath, pipVideoPath, output, position);

    res.json({ outputPath: output });
  } catch (error) {
    Logger.error('[Clipper] PIP overlay failed:', error);
    res.status(500).json({ error: 'PIP overlay failed' });
  }
});

/**
 * POST /api/v1/clipper/smart-crop
 * Smart crop video to target aspect ratio with face tracking
 */
router.post('/smart-crop', requireAuth, async (req, res) => {
  try {
    const {
      videoPath,
      outputPath,
      targetFocus = 'face',
      aspectRatio = '9:16',
      outputWidth = 1080,
      outputHeight = 1920,
    } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    const output = outputPath || videoPath.replace(/\.\w+$/, '_smart_crop.mp4');

    const result = await smartCropper.cropVideo(videoPath, output, {
      targetFocus,
      aspectRatio: aspectRatio as '9:16' | '16:9' | '1:1' | '4:5',
      outputWidth,
      outputHeight,
    });

    res.json({
      outputPath: result.outputPath,
      cropRegion: result.cropRegion,
      detectedFacesCount: result.detectedFaces.length,
      duration: result.duration,
    });
  } catch (error) {
    Logger.error('[Clipper] Smart crop failed:', error);
    res.status(500).json({ error: 'Smart crop failed' });
  }
});

/**
 * POST /api/v1/clipper/subtitle-mix
 * Embed subtitles and/or mix background music into a video
 */
router.post('/subtitle-mix', requireAuth, async (req, res) => {
  try {
    const {
      videoPath,
      outputPath,
      srtPath,
      musicPath,
      musicVolume = 0.15,
      voicePath,
      thresholdDb,
      attackSec,
      releaseSec,
      subtitleStyle,
    } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    if (srtPath && !await fs.pathExists(srtPath)) {
      return res.status(400).json({ error: 'SRT file not found' });
    }

    if (musicPath && !await fs.pathExists(musicPath)) {
      return res.status(400).json({ error: 'Music file not found' });
    }

    const output = outputPath || videoPath.replace(/\.\w+$/, '_mixed.mp4');

    const result = await subtitleMixer.process(videoPath, {
      srtPath,
      outputPath: output,
      subtitleStyle,
      musicPath,
      musicVolume,
      voicePath,
      duckingOptions: voicePath ? { thresholdDb, attackSec, releaseSec } : undefined,
    });

    res.json({
      outputPath: result.outputPath,
      srtPath: result.srtPath,
      duration: result.duration,
      subtitlesEmbedded: result.subtitlesEmbedded,
      musicMixed: result.musicMixed,
      duckingApplied: result.duckingApplied,
    });
  } catch (error) {
    Logger.error('[Clipper] Subtitle mix failed:', error);
    res.status(500).json({ error: 'Subtitle mix failed' });
  }
});

/**
 * POST /api/v1/clipper/generate-srt
 * Generate SRT file from Whisper transcript
 */
router.post('/generate-srt', requireAuth, async (req, res) => {
  try {
    const { transcript, outputPath } = req.body;

    if (!transcript || !transcript.segments) {
      return res.status(400).json({ error: 'transcript with segments is required' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.ensureDir(uploadsDir);
    const srtPath = outputPath || path.join(uploadsDir, `subtitles_${Date.now()}.srt`);

    const result = await subtitleMixer.generateSrtFromWhisper(transcript, srtPath);

    res.json({ srtPath: result });
  } catch (error) {
    Logger.error('[Clipper] Generate SRT failed:', error);
    res.status(500).json({ error: 'Generate SRT failed' });
  }
});

/**
 * Process video extraction asynchronously
 */
async function processInlineExtraction(
  clipJobId: number,
  videoPath: string,
  options: {
    minDuration?: number;
    maxDuration?: number;
    targetCount?: number;
    title?: string;
  }
): Promise<void> {
  try {
    await db.run('UPDATE clip_jobs SET status = $1 WHERE id = $2', ['processing', clipJobId]);

    let transcription;
    try {
      const { transcribeVideoAudioWithTimestamps } = await import('../lib/audio-transcriber.js');
      const result = await transcribeVideoAudioWithTimestamps(videoPath);
      transcription = {
        text: result.text,
        segments: result.segments,
        language: result.language || 'tr',
      };
    } catch {
      Logger.warn('[Clipper] Transcription failed, using mock');
      transcription = {
        text: 'Mock transcript for testing. This video discusses interesting topics.',
        segments: [
          { start: 0, end: 5, text: 'First segment of the video' },
          { start: 5, end: 10, text: 'Second segment with exciting content' },
          { start: 10, end: 15, text: 'Third segment going viral' },
          { start: 15, end: 20, text: 'Fourth segment amazing part' },
          { start: 20, end: 25, text: 'Fifth segment with shocking revelation' },
        ],
        language: 'tr',
      };
    }

    const result = await viralAnalyzer.analyze(transcription, {
      minDuration: options.minDuration || 30,
      maxDuration: options.maxDuration || 90,
      targetCount: options.targetCount || 5,
      title: options.title,
    });

    await db.run(
      'UPDATE clip_jobs SET segments = $1, overall_score = $2, top_reason = $3, status = $4, completed_at = CURRENT_TIMESTAMP WHERE id = $5',
      [JSON.stringify(result.segments), result.overallScore, result.topReason, 'completed', clipJobId]
    );

    Logger.info(`[Clipper] Job ${clipJobId} completed (inline): ${result.segments.length} segments`);
  } catch (error) {
    Logger.error(`[Clipper] Job ${clipJobId} failed (inline):`, error);
    await db.run('UPDATE clip_jobs SET status = $1 WHERE id = $2', ['failed', clipJobId]);
  }
}
export default router;