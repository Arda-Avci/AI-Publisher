/**
 * Smart Auto-Reframe Service
 *
 * Converts horizontal 16:9 videos to vertical 9:16 format using face/object tracking.
 * Supports two tracking modes:
 * - `face`: Detects and tracks faces using OpenCV Haar cascades
 * - `center`: Centers the crop on the video center (static crop)
 *
 * Output is always 1080x1920 (9:16 portrait).
 *
 * @module services/autoReframe
 */

import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';
import type { FFmpegCommand } from './videoService.js';

const __dirnameStr = __dirname;

/**
 * Tracking mode for auto-reframing.
 */
export type TrackingMode = 'face' | 'center';

/**
 * Auto-reframe options.
 */
export interface AutoReframeOptions {
  /** Tracking mode: 'face' or 'center' (default: 'face') */
  trackingMode?: TrackingMode;
  /** Target output height in pixels (default: 1920) */
  targetHeight?: number;
  /** Target output width in pixels (default: 1080) */
  targetWidth?: number;
  /** Face tracking confidence threshold 0-1 (default: 0.5) */
  faceConfidence?: number;
}

/**
 * Detects faces in a video frame and returns bounding boxes.
 *
 * @param framePath - Path to a frame image
 * @param minConfidence - Minimum confidence for detection
 * @returns Array of {x, y, w, h} face bounding boxes
 */
async function detectFacesInFrame(
  framePath: string,
  minConfidence = 0.5,
): Promise<Array<{ x: number; y: number; w: number; h: number }>> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirnameStr, '..', 'workers', 'face-track-worker.js');
    const hasWorker = fs.existsSync(workerPath);

    if (!hasWorker) {
      // Fallback: no face detection possible
      resolve([]);
      return;
    }

    const worker = new Worker(workerPath, {
      workerData: { framePath, minConfidence },
    });

    let settled = false;
    worker.on('message', (msg: any) => {
      settled = true;
      worker.terminate().catch(() => {});
      resolve(msg.faces || []);
    });
    worker.on('error', (err) => {
      if (!settled) {
        settled = true;
        worker.terminate().catch(() => {});
        Logger.warn('[autoReframe] Face detection worker error:', err);
        resolve([]);
      }
    });
    worker.on('exit', (code) => {
      if (!settled) {
        settled = true;
        if (code !== 0) {
          Logger.warn(`[autoReframe] Face detection worker exited with code ${code}`);
        }
        resolve([]);
      }
    });

    // 30s timeout for face detection
    setTimeout(() => {
      if (!settled) {
        settled = true;
        worker.terminate().catch(() => {});
        Logger.warn('[autoReframe] Face detection worker timeout');
        resolve([]);
      }
    }, 30000);
  });
}

/**
 * Extracts a center crop region from a frame at 9:16 aspect ratio.
 *
 * @param framePath - Path to source frame
 * @param outPath   - Path to write cropped frame
 * @param targetW   - Output width (1080)
 * @param targetH   - Output height (1920)
 */
async function extractCenterCrop(
  framePath: string,
  outPath: string,
  targetW: number,
  targetH: number,
): Promise<void> {
  const { runFFmpegWithFallback } = await import('./videoService.js');

  // Use ffmpeg crop to extract center 9:16 region
  // Calculate crop based on source frame dimensions
  const cmd: FFmpegCommand = {
    cmd: 'ffmpeg',
    args: [
      '-y',
      '-i',
      framePath,
      '-vf',
      `crop=min(${targetW},iw):min(${targetH},ih):(iw-min(${targetW},iw))/2:(ih-min(${targetH},ih))/2`,
      '-frames:v',
      '1',
      outPath,
    ],
    timeoutMs: 30000,
  };

  await runFFmpegWithFallback([cmd]);
}

/**
 * Converts a horizontal 16:9 video to vertical 9:16 using smart face/object tracking.
 *
 * Process:
 * 1. Extract reference frame from video
 * 2. Detect faces in the frame (face mode) or use center point (center mode)
 * 3. Build FFmpeg crop filter based on detected region
 * 4. Apply crop + scale + blur background for pillarbox
 *
 * @param videoPath        - Absolute path to input 16:9 video
 * @param outputPath       - Absolute path for output 9:16 video
 * @param trackingMode     - 'face' (detect and follow faces) or 'center' (static center crop)
 * @param options          - Additional options
 */
export async function autoReframeHorizontalToVertical(
  videoPath: string,
  outputPath: string,
  trackingMode: TrackingMode = 'face',
  options: AutoReframeOptions = {},
): Promise<string> {
  const opts: AutoReframeOptions = {
    trackingMode,
    targetHeight: 1920,
    targetWidth: 1080,
    faceConfidence: 0.5,
    ...options,
  };

  Logger.info('[autoReframe] Starting auto-reframe', {
    videoPath,
    outputPath,
    trackingMode: opts.trackingMode,
  });

  const targetW = opts.targetWidth!;
  const targetH = opts.targetHeight!;

  // Get source video dimensions
  const { runFFmpeg } = await import('./videoService.js');
  const { stdout: dims } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=s=x:p=0',
    videoPath,
  ]);

  const dimsParts = dims.trim().split('x').map(Number);
  const srcW = dimsParts[0] ?? 1920;
  const srcH = dimsParts[1] ?? 1080;
  const srcAspect = srcW / srcH;

  // Source is 16:9 horizontal — crop region center
  let cropX = 0;
  let cropY = 0;
  let cropW = srcW;
  let cropH = srcH;

  if (trackingMode === 'face') {
    // Extract a frame for face detection
    const { execFile } = require('child_process');
    const frameDir = path.join(process.cwd(), 'videolar');
    await fs.ensureDir(frameDir);
    const tempFrame = path.join(frameDir, `autoreframe_temp_${Date.now()}.png`);

    await new Promise<void>((res, rej) => {
      execFile(
        'ffmpeg',
        ['-y', '-i', videoPath, '-ss', '00:00:01', '-frames:v', '1', tempFrame],
        (err: any) => {
          if (err) rej(err);
          else res();
        },
      );
    });

    try {
      const faces = await detectFacesInFrame(tempFrame, opts.faceConfidence);
      if (faces.length > 0) {
        // Use the largest detected face
        const largest = faces.reduce((a, b) => (a.w * a.h > b.w * b.h ? a : b));
        const faceCenterX = largest.x + largest.w / 2;
        const faceCenterY = largest.y + largest.h / 2;

        // Convert face center (normalized 0-1) to pixel coordinates
        const facePxX = faceCenterX * srcW;
        const facePxY = faceCenterY * srcH;

        // Calculate crop window centered on face
        const cropAspect = targetW / targetH;
        cropH = srcH;
        cropW = Math.round(srcH * cropAspect);

        // Clamp so crop stays within frame
        cropX = Math.max(0, Math.min(srcW - cropW, Math.round(facePxX - cropW / 2)));
        cropY = 0;

        Logger.info('[autoReframe] Face detected, crop region calculated', {
          faceCenterX,
          faceCenterY,
          cropX,
          cropY,
          cropW,
          cropH,
        });
      } else {
        Logger.info('[autoReframe] No face detected, using center crop');
        cropX = Math.max(0, Math.round((srcW - cropW) / 2));
        cropY = 0;
      }
    } finally {
      await fs.remove(tempFrame).catch(() => {});
    }
  } else {
    // Center mode: crop from center
    cropX = Math.max(0, Math.round((srcW - cropW) / 2));
    cropY = 0;
  }

  // Build FFmpeg filter: crop + scale + blur background
  // The crop extracts the 9:16 region
  // The overlay puts the cropped content over a blurred version of the full frame
  const filter = [
    `[0:v]split[orig][bg]`,
    `[bg]scale=${targetW}:${targetH},boxblur=40[blurred]`,
    `[orig]crop=${cropW}:${cropH}:${cropX}:${cropY},scale=${targetW}:${targetH}[scaled]`,
    `[blurred][scaled]overlay=(W-w)/2:(H-h)/2[outv]`,
  ].join(';');

  const args = [
    '-y',
    '-i',
    videoPath,
    '-filter_complex',
    filter,
    '-map',
    '[outv]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'copy',
    outputPath,
  ];

  const { runFFmpegWithFallback } = await import('./videoService.js');
  const cmd: FFmpegCommand = { cmd: 'ffmpeg', args, timeoutMs: 300000 };

  try {
    await runFFmpegWithFallback([cmd]);
    Logger.info('[autoReframe] Auto-reframe completed', { outputPath });
  } catch (err: any) {
    Logger.error('[autoReframe] Auto-reframe failed', err);
    throw err;
  }

  return outputPath;
}

/**
 * Face tracking result for a single frame.
 */
interface FaceTrackResult {
  time: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Detects faces across the video and reframes to 9:16 keeping the primary
 * face centered using OpenCV cascade detection + FFmpeg crop.
 *
 * @param videoPath  - Absolute path to input 16:9 video
 * @param outputPath - Absolute path for output 9:16 video
 * @returns Path to the reframed video
 */
export async function trackFaceAndReframe(videoPath: string, outputPath: string): Promise<string> {
  Logger.info('[autoReframe] trackFaceAndReframe starting', { videoPath, outputPath });

  const { runFFmpeg } = await import('./videoService.js');

  // 1. Get video duration and dimensions
  const { stdout: dims } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=s=x:p=0',
    videoPath,
  ]);
  const dimsParts = dims.trim().split('x').map(Number);
  const srcW = dimsParts[0] ?? 1920;
  const srcH = dimsParts[1] ?? 1080;
  const cropAspect = 9 / 16;
  const cropH = srcH;
  const cropW = Math.round(srcH * cropAspect);

  // 2. Extract all frames and detect faces per frame using a temporary worker
  const { execFile: exec } = require('child_process') as typeof import('child_process');
  const frameDir = path.join(process.cwd(), 'videolar', `face_track_${Date.now()}`);
  await fs.ensureDir(frameDir);

  try {
    // Extract frames at 1fps for face detection
    await new Promise<void>((res, rej) => {
      exec(
        'ffmpeg',
        ['-y', '-i', videoPath, '-vf', `fps=1`, `${frameDir}/frame_%04d.png`],
        (err: any) => {
          if (err) rej(err);
          else res();
        },
      );
    });

    const frames = await fs.readdir(frameDir);
    const faceTrack: FaceTrackResult[] = [];

    for (const frameFile of frames.sort()) {
      const framePath = path.join(frameDir, frameFile);
      const faces = await detectFacesInFrame(framePath, 0.5);
      if (faces.length > 0) {
        const largest = faces.reduce((a, b) => (a.w * a.h > b.w * b.h ? a : b));
        const time = parseInt(frameFile.replace('frame_', '').replace('.png', ''));
        faceTrack.push({ time, x: largest.x, y: largest.y, w: largest.w, h: largest.h });
      }
    }

    if (faceTrack.length === 0) {
      Logger.warn('[autoReframe] No faces detected, using center crop');
      const cx = Math.max(0, Math.round((srcW - cropW) / 2));
      const filter = [
        `[0:v]split[orig][bg]`,
        `[bg]scale=1080:1920,boxblur=40[blurred]`,
        `[orig]crop=${cropW}:${cropH}:${cx}:0,scale=1080:1920[scaled]`,
        `[blurred][scaled]overlay=(W-w)/2:(H-h)/2[outv]`,
      ].join(';');

      const { runFFmpegWithFallback } = await import('./videoService.js');
      await runFFmpegWithFallback([
        {
          cmd: 'ffmpeg',
          args: [
            '-y',
            '-i',
            videoPath,
            '-filter_complex',
            filter,
            '-map',
            '[outv]',
            '-map',
            '0:a?',
            '-c:v',
            'libx264',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'copy',
            outputPath,
          ],
          timeoutMs: 300000,
        },
      ]);
      return outputPath;
    }

    // 3. Build weighted average face position for stable crop center
    const avgX =
      faceTrack.reduce((s, f) => s + f.x * f.w * f.h, 0) /
      faceTrack.reduce((s, f) => s + f.w * f.h, 0);
    const avgY =
      faceTrack.reduce((s, f) => s + f.y * f.w * f.h, 0) /
      faceTrack.reduce((s, f) => s + f.w * f.h, 0);
    const facePxX = avgX * srcW;
    const facePxY = avgY * srcH;

    const cropX = Math.max(0, Math.min(srcW - cropW, Math.round(facePxX - cropW / 2)));
    const cropY = 0;

    Logger.info('[autoReframe] Calculated crop region', {
      cropX,
      cropY,
      cropW,
      cropH,
      facePxX,
      facePxY,
    });

    // 4. Apply FFmpeg crop with blurred background overlay
    const filter = [
      `[0:v]split[orig][bg]`,
      `[bg]scale=1080:1920,boxblur=40[blurred]`,
      `[orig]crop=${cropW}:${cropH}:${cropX}:${cropY},scale=1080:1920[scaled]`,
      `[blurred][scaled]overlay=(W-w)/2:(H-h)/2[outv]`,
    ].join(';');

    const { runFFmpegWithFallback } = await import('./videoService.js');
    await runFFmpegWithFallback([
      {
        cmd: 'ffmpeg',
        args: [
          '-y',
          '-i',
          videoPath,
          '-filter_complex',
          filter,
          '-map',
          '[outv]',
          '-map',
          '0:a?',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'copy',
          outputPath,
        ],
        timeoutMs: 300000,
      },
    ]);

    Logger.info('[autoReframe] trackFaceAndReframe completed', { outputPath });
    return outputPath;
  } finally {
    await fs.remove(frameDir).catch(() => {});
  }
}
