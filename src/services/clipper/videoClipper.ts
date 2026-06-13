/**
 * Video Clipper Service
 * Handles video cropping, face tracking, and clip generation
 */

import path from 'path';
import fs from 'fs-extra';
import { ClipSegment, ClipperConfig } from './types.js';
import { Logger } from '../../lib/logger.js';
import { runInWorker } from '../videoService.js';
import { v4 as uuidv4 } from 'uuid';
import { faceTracker, FaceTrackerService } from '../faceTracker.js';
import type { FaceTrackResult } from '../faceTracker.js';

const DEFAULT_CONFIG: ClipperConfig = {
  minSegmentDuration: 30,
  maxSegmentDuration: 90,
  targetAspectRatio: '9:16',
  faceTracking: true,
  autoSubtitles: true,
  autoMusic: true,
  outputFormat: 'mp4',
};

export class VideoClipper {
  private config: ClipperConfig;

  constructor(config: Partial<ClipperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Crop a video segment to target aspect ratio with optional face tracking
   */
  async cropSegment(
    inputPath: string,
    outputPath: string,
    segment: ClipSegment,
    options: {
      aspectRatio?: '9:16' | '16:9' | '1:1';
      faceTracking?: boolean;
      trackCenter?: { x: number; y: number }; // Face/object center if tracking enabled
    } = {}
  ): Promise<string> {
    const { aspectRatio = '9:16', faceTracking = true, trackCenter } = options;

    Logger.info(`[VideoClipper] Cropping segment ${segment.id}: ${segment.startTime}s - ${segment.endTime}s`);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Calculate crop dimensions based on aspect ratio
    const cropFilter = await this.calculateCropFilter(inputPath, aspectRatio, trackCenter);

    // Build FFmpeg command
    const startTime = segment.startTime;
    const duration = segment.duration;

    const args = [
      '-ss', String(startTime),
      '-i', inputPath,
      '-t', String(duration),
      '-vf', cropFilter,
      '-c:a', 'copy',
      '-y',
    ];

    if (this.config.outputFormat === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
    }

    args.push(outputPath);

    try {
      await runInWorker('ffmpeg', args, 120000); // 2 min timeout for cropping
      Logger.info(`[VideoClipper] Segment cropped: ${outputPath}`);
      return outputPath;
    } catch (error) {
      Logger.error(`[VideoClipper] Failed to crop segment:`, error);
      throw error;
    }
  }

  /**
   * Crop a video segment using face tracking - segments video into chunks
   * based on stable face positions and applies appropriate crop to each chunk
   */
  async cropSegmentWithFaceTracking(
    inputPath: string,
    outputPath: string,
    segment: ClipSegment,
    options: {
      aspectRatio?: '9:16' | '16:9' | '1:1';
      outputWidth?: number;
      outputHeight?: number;
    } = {}
  ): Promise<string> {
    const { aspectRatio = '9:16', outputWidth = 1080, outputHeight = 1920 } = options;

    Logger.info(`[VideoClipper] Face-tracking crop for segment ${segment.id}: ${segment.startTime}s - ${segment.endTime}s`);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    try {
      // Get video dimensions
      const [videoWidth, videoHeight] = await this.getVideoDimensions(inputPath);

      // Run face tracking to get per-frame positions
      const faceResult: FaceTrackResult = await faceTracker.trackFaces(inputPath, {
        startTime: segment.startTime,
        duration: segment.duration,
      });

      // If no faces detected or not enough data, fall back to center crop
      if (faceResult.frames.length === 0 || faceResult.frames.every((f: { confidence: number }) => f.confidence === 0)) {
        Logger.warn('[VideoClipper] No faces detected, falling back to center crop');
        return this.cropSegment(inputPath, outputPath, segment, { aspectRatio, faceTracking: false });
      }

      // Get stable segments from face tracking data
      const stableSegments = await faceTracker.getStableSegments(inputPath, {
        startTime: segment.startTime,
        duration: segment.duration,
        stabilityThreshold: 50,
        minSegmentDuration: 0.5,
      });

      // If only one stable segment or not enough variation, use simple approach
      if (stableSegments.length <= 1) {
        const avgFrame = faceResult.frames.reduce((acc: { cropX: number; cropY: number; count: number }, f: { cropX: number; cropY: number; confidence: number }) => {
          if (f.confidence > 0) {
            acc.cropX += f.cropX;
            acc.cropY += f.cropY;
            acc.count++;
          }
          return acc;
        }, { cropX: 0, cropY: 0, count: 0 });

        if (avgFrame.count > 0) {
          avgFrame.cropX = Math.round(avgFrame.cropX / avgFrame.count);
          avgFrame.cropY = Math.round(avgFrame.cropY / avgFrame.count);
        }

        const cropFilter = this.buildFaceCropFilter(
          avgFrame.cropX || videoWidth / 2,
          avgFrame.cropY || videoHeight / 2,
          videoWidth,
          videoHeight,
          aspectRatio,
          outputWidth,
          outputHeight
        );

        return this.runCropCommand(inputPath, outputPath, segment, cropFilter);
      }

      // Multiple stable segments - need to use segment-based approach with FFmpeg
      // For each segment, create a cropped clip then concatenate
      const tempDir = path.join(path.dirname(outputPath), 'temp_face_track_' + uuidv4());
      await fs.ensureDir(tempDir);

      const clipPaths: string[] = [];

      for (let i = 0; i < stableSegments.length; i++) {
        const seg = stableSegments[i];
        const clipPath = path.join(tempDir, `segment_${i}.mp4`);

        const cropFilter = this.buildFaceCropFilter(
          seg.cropX,
          seg.cropY,
          videoWidth,
          videoHeight,
          aspectRatio,
          outputWidth,
          outputHeight
        );

        const segArgs = [
          '-ss', String(seg.startTime),
          '-i', inputPath,
          '-t', String(seg.endTime - seg.startTime),
          '-vf', cropFilter,
          '-c:a', 'copy',
          '-y',
          clipPath,
        ];

        await runInWorker('ffmpeg', segArgs, 120000);
        clipPaths.push(clipPath);
      }

      // Concatenate all segments
      const concatListPath = path.join(tempDir, 'concat.txt');
      const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');
      await fs.writeFile(concatListPath, concatContent, 'utf-8');

      const concatArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c', 'copy',
        '-y',
        outputPath,
      ];

      await runInWorker('ffmpeg', concatArgs, 120000);

      // Cleanup temp directory
      await fs.remove(tempDir);

      Logger.info(`[VideoClipper] Face-tracking crop completed: ${outputPath}`);
      return outputPath;
    } catch (error) {
      Logger.error(`[VideoClipper] Face-tracking crop failed:`, error);
      // Fall back to regular crop on error
      return this.cropSegment(inputPath, outputPath, segment, { aspectRatio, faceTracking: false });
    }
  }

  /**
   * Build FFmpeg crop filter centered on face position
   */
  private buildFaceCropFilter(
    faceX: number,
    faceY: number,
    videoWidth: number,
    videoHeight: number,
    targetRatio: '9:16' | '16:9' | '1:1',
    outputWidth: number,
    outputHeight: number
  ): string {
    let cropW: number, cropH: number;

    switch (targetRatio) {
      case '9:16':
        cropH = videoHeight;
        cropW = Math.round(videoHeight * (9 / 16));
        break;
      case '16:9':
        cropW = videoWidth;
        cropH = Math.round(videoWidth * (9 / 16));
        break;
      case '1:1':
        cropW = cropH = Math.min(videoWidth, videoHeight);
        break;
      default:
        cropW = videoWidth;
        cropH = videoHeight;
    }

    // Center crop around face position
    const cropX = Math.max(0, Math.min(videoWidth - cropW, Math.round(faceX - cropW / 2)));
    const cropY = 0; // Always crop from top for vertical format

    return `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2`;
  }

  /**
   * Run a crop FFmpeg command
   */
  private async runCropCommand(
    inputPath: string,
    outputPath: string,
    segment: ClipSegment,
    cropFilter: string
  ): Promise<string> {
    const args = [
      '-ss', String(segment.startTime),
      '-i', inputPath,
      '-t', String(segment.duration),
      '-vf', cropFilter,
      '-c:a', 'copy',
      '-y',
    ];

    if (this.config.outputFormat === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
    }

    args.push(outputPath);

    await runInWorker('ffmpeg', args, 120000);
    return outputPath;
  }

  /**
   * Calculate FFmpeg crop filter based on aspect ratio and face tracking
   */
  private async calculateCropFilter(
    inputPath: string,
    targetRatio: '9:16' | '16:9' | '1:1',
    trackCenter?: { x: number; y: number }
  ): Promise<string> {
    const [width, height] = await this.getVideoDimensions(inputPath);

    let cropW: number, cropH: number;

    switch (targetRatio) {
      case '9:16': // Vertical/Shorts format
        cropH = height;
        cropW = Math.round(height * (9 / 16));
        break;
      case '16:9': // Horizontal
        cropW = width;
        cropH = Math.round(width * (9 / 16));
        break;
      case '1:1': // Square
        cropW = cropH = Math.min(width, height);
        break;
      default:
        cropW = width;
        cropH = height;
    }

    // Use provided track center or default to center crop
    const x = trackCenter ? Math.max(0, Math.min(width - cropW, Math.round(trackCenter.x - cropW / 2))) : Math.round((width - cropW) / 2);
    const y = trackCenter ? 0 : Math.round((height - cropH) / 2);

    return `crop=${cropW}:${cropH}:${x}:${y},scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`;
  }

  /**
   * Get video dimensions using ffprobe
   */
  private async getVideoDimensions(inputPath: string): Promise<[number, number]> {
    try {
      const { stdout } = await runInWorker('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=s=x:p=0',
        inputPath,
      ], 30000);

      const dims = stdout?.trim();
      if (dims) {
        const [w, h] = dims.split('x').map(Number);
        if (w && h) return [w, h];
      }
    } catch (error) {
      Logger.warn('[VideoClipper] Failed to get video dimensions via ffprobe:', error);
    }
    return [1920, 1080]; // Fallback to default
  }

  /**
   * Generate subtitles for a clip
   */
  async generateSubtitles(
    inputPath: string,
    outputPath: string,
    segments: { start: number; end: number; text: string }[]
  ): Promise<string> {
    Logger.info(`[VideoClipper] Generating subtitles for ${inputPath}`);

    // Generate SRT file
    let srtContent = '';
    segments.forEach((seg, i) => {
      const startTime = this.formatSRTTime(seg.start);
      const endTime = this.formatSRTTime(seg.end);
      srtContent += `${i + 1}\n${startTime} --> ${endTime}\n${seg.text}\n\n`;
    });

    const srtPath = outputPath.replace(/\.\w+$/, '.srt');
    await fs.writeFile(srtPath, srtContent, 'utf-8');

    // Burn subtitles into video using FFmpeg
    const args = [
      '-i', inputPath,
      '-vf', `subtitles=${srtPath}`,
      '-c:a', 'copy',
      '-y',
      outputPath,
    ];

    try {
      await runInWorker('ffmpeg', args, 120000);
      return outputPath;
    } catch (error) {
      Logger.error(`[VideoClipper] Failed to burn subtitles:`, error);
      // Return original without subtitles on failure
      return inputPath;
    }
  }

  /**
   * Format time for SRT subtitles (HH:MM:SS,mmm)
   */
  private formatSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Mix background music into clip
   */
  async mixMusic(
    inputPath: string,
    musicPath: string,
    outputPath: string,
    musicVolume: number = 0.3
  ): Promise<string> {
    Logger.info(`[VideoClipper] Mixing music: ${musicPath}`);

    const args = [
      '-i', inputPath,
      '-i', musicPath,
      '-filter_complex',
      `[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[outa];[outa]volume=${musicVolume}[out]`,
      '-map', '0:v',
      '-map', '[out]',
      '-c:v', 'copy',
      '-y',
      outputPath,
    ];

    try {
      await runInWorker('ffmpeg', args, 120000);
      return outputPath;
    } catch (error) {
      Logger.error(`[VideoClipper] Failed to mix music:`, error);
      return inputPath;
    }
  }

  /**
   * Create split-screen (A/B) layout
   */
  async createSplitScreen(
    topVideoPath: string,
    bottomVideoPath: string,
    outputPath: string,
    layout: 'horizontal' | 'vertical' = 'vertical'
  ): Promise<string> {
    Logger.info(`[VideoClipper] Creating ${layout} split-screen`);

    const filter = layout === 'vertical'
      ? `[0:v][1:v]vstack=inputs=2[out]`
      : `[0:v][1:v]hstack=inputs=2[out]`;

    const args = [
      '-i', topVideoPath,
      '-i', bottomVideoPath,
      '-filter_complex', filter,
      '-map', '[out]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-y',
      outputPath,
    ];

    try {
      await runInWorker('ffmpeg', args, 120000);
      return outputPath;
    } catch (error) {
      Logger.error(`[VideoClipper] Failed to create split-screen:`, error);
      throw error;
    }
  }

  /**
   * Add watermark/mascot overlay
   */
  async addWatermark(
    inputPath: string,
    watermarkPath: string,
    outputPath: string,
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'bottom-right'
  ): Promise<string> {
    Logger.info(`[VideoClipper] Adding watermark at ${position}`);

    const overlayX = position.includes('right') ? 'W-w-20' : '20';
    const overlayY = position.includes('top') ? '20' : 'H-h-20';

    const filter = `overlay=${overlayX}:${overlayY}`;

    const args = [
      '-i', inputPath,
      '-i', watermarkPath,
      '-filter_complex', filter,
      '-c:a', 'copy',
      '-y',
      outputPath,
    ];

    try {
      await runInWorker('ffmpeg', args, 120000);
      return outputPath;
    } catch (error) {
      Logger.error(`[VideoClipper] Failed to add watermark:`, error);
      return inputPath;
    }
  }
}

export const videoClipper = new VideoClipper();