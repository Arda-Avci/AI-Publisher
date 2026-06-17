/**
 * Viral Optimization Routes
 *
 * API endpoints for viral hook analysis, B-Roll generation, and emotion captions.
 *
 * @module routes/viral
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';
import {
  analyzeHookQuality,
  generateViralTitles,
  generateHashtags,
  optimizeForViral,
} from '../services/viralHook.js';
import { generateBroll, insertBroll, BrollClip } from '../services/aiBroll.js';
import {
  detectEmotionPeaks,
  generateHighlightSrt,
  formatHighlightSrt,
  applyEmotionCaptionStyle,
} from '../services/emotionCaptions.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── /api/v1/viral/hook ───────────────────────────────────────────────────────

/**
 * POST /api/v1/viral/hook
 * Analyze hook quality of a video
 */
router.post('/hook', requireAuth, async (req, res) => {
  try {
    const { video_path, platform } = req.body;

    if (!video_path) {
      res.status(400).json({ error: 'video_path is required' });
      return;
    }

    const videoAbsPath = path.isAbsolute(video_path)
      ? video_path
      : path.join(process.cwd(), video_path);

    if (!(await fs.pathExists(videoAbsPath))) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const validPlatforms = ['youtube', 'tiktok', 'x', 'meta', 'all'] as const;
    const targetPlatform = validPlatforms.includes(platform) ? platform : 'youtube';

    const result = await analyzeHookQuality(videoAbsPath);

    // Per-platform scoring: adjust the AI's score based on platform-specific factors
    const platformScores =
      targetPlatform === 'all'
        ? {
            youtube: Math.round(result.score * 1.0),
            tiktok: Math.round(result.score * 1.1), // TikTok rewards hook-heavy content
            x: Math.round(result.score * 0.85), // X needs punchier hooks
            meta: Math.round(result.score * 0.95), // Meta in between
          }
        : { [targetPlatform as string]: result.score };

    res.json({
      success: true,
      data: result,
      platform_scores: platformScores,
    });
  } catch (err: any) {
    Logger.error('[viral] Hook analysis error', err);
    res.status(500).json({ error: err.message || 'Hook analysis failed' });
  }
});

// ── /api/v1/viral/titles ─────────────────────────────────────────────────────

/**
 * POST /api/v1/viral/titles
 * Generate viral titles for a topic
 */
router.post('/titles', requireAuth, async (req, res) => {
  try {
    const { topic, count } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }

    const result = await generateViralTitles(topic, count || 5);

    res.json({
      success: true,
      data: result.titles,
    });
  } catch (err: any) {
    Logger.error('[viral] Title generation error', err);
    res.status(500).json({ error: err.message || 'Title generation failed' });
  }
});

// ── /api/v1/viral/hashtags ───────────────────────────────────────────────────

/**
 * POST /api/v1/viral/hashtags
 * Generate hashtags for content and platform
 */
router.post('/hashtags', requireAuth, async (req, res) => {
  try {
    const { content, platform } = req.body;

    if (!content) {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const validPlatforms = ['youtube', 'tiktok', 'x', 'meta'];
    const targetPlatform = validPlatforms.includes(platform) ? platform : 'youtube';

    const result = await generateHashtags(content, targetPlatform);

    res.json({
      success: true,
      data: result.hashtags,
    });
  } catch (err: any) {
    Logger.error('[viral] Hashtag generation error', err);
    res.status(500).json({ error: err.message || 'Hashtag generation failed' });
  }
});

// ── /api/v1/viral/optimize ───────────────────────────────────────────────────

/**
 * POST /api/v1/viral/optimize
 * Full viral optimization (hook + titles + hashtags)
 */
router.post('/optimize', requireAuth, async (req, res) => {
  try {
    const { video_path, topic, platform } = req.body;

    if (!video_path || !topic) {
      res.status(400).json({ error: 'video_path and topic are required' });
      return;
    }

    const videoAbsPath = path.isAbsolute(video_path)
      ? video_path
      : path.join(process.cwd(), video_path);

    if (!(await fs.pathExists(videoAbsPath))) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const validPlatforms = ['youtube', 'tiktok', 'x', 'meta'];
    const targetPlatform = validPlatforms.includes(platform) ? platform : 'youtube';

    const result = await optimizeForViral(videoAbsPath, topic, targetPlatform);

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    Logger.error('[viral] Viral optimization error', err);
    res.status(500).json({ error: err.message || 'Viral optimization failed' });
  }
});

// ── /api/v1/viral/broll ──────────────────────────────────────────────────────

/**
 * POST /api/v1/viral/broll
 * Generate and/or insert B-Roll clips
 */
router.post('/broll', requireAuth, async (req, res) => {
  try {
    const { main_video, clips, insert } = req.body;

    if (!main_video) {
      res.status(400).json({ error: 'main_video is required' });
      return;
    }

    const mainVideoAbs = path.isAbsolute(main_video)
      ? main_video
      : path.join(process.cwd(), main_video);

    if (!(await fs.pathExists(mainVideoAbs))) {
      res.status(404).json({ error: 'Main video file not found' });
      return;
    }

    // Generate B-Roll clips
    if (clips && Array.isArray(clips) && clips.length > 0) {
      const generatedClips: BrollClip[] = [];

      for (const clip of clips) {
        const { keywords, duration, insert_at } = clip;

        if (!keywords || !duration) continue;

        const brollDir = path.join(process.cwd(), 'videolar');
        await fs.ensureDir(brollDir);

        const outputPath = path.join(
          brollDir,
          `broll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`,
        );

        const genResult = await generateBroll(keywords, duration, outputPath);

        if (genResult.success) {
          generatedClips.push({
            keywords,
            duration,
            outputPath: genResult.outputPath,
            insertAtSeconds: insert_at || 0,
          });
        }
      }

      // Insert B-Rolls into main video if insert flag is true
      if (insert && generatedClips.length > 0) {
        const outputPath = mainVideoAbs.replace('.mp4', '_with_broll.mp4');
        await insertBroll(mainVideoAbs, generatedClips, outputPath);

        res.json({
          success: true,
          data: {
            generated_count: generatedClips.length,
            output_path: outputPath,
            clips: generatedClips.map((c) => ({
              keywords: c.keywords,
              duration: c.duration,
              insert_at: c.insertAtSeconds,
            })),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          generated_count: generatedClips.length,
          clips: generatedClips.map((c) => ({
            keywords: c.keywords,
            duration: c.duration,
            output_path: c.outputPath,
            insert_at: c.insertAtSeconds,
          })),
        },
      });
      return;
    }

    res
      .status(400)
      .json({ error: 'clips array is required with keywords, duration, and insert_at' });
  } catch (err: any) {
    Logger.error('[viral] B-Roll error', err);
    res.status(500).json({ error: err.message || 'B-Roll generation/insertion failed' });
  }
});

// ── /api/v1/viral/emotion ────────────────────────────────────────────────────

/**
 * POST /api/v1/viral/emotion
 * Detect emotion peaks and generate highlight subtitles
 */
router.post('/emotion', requireAuth, async (req, res) => {
  try {
    const { audio_path, transcript, video_path, apply_to_video } = req.body;

    if (!audio_path && !video_path) {
      res.status(400).json({ error: 'audio_path or video_path is required' });
      return;
    }

    // Use audio if provided, otherwise extract from video
    let audioAbsPath: string | null = null;

    if (audio_path) {
      audioAbsPath = path.isAbsolute(audio_path)
        ? audio_path
        : path.join(process.cwd(), audio_path);

      if (!audioAbsPath || !(await fs.pathExists(audioAbsPath))) {
        res.status(404).json({ error: 'Audio file not found' });
        return;
      }
    } else if (video_path) {
      const videoAbsPath = path.isAbsolute(video_path)
        ? video_path
        : path.join(process.cwd(), video_path);

      if (!(await fs.pathExists(videoAbsPath))) {
        res.status(404).json({ error: 'Video file not found' });
        return;
      }

      // Extract audio from video
      const audioDir = path.join(process.cwd(), 'videolar');
      await fs.ensureDir(audioDir);
      audioAbsPath = path.join(audioDir, `emotion_audio_${Date.now()}.wav`);

      const { runFFmpeg } = await import('../services/videoService.js');
      await runFFmpeg('ffmpeg', [
        '-y',
        '-i',
        videoAbsPath,
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ar',
        '16000',
        '-ac',
        '1',
        audioAbsPath,
      ]);
    }

    // Detect emotion peaks
    const detection = await detectEmotionPeaks(audioAbsPath!);

    if (!transcript) {
      res.json({
        success: true,
        data: {
          peak_count: detection.peaks.length,
          duration: detection.durationSeconds,
          peaks: detection.peaks,
        },
      });
      return;
    }

    // Generate styled SRT
    const entries = generateHighlightSrt(transcript, detection.peaks);
    const srtContent = formatHighlightSrt(entries, 0, 2.5);

    const srtDir = path.join(process.cwd(), 'videolar');
    await fs.ensureDir(srtDir);
    const srtPath = path.join(srtDir, `emotion_${Date.now()}.srt`);
    await fs.writeFile(srtPath, srtContent, 'utf-8');

    // Apply to video if requested
    if (apply_to_video && video_path) {
      const videoAbsPath = path.isAbsolute(video_path)
        ? video_path
        : path.join(process.cwd(), video_path);

      const outputPath = videoAbsPath.replace('.mp4', '_emotion.mp4');
      await applyEmotionCaptionStyle(videoAbsPath, srtPath, outputPath);

      res.json({
        success: true,
        data: {
          srt_path: srtPath,
          output_path: outputPath,
          peak_count: detection.peaks.length,
          duration: detection.durationSeconds,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        srt_path: srtPath,
        peak_count: detection.peaks.length,
        duration: detection.durationSeconds,
      },
    });
  } catch (err: any) {
    Logger.error('[viral] Emotion captions error', err);
    res.status(500).json({ error: err.message || 'Emotion caption processing failed' });
  }
});

// ── /api/v1/viral/batch-marketing ─────────────────────────────────────────────

/**
 * POST /api/v1/viral/batch-marketing
 * Generate titles + hashtags for all platforms in one call
 */
router.post('/batch-marketing', requireAuth, async (req, res) => {
  try {
    const { topic, content } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }

    const platforms: Array<'youtube' | 'tiktok' | 'x' | 'meta'> = [
      'youtube',
      'tiktok',
      'x',
      'meta',
    ];
    const [titleResult, ...hashtagResults] = await Promise.all([
      generateViralTitles(topic, 3),
      ...platforms.map((p: any) => generateHashtags(content || topic, p)),
    ]);

    const results: Record<string, any> = {};
    platforms.forEach((p, i) => {
      results[p] = {
        titles: (titleResult as any)?.titles?.slice(0, 2) || [],
        hashtags: (hashtagResults[i] as any)?.hashtags || [],
      };
    });

    res.json({ success: true, data: results });
  } catch (err: any) {
    Logger.error('[viral] Batch marketing error', err);
    res.status(500).json({ error: err.message || 'Batch marketing failed' });
  }
});

export default router;
