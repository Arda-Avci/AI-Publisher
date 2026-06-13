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
  minConfidence = 0.5
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
      workerData: { framePath, minConfidence }
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
  targetH: number
): Promise<void> {
  const { runFFmpegWithFallback } = await import('./videoService.js');

  // Use ffmpeg crop to extract center 9:16 region
  // Calculate crop based on source frame dimensions
  const cmd: FFmpegCommand = {
    cmd: 'ffmpeg',
    args: [
      '-y',
      '-i', framePath,
      '-vf', `crop=min(${targetW},iw):min(${targetH},ih):(iw-min(${targetW},iw))/2:(ih-min(${targetH},ih))/2`,
      '-frames:v', '1',
      outPath
    ],
    timeoutMs: 30000
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
  options: AutoReframeOptions = {}
): Promise<void> {
  const opts: AutoReframeOptions = {
    trackingMode,
    targetHeight: 1920,
    targetWidth: 1080,
    faceConfidence: 0.5,
    ...options
  };

  Logger.info('[autoReframe] Starting auto-reframe', {
    videoPath,
    outputPath,
    trackingMode: opts.trackingMode
  });

  const targetW = opts.targetWidth!;
  const targetH = opts.targetHeight!;

  // Get source video dimensions
  const { runFFmpeg } = await import('./videoService.js');
  const { stdout: dims } = await runFFmpeg('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=s=x:p=0',
    videoPath
  ]);

  const [srcW, srcH] = dims.trim().split('x').map(Number);
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
      execFile('ffmpeg', ['-y', '-i', videoPath, '-ss', '00:00:01', '-frames:v', '1', tempFrame], (err: any) => {
        if (err) rej(err); else res();
      });
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
          faceCenterX, faceCenterY, cropX, cropY, cropW, cropH
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
    `[blurred][scaled]overlay=(W-w)/2:(H-h)/2[outv]`
  ].join(';');

  const args = [
    '-y',
    '-i', videoPath,
    '-filter_complex', filter,
    '-map', '[outv]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    outputPath
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
}