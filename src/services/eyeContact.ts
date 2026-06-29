/**
 * Eye Contact Correction Service
 *
 * Uses face-api (TensorFlow.js) + sharp to detect faces and enhance
 * the eye region (sharpening, contrast) for improved visual gaze perception.
 * Falls back to returning the original video path on error.
 *
 * @module services/eyeContact
 */

import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';
import { runFFmpeg } from './videoService.js';

/**
 * Input options for eye contact correction.
 */
export interface EyeContactOptions {
  /** Video file path to process */
  videoPath: string;
  /** Output path for the corrected video */
  outputPath: string;
  /** Enable smooth transition blend (default: true) */
  smoothTransition?: boolean;
}

/**
 * Result of eye contact correction.
 */
export interface EyeContactResult {
  /** Path to the processed video (original path on fallback) */
  processedVideoPath: string;
  /** Whether fallback was used */
  usedFallback: boolean;
  /** Error message if any */
  error?: string;
}

/** Max frames processed via face-api (performance cap). */
const MAX_FRAMES = 200;

/** Eye region padding (fraction of eye-box dimension). */
const EYE_PADDING = 0.5;

/*
 * Monkeypatch globalThis.fetch so face-api can load TF model files
 * from local filesystem (Node 24's undici rejects file:// URLs).
 */
(function patchFetchForFaceApi(): void {
  if ((globalThis as any).__eyeContactPatched) return;
  const origFetch = globalThis.fetch.bind(globalThis);
  (globalThis as any).__eyeContactPatched = true;
  globalThis.fetch = async function patchedFetch(
    url: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    if (
      typeof url === 'string' &&
      !url.startsWith('http://') &&
      !url.startsWith('https://') &&
      !url.startsWith('data:')
    ) {
      const nodeFs = require('fs') as typeof import('fs');
      const nodePath = require('path') as typeof import('path');
      let filePath: string = url;
      if (filePath.startsWith('file:///')) filePath = filePath.slice(8);
      filePath = filePath.replace(/\//g, nodePath.sep);
      const buf = nodeFs.readFileSync(filePath);
      const ext = nodePath.extname(filePath).toLowerCase();
      const mime = ext === '.json' ? 'application/json' : 'application/octet-stream';
      return new Response(buf, { status: 200, headers: { 'Content-Type': mime } });
    }
    return origFetch(url, init);
  };
})();

// ---- Lazy dependency state ------------------------------------------------
let sharpMod: any = null;
let tfCore: any = null;
let faceapiMod: any = null;
let modelsLoaded = false;

async function ensureDeps(): Promise<{
  sharp: any;
  tf: any;
  faceapi: any;
}> {
  if (!sharpMod) {
    sharpMod = (await import('sharp')).default;
  }
  if (!tfCore) {
    tfCore = require('@tensorflow/tfjs-core');
    require('@tensorflow/tfjs-backend-cpu');
    await tfCore.setBackend('cpu');
    await tfCore.ready();
  }
  if (!modelsLoaded) {
    faceapiMod = require('@vladmandic/face-api');
    const modelsPath = path.join(
      process.cwd(),
      'node_modules',
      '@vladmandic',
      'face-api',
      'model',
    );
    await faceapiMod.loadSsdMobilenetv1Model(modelsPath);
    await faceapiMod.loadFaceLandmarkModel(modelsPath);
    modelsLoaded = true;
  }
  return { sharp: sharpMod, tf: tfCore, faceapi: faceapiMod };
}

// ---- Helper: enhance a single frame's eye region --------------------------

interface EyeBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function getEyeBoundingBox(
  leftEye: { x: number; y: number }[],
  rightEye: { x: number; y: number }[],
  frameWidth: number,
  frameHeight: number,
): EyeBox | null {
  const all = [...leftEye, ...rightEye];
  if (all.length === 0) return null;

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  let minX = Math.min(...xs);
  let minY = Math.min(...ys);
  let maxX = Math.max(...xs);
  let maxY = Math.max(...ys);

  const eyeW = maxX - minX;
  const eyeH = maxY - minY;
  const padX = eyeW * EYE_PADDING;
  const padY = eyeH * EYE_PADDING;

  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(frameWidth - 1, maxX + padX);
  maxY = Math.min(frameHeight - 1, maxY + padY);

  return {
    left: Math.round(minX),
    top: Math.round(minY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  };
}

function frameDataToTensor(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  tf: any,
): { tensor: any; width: number; height: number } {
  let pixelData: Buffer;
  let channels: number;

  if (info.channels === 4) {
    const rgb = Buffer.alloc(info.width * info.height * 3);
    for (let i = 0; i < info.width * info.height; i++) {
      const src = i * 4;
      const dst = i * 3;
      rgb[dst] = data[src] ?? 0;
      rgb[dst + 1] = data[src + 1] ?? 0;
      rgb[dst + 2] = data[src + 2] ?? 0;
    }
    pixelData = rgb;
    channels = 3;
  } else {
    pixelData = data;
    channels = info.channels ?? 3;
  }

  return {
    tensor: tf.tensor3d(pixelData, [info.height, info.width, channels], 'int32'),
    width: info.width,
    height: info.height,
  };
}

async function enhanceFrame(
  framePath: string,
  outputPath: string,
  sharp: any,
  faceapi: any,
  tf: any,
): Promise<boolean> {
  try {
    const { data, info } = await sharp(framePath)
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { tensor, width, height } = frameDataToTensor(data, info, tf);

    let detections;
    try {
      detections = await faceapi.detectAllFaces(tensor).withFaceLandmarks();
    } finally {
      tensor.dispose();
    }

    if (!detections || detections.length === 0) {
      await sharp(framePath).toFile(outputPath);
      return false;
    }

    const det = detections[0];
    const landmarks = det.landmarks;
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const box = getEyeBoundingBox(leftEye, rightEye, width, height);

    if (!box || box.width < 4 || box.height < 4) {
      await sharp(framePath).toFile(outputPath);
      return false;
    }

    const enhancedEyes = await sharp(framePath)
      .extract(box)
      .sharpen(0.8)
      .modulate({ brightness: 1.06, saturation: 1.08 })
      .toBuffer();

    await sharp(framePath)
      .composite([{ input: enhancedEyes, top: box.top, left: box.left }])
      .toFile(outputPath);
    return true;
  } catch (e: any) {
    Logger.debug('[eyeContact] Frame enhancement failed, using original', {
      frame: framePath,
      error: e.message,
    });
    await sharp(framePath).toFile(outputPath);
    return false;
  }
}

// ---- Main / fallback ------------------------------------------------------

/**
 * Corrects eye contact in a video using local face-api + sharp processing.
 *
 * @param videoPath - Absolute path to the input video
 * @param outputPath - Absolute path for the output video
 * @returns Result with processed path or fallback
 */
export async function correctEyeContact(
  videoPath: string,
  outputPath: string,
): Promise<EyeContactResult> {
  if (!(await fs.pathExists(videoPath))) {
    return {
      processedVideoPath: videoPath,
      usedFallback: true,
      error: 'Input video does not exist',
    };
  }

  const tmpDir = path.join(os.tmpdir(), `eyecontact_${Date.now()}`);
  await fs.ensureDir(tmpDir);

  try {
    // 1. Lazy-load dependencies
    const { sharp, tf, faceapi } = await ensureDeps();

    // 2. Get video info
    const { stdout: fpsStr } = await runFFmpeg('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=r_frame_rate',
      '-of',
      'csv=p=0',
      videoPath,
    ]);
    const fpsMatch = fpsStr.trim().match(/^(\d+)(?:\/(\d+))?$/);
    let fps: number;
    if (fpsMatch) {
      const num = parseInt(fpsMatch[1]!, 10);
      const den = fpsMatch[2] ? parseInt(fpsMatch[2], 10) : 1;
      fps = num / (den || 1);
    } else {
      fps = 30;
    }

    const { stdout: durStr } = await runFFmpeg('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      videoPath,
    ]);
    const duration = parseFloat(durStr.trim());
    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Invalid video duration: ${durStr.trim()}`);
    }

    const totalFrames = Math.ceil(fps * duration);
    const step = Math.max(1, Math.ceil(totalFrames / MAX_FRAMES));
    Logger.info('[eyeContact] Processing', {
      fps,
      duration,
      totalFrames,
      step,
      maxProcess: Math.ceil(totalFrames / step),
    });

    // 3. Extract frames (select every Nth frame)
    const framesDir = path.join(tmpDir, 'frames');
    const enhancedDir = path.join(tmpDir, 'enhanced');
    await fs.ensureDir(framesDir);
    await fs.ensureDir(enhancedDir);

    // Build select filter: not(mod(n,step))
    const selectFilter = `select='not(mod(n,${step}))'`;

    // Include original audio track during extraction for timing
    const extractArgs: string[] = [
      '-y',
      '-i',
      videoPath,
      '-vf',
      selectFilter,
      '-vsync',
      'vfr',
      '-q:v',
      '2',
      '-frame_pts',
      '1',
      path.join(framesDir, '%06d.jpg'),
    ];

    const { stderr: extractErr } = await runFFmpeg('ffmpeg', extractArgs, 300000);
    if (extractErr && extractErr.includes('Error')) {
      Logger.warn('[eyeContact] Frame extraction warning', { extractErr });
    }

    // List extracted frames
    const frameFiles = (await fs.readdir(framesDir))
      .filter((f) => f.endsWith('.jpg'))
      .sort();

    if (frameFiles.length === 0) {
      throw new Error('No frames extracted from video');
    }

    Logger.info('[eyeContact] Extracted frames', { count: frameFiles.length });

    // 4. Process each frame
    let enhancedCount = 0;
    for (const frameFile of frameFiles) {
      const framePath = path.join(framesDir, frameFile);
      const outPath = path.join(enhancedDir, frameFile);
      const didEnhance = await enhanceFrame(framePath, outPath, sharp, faceapi, tf);
      if (didEnhance) enhancedCount++;
    }

    Logger.info('[eyeContact] Frame enhancement complete', {
      total: frameFiles.length,
      enhanced: enhancedCount,
    });

    // 5. Rebuild video from enhanced frames
    const tempVideo = path.join(tmpDir, 'temp_video.mp4');

    // Calculate effective framerate for the image sequence
    const effectiveFps = fps / step;

    const rebuildArgs: string[] = [
      '-y',
      '-framerate',
      effectiveFps.toString(),
      '-i',
      path.join(enhancedDir, '%06d.jpg'),
      '-filter:v',
      `setpts=PTS*${step}`,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      tempVideo,
    ];

    await runFFmpeg('ffmpeg', rebuildArgs, 300000);

    // 6. Copy audio from original
    await runFFmpeg('ffmpeg', [
      '-y',
      '-i',
      tempVideo,
      '-i',
      videoPath,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      outputPath,
    ]);

    // 7. Verify output exists
    if (!(await fs.pathExists(outputPath))) {
      throw new Error('Output video was not created');
    }

    Logger.info('[eyeContact] Eye contact correction succeeded', { outputPath });

    return {
      processedVideoPath: outputPath,
      usedFallback: false,
    };
  } catch (err: any) {
    Logger.warn('[eyeContact] Processing failed, using fallback', {
      error: err.message,
    });

    // Copy original to output as fallback
    if (videoPath !== outputPath) {
      await fs.copy(videoPath, outputPath);
    }

    return {
      processedVideoPath: outputPath,
      usedFallback: true,
      error: err.message,
    };
  } finally {
    // Cleanup temp dir (best-effort)
    try {
      await fs.remove(tmpDir);
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Convenience wrapper that copies input to output if fallback is used.
 * Ensures the caller always has a valid processed video at outputPath.
 */
export async function enhanceEyeContact(
  videoPath: string,
  outputPath: string,
): Promise<string> {
  const result = await correctEyeContact(videoPath, outputPath);

  if (result.usedFallback) {
    if (videoPath !== outputPath) {
      await fs.copy(videoPath, outputPath);
    }
    Logger.info('[eyeContact] Fallback: original video copied to output', {
      outputPath,
    });
  }

  return result.processedVideoPath;
}
