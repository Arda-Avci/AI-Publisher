/**
 * Smart Cropper Service
 * FFmpeg + OpenCV/DNN face-tracking crop to 9:16 vertical format
 *
 * @example
 * const result = await smartCropper.cropVideo(inputPath, outputPath, {
 *   targetFocus: 'face',
 *   aspectRatio: '9:16',
 *   outputWidth: 1080,
 *   outputHeight: 1920,
 * });
 */

import path from 'path';
import fs from 'fs-extra';
import { Worker } from 'worker_threads';
import { runInWorker, runFFmpeg, getVideoDuration } from '../videoService.js';
import { Logger } from '../../lib/logger.js';
import type {
  TargetFocus,
  CropAspectRatio,
  FaceBox,
  CropRegion,
  SmartCropOptions,
  SmartCropResult,
} from '../../types/clipper.js';
import type { PerFrameCropResult } from './perFrameCropper.js';

const __dirnameStr = __dirname;

// ── Aspect ratio helpers ───────────────────────────────────────────────────────

const ASPECT_RATIOS: Record<CropAspectRatio, number> = {
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '1:1': 1,
  '4:5': 4 / 5,
};

/**
 * Parse aspect ratio to numeric value
 */
function parseAspectRatio(ratio: CropAspectRatio | [number, number]): number {
  if (Array.isArray(ratio)) return ratio[0] / ratio[1];
  return ASPECT_RATIOS[ratio] ?? 9 / 16;
}

/**
 * Get output dimensions from aspect ratio and target height
 */
function getOutputDimensions(
  ratio: CropAspectRatio | [number, number],
  targetHeight = 1920
): [number, number] {
  const r = parseAspectRatio(ratio);
  return [Math.round(targetHeight * r), targetHeight];
}

// ── Face detection via OpenCV Haar Cascade (worker thread) ───────────────────

/**
 * Detect face bounding boxes in a video frame using OpenCV Haar Cascade.
 * Runs in a worker thread to avoid blocking the main thread.
 *
 * @param videoPath - Path to the video file
 * @param timestamp - Timestamp in seconds to extract frame for detection
 * @returns Detected face boxes with confidence scores
 */
export async function detectFaceBox(
  videoPath: string,
  timestamp: number
): Promise<FaceBox[]> {
  const workerPath = path.join(__dirnameStr, '..', 'workers', 'face-detect-worker.js');
  const hasWorker = await fs.pathExists(workerPath);

  if (hasWorker) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: { videoPath, timestamp },
      });
      let settled = false;
      worker.on('message', (msg: any) => {
        settled = true;
        worker.terminate().catch(() => {});
        resolve(msg.faceBoxes ?? []);
      });
      worker.on('error', (err) => {
        if (!settled) { settled = true; reject(err); }
      });
      worker.on('exit', (code) => {
        if (!settled) {
          if (code === 0) resolve([]);
          else reject(new Error(`Face detection worker exited with code ${code}`));
        }
      });
    });
  }

  // Fallback: extract frame and use Python/OpenCV subprocess
  return detectFaceWithPython(videoPath, timestamp);
}

/**
 * Python/OpenCV fallback for face detection when JS worker is unavailable
 */
async function detectFaceWithPython(
  videoPath: string,
  timestamp: number
): Promise<FaceBox[]> {
  const pythonScript = `
import cv2
import sys
import numpy as np
import subprocess
import os

video_path = sys.argv[1]
timestamp = float(sys.argv[2])

# Try to extract frame using ffmpeg
import tempfile
tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
tmp.close()

try:
    subprocess.run([
        'ffmpeg', '-y', '-ss', str(timestamp), '-i', video_path,
        '-frames:v', '1', '-q:v', '2', tmp.name
    ], check=True, capture_output=True)

    img = cv2.imread(tmp.name)
    if img is None:
        print('[]')
        sys.exit(0)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
    )

    h, w = img.shape[:2]
    result = []
    for (x, y, fw, fh) in faces:
        result.append({
            'x': float(x) / w,
            'y': float(y) / h,
            'width': float(fw) / w,
            'height': float(fh) / h,
            'confidence': 0.9
        })
    print(result)
finally:
    os.unlink(tmp.name)
`.trim();

  return new Promise((resolve) => {
    const { execFile } = require('child_process');
    const child = execFile(
      'python',
      ['-c', pythonScript, videoPath, String(timestamp)],
      { timeout: 15000 },
      (error: any, stdout: string, stderr: string) => {
        if (error) {
          Logger.warn('[SmartCropper] Python face detection failed:', error.message);
          resolve([]);
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(Array.isArray(parsed) ? parsed : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
}

// ── Crop region computation ───────────────────────────────────────────────────

/**
 * Compute optimal crop region centered on the detected face.
 * Ensures the face is centered with comfortable padding and no extra black space.
 *
 * @param faceBox - Normalized face bounding box (0-1 range)
 * @param targetRatio - Target aspect ratio
 * @param videoWidth - Source video width in pixels
 * @param videoHeight - Source video height in pixels
 * @param paddingRatio - Extra padding around face (default 0.3 = 30%)
 * @returns Pixel-level crop region
 */
export function computeCropRegion(
  faceBox: FaceBox,
  targetRatio: CropAspectRatio | [number, number],
  videoWidth: number,
  videoHeight: number,
  paddingRatio = 0.3
): CropRegion {
  const ratio = parseAspectRatio(targetRatio);

  // Convert normalized face box to pixel coordinates
  const fx = faceBox.x * videoWidth;
  const fy = faceBox.y * videoHeight;
  const fw = faceBox.width * videoWidth;
  const fh = faceBox.height * videoHeight;

  // Add padding around face
  const padX = fw * paddingRatio;
  const padY = fh * paddingRatio;

  // Face center in pixel coordinates
  const faceCenterX = fx + fw / 2;
  const faceCenterY = fy + fh / 2;

  // Calculate crop dimensions to match target ratio
  let cropW: number, cropH: number;
  if (ratio <= 1) {
    // Vertical format (9:16, 4:5)
    cropH = videoHeight;
    cropW = Math.round(cropH * ratio);
  } else {
    // Horizontal format (16:9)
    cropW = videoWidth;
    cropH = Math.round(cropW / ratio);
  }

  // Center crop region on face
  let cropX = Math.round(faceCenterX - cropW / 2);
  let cropY = Math.round(faceCenterY - cropH / 2);

  // Clamp to video bounds (prefer face on one side over black borders)
  if (cropX < 0) { cropX = 0; }
  if (cropX + cropW > videoWidth) { cropX = videoWidth - cropW; }
  if (cropY < 0) { cropY = 0; }
  if (cropY + cropH > videoHeight) { cropY = videoHeight - cropH; }

  return { x: cropX, y: cropY, width: cropW, height: cropH };
}

/**
 * Compute center-based crop region (no face tracking)
 */
export function computeCenterCropRegion(
  targetRatio: CropAspectRatio | [number, number],
  videoWidth: number,
  videoHeight: number
): CropRegion {
  const ratio = parseAspectRatio(targetRatio);

  let cropW: number, cropH: number;
  if (ratio <= 1) {
    cropH = videoHeight;
    cropW = Math.round(cropH * ratio);
  } else {
    cropW = videoWidth;
    cropH = Math.round(cropW / ratio);
  }

  return {
    x: Math.round((videoWidth - cropW) / 2),
    y: Math.round((videoHeight - cropH) / 2),
    width: cropW,
    height: cropH,
  };
}

// ── Video cropping ────────────────────────────────────────────────────────────

/**
 * Crop a video to the target aspect ratio using FFmpeg.
 * Applies crop, scale, and pad filters to guarantee exact output dimensions.
 *
 * @param inputPath - Source video path
 * @param outputPath - Destination video path
 * @param cropRegion - Crop region in pixel coordinates
 * @param outputWidth - Output width in pixels (default 1080)
 * @param outputHeight - Output height in pixels (default 1920)
 * @param duration - Optional: trim to this duration (seconds)
 */
export async function cropVideo(
  inputPath: string,
  outputPath: string,
  cropRegion: CropRegion,
  outputWidth = 1080,
  outputHeight = 1920,
  duration?: number
): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));

  const { x, y, width, height } = cropRegion;
  const scaleFilter = `crop=${width}:${height}:${x}:${y},scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2`;

  const args = ['-y'];
  if (duration !== undefined) {
    args.push('-t', String(duration));
  }
  args.push(
    '-i', inputPath,
    '-vf', scaleFilter,
    '-c:a', 'copy',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    outputPath
  );

  await runFFmpeg('ffmpeg', args, 180000);
  Logger.info(`[SmartCropper] Cropped video saved: ${outputPath}`);
}

// ── Main smart cropper class ──────────────────────────────────────────────────

export class SmartCropper {
  /**
   * Crop a video segment to the target aspect ratio with smart focus tracking.
   *
   * @param inputPath - Source video path
   * @param outputPath - Destination video path
   * @param options - Smart crop options
   * @returns Smart crop result with crop region and detected faces
   */
  async cropVideo(
    inputPath: string,
    outputPath: string,
    options: SmartCropOptions
  ): Promise<SmartCropResult> {
    const {
      targetFocus,
      aspectRatio,
      outputWidth = 1080,
      outputHeight = 1920,
      inputPath: videoPath = inputPath,
      minFaceConfidence = 0.5,
      smoothingWindow = 5,
      facePadding = 0.3,
    } = options;

    await fs.ensureDir(path.dirname(outputPath));

    // Get video dimensions
    const dims = await this.getVideoDimensions(inputPath);
    const [videoWidth, videoHeight] = dims;
    const duration = await getVideoDuration(inputPath);

    let detectedFaces: FaceBox[] = [];
    let cropRegion: CropRegion;

    if (targetFocus === 'face') {
      // Sample multiple frames for face detection
      const faceBoxes = await this.sampleFaceDetection(inputPath, duration, minFaceConfidence);
      detectedFaces = faceBoxes;

      if (faceBoxes.length > 0) {
        // Smooth face positions across frames
        const smoothed = this.smoothFaceBoxes(faceBoxes, smoothingWindow);
        const bestFace = this.selectBestFace(smoothed, minFaceConfidence);
        cropRegion = computeCropRegion(bestFace, aspectRatio, videoWidth, videoHeight, facePadding);
      } else {
        // No face detected, fall back to center
        Logger.warn('[SmartCropper] No face detected, falling back to center crop');
        cropRegion = computeCenterCropRegion(aspectRatio, videoWidth, videoHeight);
      }
    } else if (targetFocus === 'center') {
      cropRegion = computeCenterCropRegion(aspectRatio, videoWidth, videoHeight);
    } else {
      // 'motion' — simplified: use center crop (motion tracking would require optical flow)
      Logger.info('[SmartCropper] Motion focus mode: using center crop (optical flow not available)');
      cropRegion = computeCenterCropRegion(aspectRatio, videoWidth, videoHeight);
    }

    await cropVideo(inputPath, outputPath, cropRegion, outputWidth, outputHeight);

    return {
      outputPath,
      cropRegion,
      detectedFaces,
      duration,
    };
  }

  /**
   * Sample face detection across video duration
   */
  private async sampleFaceDetection(
    videoPath: string,
    duration: number,
    minConfidence: number
  ): Promise<FaceBox[]> {
    const results: FaceBox[] = [];
    // Sample at 0%, 25%, 50%, 75% of video duration
    const samplePoints = [0.1, 0.25, 0.5, 0.75].slice(0, Math.max(1, Math.floor(duration / 10)));

    for (const t of samplePoints) {
      const timestamp = duration * t;
      try {
        const faces = await detectFaceBox(videoPath, timestamp);
        for (const face of faces) {
          if (face.confidence >= minConfidence) {
            results.push(face);
          }
        }
      } catch (err) {
        Logger.warn(`[SmartCropper] Face detection failed at ${timestamp}s:`, err);
      }
    }

    return results;
  }

  /**
   * Smooth face box positions using a rolling average
   */
  private smoothFaceBoxes(boxes: FaceBox[], window: number): FaceBox[] {
    if (boxes.length <= 1) return boxes;

    const smoothed: FaceBox[] = [];
    for (let i = 0; i < boxes.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(boxes.length, i + Math.ceil(window / 2));
      const slice = boxes.slice(start, end);

      const avgX = slice.reduce((s, b) => s + b.x, 0) / slice.length;
      const avgY = slice.reduce((s, b) => s + b.y, 0) / slice.length;
      const avgW = slice.reduce((s, b) => s + b.width, 0) / slice.length;
      const avgH = slice.reduce((s, b) => s + b.height, 0) / slice.length;
      const avgConf = slice.reduce((s, b) => s + b.confidence, 0) / slice.length;

      smoothed.push({ x: avgX, y: avgY, width: avgW, height: avgH, confidence: avgConf });
    }

    return smoothed;
  }

  /**
   * Select the best face box (largest area with sufficient confidence)
   */
  private selectBestFace(boxes: FaceBox[], minConfidence: number): FaceBox {
    return boxes
      .filter(b => b.confidence >= minConfidence)
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0] ?? boxes[0];
  }

  /**
   * Get video dimensions via ffprobe
   */
  private async getVideoDimensions(inputPath: string): Promise<[number, number]> {
    try {
      const { stdout } = await runFFmpeg('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=s=x:p=0',
        inputPath,
      ]);
      const dims = stdout?.trim();
      if (dims) {
        const [w, h] = dims.split('x').map(Number);
        if (w && h) return [w, h];
      }
    } catch (err) {
      Logger.warn('[SmartCropper] ffprobe dimensions failed:', err);
    }
    return [1920, 1080];
  }

  /**
   * Per-frame dinamik yüz takibi ile kare kare kırpma (v2).
   * Her chunk için interpolasyonlu yüz konumu kullanarak akıcı hareket sağlar.
   */
  async cropPerFrame(
    inputPath: string,
    outputPath: string,
    options: {
      aspectRatio?: CropAspectRatio;
      outputWidth?: number;
      outputHeight?: number;
      chunkDuration?: number;
      fallbackToCenter?: boolean;
      smoothingWindow?: number;
    } = {}
  ): Promise<import('./perFrameCropper.js').PerFrameCropResult> {
    const { cropPerFrame: cropPerFrameFn } = await import('./perFrameCropper.js');
    return cropPerFrameFn(inputPath, outputPath, options);
  }
}

export const smartCropper = new SmartCropper();
