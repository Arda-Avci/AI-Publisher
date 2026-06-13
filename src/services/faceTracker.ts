/**
 * Face Tracker Service
 * TypeScript wrapper for the Python face tracking worker
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Logger } from '../lib/logger.js';

export interface CropFrame {
  timestamp: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  confidence: number;
}

export interface FaceTrackResult {
  frames: CropFrame[];
  duration: number;
  mode: string;
  videoWidth?: number;
  videoHeight?: number;
  fps?: number;
  error?: string;
}

export interface FaceTrackOptions {
  inputPath: string;
  startTime?: number;
  duration?: number;
  sampleInterval?: number;
}

interface StableSegment {
  startTime: number;
  endTime: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  avgConfidence: number;
}

/**
 * Chunk frames into stable segments where face position doesn't change significantly
 */
export function chunkStableSegments(frames: CropFrame[], threshold: number = 50, minDuration: number = 0.5): StableSegment[] {
  if (frames.length === 0) return [];

  const segments: StableSegment[] = [];
  let currentSegment: StableSegment | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // No face detected - skip or end segment
    if (frame.confidence === 0) {
      if (currentSegment) {
        if (currentSegment.endTime - currentSegment.startTime >= minDuration) {
          segments.push(currentSegment);
        }
        currentSegment = null;
      }
      continue;
    }

    if (!currentSegment) {
      currentSegment = {
        startTime: frame.timestamp,
        endTime: frame.timestamp,
        cropX: frame.cropX,
        cropY: frame.cropY,
        cropW: frame.cropW,
        cropH: frame.cropH,
        avgConfidence: frame.confidence,
      };
    } else {
      // Check if position is stable enough
      const dx = Math.abs(frame.cropX - currentSegment.cropX);
      const dy = Math.abs(frame.cropY - currentSegment.cropY);

      if (dx <= threshold && dy <= threshold) {
        // Extend current segment
        currentSegment.endTime = frame.timestamp;
        currentSegment.cropX = Math.round((currentSegment.cropX + frame.cropX) / 2);
        currentSegment.cropY = Math.round((currentSegment.cropY + frame.cropY) / 2);
        currentSegment.cropW = Math.round((currentSegment.cropW + frame.cropW) / 2);
        currentSegment.cropH = Math.round((currentSegment.cropH + frame.cropH) / 2);
        currentSegment.avgConfidence = (currentSegment.avgConfidence + frame.confidence) / 2;
      } else {
        // Position changed significantly - save current and start new segment
        if (currentSegment.endTime - currentSegment.startTime >= minDuration) {
          segments.push(currentSegment);
        }
        currentSegment = {
          startTime: frame.timestamp,
          endTime: frame.timestamp,
          cropX: frame.cropX,
          cropY: frame.cropY,
          cropW: frame.cropW,
          cropH: frame.cropH,
          avgConfidence: frame.confidence,
        };
      }
    }
  }

  // Don't forget the last segment
  if (currentSegment && currentSegment.endTime - currentSegment.startTime >= minDuration) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Run the Python face tracking worker
 */
function runFaceTrackerWorker(
  videoPath: string,
  startTime: number = 0,
  duration?: number,
  timeoutMs: number = 120000
): Promise<FaceTrackResult> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(process.cwd(), 'src', 'workers', 'face-track-worker.py');

    // Check if file exists
    if (!fs.existsSync(workerPath)) {
      reject(new Error(`Face tracking worker not found: ${workerPath}`));
      return;
    }

    const args: string[] = [videoPath, String(startTime)];
    if (duration !== undefined) {
      args.push(String(duration));
    }

    Logger.debug(`[FaceTracker] Spawning Python worker: python "${workerPath}" ${args.join(' ')}`);

    const child = spawn('python', [workerPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Face tracking worker timed out'));
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        Logger.error(`[FaceTracker] Worker exited with code ${code}: ${stderr}`);
        reject(new Error(`Face tracking worker failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim()) as FaceTrackResult;
        resolve(result);
      } catch (parseError) {
        Logger.error(`[FaceTracker] Failed to parse worker output: ${stdout}`);
        reject(new Error(`Failed to parse face tracking result: ${parseError}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      Logger.error(`[FaceTracker] Worker spawn error:`, err);
      reject(err);
    });
  });
}

/**
 * Face Tracker Service
 */
export class FaceTrackerService {
  private sampleInterval: number;

  constructor(sampleInterval: number = 0.5) {
    this.sampleInterval = sampleInterval;
  }

  /**
   * Track faces in a video segment
   */
  async trackFaces(
    inputPath: string,
    options: {
      startTime?: number;
      duration?: number;
    } = {}
  ): Promise<FaceTrackResult> {
    const { startTime = 0, duration } = options;

    Logger.info(`[FaceTracker] Starting face tracking: ${inputPath} (start: ${startTime}s)`);

    try {
      const result = await runFaceTrackerWorker(inputPath, startTime, duration);

      if (result.error) {
        throw new Error(result.error);
      }

      Logger.info(`[FaceTracker] Detected ${result.frames.length} face positions over ${result.duration}s`);
      return result;
    } catch (error) {
      Logger.error(`[FaceTracker] Face tracking failed:`, error);
      throw error;
    }
  }

  /**
   * Get stable face tracking segments for FFmpeg processing
   */
  async getStableSegments(
    inputPath: string,
    options: {
      startTime?: number;
      duration?: number;
      stabilityThreshold?: number;
      minSegmentDuration?: number;
    } = {}
  ): Promise<StableSegment[]> {
    const {
      startTime = 0,
      duration,
      stabilityThreshold = 50,
      minSegmentDuration = 0.5,
    } = options;

    const result = await this.trackFaces(inputPath, { startTime, duration });

    if (result.frames.length === 0) {
      return [];
    }

    return chunkStableSegments(result.frames, stabilityThreshold, minSegmentDuration);
  }

  /**
   * Build FFmpeg crop filter for a single segment based on face position
   */
  buildSegmentCropFilter(
    segment: StableSegment,
    videoWidth: number,
    videoHeight: number,
    targetWidth: number = 1080,
    targetHeight: number = 1920
  ): string {
    // Calculate crop window centered on face
    const cropW = Math.round(videoHeight * (9 / 16)); // 9:16 aspect ratio
    const cropH = videoHeight;

    // Center crop around face position
    let cropX = Math.max(0, Math.min(videoWidth - cropW, segment.cropX - cropW / 2));
    let cropY = 0; // Always crop from top for vertical format

    // Build crop filter with scale and pad
    return `crop=${cropW}:${cropH}:${Math.round(cropX)}:${Math.round(cropY)},scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`;
  }
}

export const faceTracker = new FaceTrackerService();
