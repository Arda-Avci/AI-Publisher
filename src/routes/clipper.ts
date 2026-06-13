/**
 * Clipper API Routes
 * Autonomous video clipping and short-form content extraction
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import { viralAnalyzer, videoClipper, ClipSegment, ClipJob } from '../services/clipper/index.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs-extra';

const router = Router();

// In-memory clip job storage
const clipJobs: Map<string, ClipJob> = new Map();

/**
 * POST /api/v1/clipper/extract
 * Extract viral segments from a video
 */
router.post('/extract', requireAuth, async (req, res) => {
  try {
    const { videoPath, videoId, minDuration, maxDuration, targetCount } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    // Check if video exists
    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    const jobId = uuidv4();
    const job: ClipJob = {
      id: jobId,
      videoId: videoId || 0,
      userId: req.session.userId!,
      sourceVideoPath: videoPath,
      segments: [],
      status: 'processing',
      createdAt: new Date(),
    };

    clipJobs.set(jobId, job);
    Logger.info(`[Clipper] Starting extraction job ${jobId} for ${videoPath}`);

    // Start async processing
    processExtraction(jobId, videoPath, { minDuration, maxDuration, targetCount });

    res.status(201).json({ jobId, status: 'processing' });
  } catch (error) {
    Logger.error('[Clipper] Extraction failed:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

/**
 * GET /api/v1/clipper/list
 * List all clips for current user
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const userJobs = Array.from(clipJobs.values())
      .filter(job => job.userId === req.session.userId)
      .map(job => ({
        id: job.id,
        videoId: job.videoId,
        segments: job.segments.map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.duration,
          score: s.score,
        })),
        status: job.status,
        createdAt: job.createdAt,
      }));

    res.json({ clips: userJobs });
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
    const jobId = req.params.id as string;
    const job = clipJobs.get(jobId);
    if (!job || job.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    res.json({ clip: job });
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
    const jobId = req.params.id as string;
    const job = clipJobs.get(jobId);
    if (!job || job.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Clip extraction not completed' });
    }

    const {
      segmentIds,
      aspectRatio = '9:16',
      addSubtitles = true,
      addMusic = false,
      musicPath,
    } = req.body;

    const outputDir = path.join(process.cwd(), 'videolar', `clip_${job.id}`);
    await fs.ensureDir(outputDir);

    const selectedSegments = segmentIds
      ? job.segments.filter(s => segmentIds.includes(s.id))
      : job.segments;

    const outputPaths: string[] = [];

    for (const segment of selectedSegments) {
      const outputPath = path.join(outputDir, `clip_${segment.id}.mp4`);

      try {
        // Crop segment to target aspect ratio
        const croppedPath = await videoClipper.cropSegment(
          job.sourceVideoPath,
          outputPath,
          segment,
          { aspectRatio }
        );

        // Add subtitles if requested
        if (addSubtitles) {
          const withSubsPath = outputPath.replace('.mp4', '_subs.mp4');
          await videoClipper.generateSubtitles(croppedPath, withSubsPath, [
            { start: 0, end: segment.duration, text: segment.suggestedCaption || '' },
          ]);
        }

        // Add music if requested
        if (addMusic && musicPath) {
          const withMusicPath = outputPath.replace('.mp4', '_music.mp4');
          await videoClipper.mixMusic(outputPath, musicPath, withMusicPath);
        }

        outputPaths.push(croppedPath);
      } catch (err) {
        Logger.error(`[Clipper] Failed to export segment ${segment.id}:`, err);
      }
    }

    job.outputPaths = outputPaths;
    res.json({ jobId: job.id, outputPaths });
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
 * Process video extraction asynchronously
 */
async function processExtraction(
  jobId: string,
  videoPath: string,
  options: {
    minDuration?: number;
    maxDuration?: number;
    targetCount?: number;
  }
): Promise<void> {
  const job = clipJobs.get(jobId);
  if (!job) return;

  try {
    // For now, simulate transcription
    // In real implementation, use Whisper or similar
    const mockTranscription = generateMockTranscription();

    const result = await viralAnalyzer.analyze(mockTranscription, {
      minDuration: options.minDuration || 30,
      maxDuration: options.maxDuration || 90,
      targetCount: options.targetCount || 5,
    });

    job.segments = result.segments;
    job.status = 'completed';
    job.completedAt = new Date();

    Logger.info(`[Clipper] Job ${jobId} completed: ${result.segments.length} segments found`);
  } catch (error) {
    Logger.error(`[Clipper] Job ${jobId} failed:`, error);
    job.status = 'failed';
  }
}

/**
 * Generate mock transcription (placeholder for Whisper integration)
 */
function generateMockTranscription() {
  const segments = [
    { start: 0, end: 45, text: 'Hey everyone, welcome back to my channel!' },
    { start: 45, end: 90, text: "Today I'm going to show you something amazing that will blow your mind!" },
    { start: 90, end: 135, text: "This is honestly the best thing I've ever seen. You won't believe it!" },
    { start: 135, end: 180, text: 'Let me explain step by step how this works.' },
    { start: 180, end: 225, text: 'Number one: always start with the basics.' },
    { start: 225, end: 270, text: 'Number two: practice makes perfect.' },
    { start: 270, end: 315, text: 'And finally, number three: never give up!' },
    { start: 315, end: 360, text: "If you enjoyed this video, don't forget to like and subscribe!" },
  ];

  return {
    text: segments.map(s => s.text).join(' '),
    segments,
    language: 'en',
  };
}

export default router;