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

// FFmpeg filter path helper — relative from CWD avoids Windows drive-letter colon
function filterPath(p: string): string {
  return path.relative(process.cwd(), p).replace(/\\/g, '/');
}

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
    } = {},
  ): Promise<string> {
    const { aspectRatio = '9:16', faceTracking = true, trackCenter } = options;

    Logger.info(
      `[VideoClipper] Cropping segment ${segment.id}: ${segment.startTime}s - ${segment.endTime}s`,
    );

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Calculate crop dimensions based on aspect ratio
    const cropFilter = await this.calculateCropFilter(inputPath, aspectRatio, trackCenter);

    // Build FFmpeg command
    const startTime = segment.startTime;
    const duration = segment.duration;

    const args = [
      '-ss',
      String(startTime),
      '-i',
      inputPath,
      '-t',
      String(duration),
      '-vf',
      cropFilter,
      '-c:a',
      'copy',
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
   * Crop a video segment using adaptive face tracking v2
   * Multi-face support, confidence-based smoothing, scene change detection
   */
  async cropSegmentWithFaceTracking(
    inputPath: string,
    outputPath: string,
    segment: ClipSegment,
    options: {
      aspectRatio?: '9:16' | '16:9' | '1:1';
      outputWidth?: number;
      outputHeight?: number;
      multiFace?: boolean;
      smoothWindow?: number;
      sceneChangeThreshold?: number;
    } = {},
  ): Promise<string> {
    const {
      aspectRatio = '9:16',
      outputWidth = 1080,
      outputHeight = 1920,
      multiFace = true,
      smoothWindow = 5,
      sceneChangeThreshold = 0.3,
    } = options;

    Logger.info(
      `[VideoClipper-v2] Adaptive face-tracking crop ${segment.id}: ${segment.startTime}s-${segment.endTime}s`,
    );

    await fs.ensureDir(path.dirname(outputPath));

    try {
      const [videoWidth, videoHeight] = await this.getVideoDimensions(inputPath);

      const faceResult: FaceTrackResult = await faceTracker.trackFaces(inputPath, {
        startTime: segment.startTime,
        duration: segment.duration,
      });

      if (
        faceResult.frames.length === 0 ||
        faceResult.frames.every((f: { confidence: number }) => f.confidence === 0)
      ) {
        Logger.warn('[VideoClipper-v2] No faces, fallback to center crop');
        return this.cropSegment(inputPath, outputPath, segment, {
          aspectRatio,
          faceTracking: false,
        });
      }

      // Smooth crop positions with moving average window
      const smoothed = this.smoothCropFrames(faceResult.frames, smoothWindow);

      // Detect scene changes (large position jumps)
      const sceneChanges = this.detectSceneChanges(smoothed, videoWidth, sceneChangeThreshold);

      // Get stable segments incorporating scene changes
      const stableSegments = await faceTracker.getStableSegments(inputPath, {
        startTime: segment.startTime,
        duration: segment.duration,
        stabilityThreshold: Math.round(videoWidth * 0.05),
        minSegmentDuration: 0.5,
      });

      // Merge stable segments with scene change boundaries
      const mergedSegments = this.mergeSceneChanges(stableSegments, sceneChanges, segment);

      if (mergedSegments.length <= 1) {
        const avgX = Math.round(
          smoothed.reduce((a: number, f: { cropX: number }) => a + f.cropX, 0) / smoothed.length,
        );
        const avgY = Math.round(
          smoothed.reduce((a: number, f: { cropY: number }) => a + f.cropY, 0) / smoothed.length,
        );
        const cropFilter = this.buildFaceCropFilter(
          avgX || videoWidth / 2,
          avgY || videoHeight / 2,
          videoWidth,
          videoHeight,
          aspectRatio,
          outputWidth,
          outputHeight,
        );
        return this.runCropCommand(inputPath, outputPath, segment, cropFilter);
      }

      const tempDir = path.join(path.dirname(outputPath), 'temp_face_track_' + uuidv4());
      await fs.ensureDir(tempDir);
      const clipPaths: string[] = [];

      for (let i = 0; i < mergedSegments.length; i++) {
        const seg = mergedSegments[i];
        const clipPath = path.join(tempDir, `segment_${i}.mp4`);

        const cropFilter = this.buildMultiFaceCropFilter(
          seg.cropX,
          seg.cropY,
          seg.confidence || 0.5,
          videoWidth,
          videoHeight,
          aspectRatio,
          outputWidth,
          outputHeight,
          multiFace,
        );

        const segArgs = [
          '-ss',
          String(seg.startTime),
          '-i',
          inputPath,
          '-t',
          String(seg.endTime - seg.startTime),
          '-vf',
          cropFilter,
          '-c:a',
          'copy',
          '-y',
          clipPath,
        ];

        await runInWorker('ffmpeg', segArgs, 120000);
        clipPaths.push(clipPath);
      }

      const concatListPath = path.join(tempDir, 'concat.txt');
      await fs.writeFile(concatListPath, clipPaths.map((p) => `file '${p}'`).join('\n'), 'utf-8');

      await runInWorker(
        'ffmpeg',
        ['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', '-y', outputPath],
        120000,
      );

      await fs.remove(tempDir);
      Logger.info(`[VideoClipper-v2] Adaptive face-tracking crop completed: ${outputPath}`);
      return outputPath;
    } catch (error) {
      Logger.error(`[VideoClipper-v2] Face-tracking crop failed, falling back:`, error);
      return this.cropSegment(inputPath, outputPath, segment, { aspectRatio, faceTracking: false });
    }
  }

  /**
   * Apply moving average smoothing to face tracking frames
   */
  private smoothCropFrames(
    frames: Array<{ cropX: number; cropY: number; confidence: number }>,
    windowSize: number,
  ): Array<{ cropX: number; cropY: number; confidence: number }> {
    if (frames.length <= windowSize) return frames;
    const result: Array<{ cropX: number; cropY: number; confidence: number }> = [];
    for (let i = 0; i < frames.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(frames.length, i + Math.ceil(windowSize / 2));
      const window = frames.slice(start, end);
      const sumX = window.reduce((a: number, f: { cropX: number }) => a + f.cropX, 0);
      const sumY = window.reduce((a: number, f: { cropY: number }) => a + f.cropY, 0);
      result.push({
        cropX: Math.round(sumX / window.length),
        cropY: Math.round(sumY / window.length),
        confidence: frames[i].confidence,
      });
    }
    return result;
  }

  /**
   * Detect scene changes by analyzing face position jumps
   */
  private detectSceneChanges(
    frames: Array<{ cropX: number; cropY: number; confidence: number }>,
    videoWidth: number,
    thresholdRatio: number,
  ): number[] {
    const changes: number[] = [];
    const threshold = videoWidth * thresholdRatio;
    for (let i = 1; i < frames.length; i++) {
      const dx = Math.abs(frames[i].cropX - frames[i - 1].cropX);
      const dy = Math.abs(frames[i].cropY - frames[i - 1].cropY);
      if (dx > threshold || dy > threshold) {
        changes.push(i);
      }
    }
    return changes;
  }

  /**
   * Merge face-tracking stable segments with scene change boundaries
   */
  private mergeSceneChanges(
    stableSegments: Array<{ startTime: number; endTime: number; cropX: number; cropY: number }>,
    sceneChanges: number[],
    segment: ClipSegment,
  ): Array<{
    startTime: number;
    endTime: number;
    cropX: number;
    cropY: number;
    confidence?: number;
  }> {
    if (sceneChanges.length === 0) return stableSegments;

    const frameDuration = segment.duration / Math.max(sceneChanges[sceneChanges.length - 1] + 1, 1);
    const boundaries = sceneChanges.map((idx) => segment.startTime + idx * frameDuration);

    const merged: Array<{
      startTime: number;
      endTime: number;
      cropX: number;
      cropY: number;
      confidence?: number;
    }> = [];
    for (const seg of stableSegments) {
      const splitPoints = boundaries.filter((b) => b > seg.startTime && b < seg.endTime);
      if (splitPoints.length === 0) {
        merged.push(seg);
      } else {
        let prevStart = seg.startTime;
        for (const point of [...splitPoints, seg.endTime]) {
          const matchingFrames = stableSegments.filter(
            (s) => s.startTime >= prevStart && s.endTime <= point,
          );
          const avgX =
            matchingFrames.length > 0
              ? Math.round(matchingFrames.reduce((a, s) => a + s.cropX, 0) / matchingFrames.length)
              : seg.cropX;
          merged.push({
            startTime: prevStart,
            endTime: point,
            cropX: avgX,
            cropY: seg.cropY,
            confidence: 0.5,
          });
          prevStart = point;
        }
      }
    }
    return merged.length > 0 ? merged : stableSegments;
  }

  /**
   * Build crop filter with adaptive padding based on face confidence
   */
  private buildMultiFaceCropFilter(
    faceX: number,
    faceY: number,
    confidence: number,
    videoWidth: number,
    videoHeight: number,
    targetRatio: '9:16' | '16:9' | '1:1',
    outputWidth: number,
    outputHeight: number,
    multiFace: boolean,
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

    // Adaptive padding: more padding when confidence is low (uncertain face position)
    const paddingRatio = multiFace ? 0.15 : 0.08;
    const confidencePadding = Math.max(0, 1 - confidence) * 0.1;
    const totalPadding = paddingRatio + confidencePadding;

    const paddedW = Math.round(cropW * (1 + totalPadding));
    const adjustedCropX = Math.max(
      0,
      Math.min(videoWidth - paddedW, Math.round(faceX - paddedW / 2)),
    );

    return `crop=${paddedW}:${cropH}:${adjustedCropX}:0,scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2`;
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
    outputHeight: number,
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
    cropFilter: string,
  ): Promise<string> {
    const args = [
      '-ss',
      String(segment.startTime),
      '-i',
      inputPath,
      '-t',
      String(segment.duration),
      '-vf',
      cropFilter,
      '-c:a',
      'copy',
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
    trackCenter?: { x: number; y: number },
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
    const x = trackCenter
      ? Math.max(0, Math.min(width - cropW, Math.round(trackCenter.x - cropW / 2)))
      : Math.round((width - cropW) / 2);
    const y = trackCenter ? 0 : Math.round((height - cropH) / 2);

    return `crop=${cropW}:${cropH}:${x}:${y},scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`;
  }

  /**
   * Get video dimensions using ffprobe
   */
  private async getVideoDimensions(inputPath: string): Promise<[number, number]> {
    try {
      const { stdout } = await runInWorker(
        'ffprobe',
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width,height',
          '-of',
          'csv=s=x:p=0',
          inputPath,
        ],
        30000,
      );

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
    segments: { start: number; end: number; text: string }[],
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

    // Burn subtitles into video using FFmpeg (use relative path to avoid Windows drive-letter colon)
    const srtFilterPath = filterPath(srtPath);
    const args = [
      '-i',
      inputPath,
      '-vf',
      `subtitles=${srtFilterPath}`,
      '-c:a',
      'copy',
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
    musicVolume: number = 0.3,
  ): Promise<string> {
    Logger.info(`[VideoClipper] Mixing music: ${musicPath}`);

    const args = [
      '-i',
      inputPath,
      '-i',
      musicPath,
      '-filter_complex',
      `[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[outa];[outa]volume=${musicVolume}[out]`,
      '-map',
      '0:v',
      '-map',
      '[out]',
      '-c:v',
      'copy',
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
    layout: 'horizontal' | 'vertical' = 'vertical',
  ): Promise<string> {
    Logger.info(`[VideoClipper] Creating ${layout} split-screen`);

    const filter =
      layout === 'vertical' ? `[0:v][1:v]vstack=inputs=2[out]` : `[0:v][1:v]hstack=inputs=2[out]`;

    const args = [
      '-i',
      topVideoPath,
      '-i',
      bottomVideoPath,
      '-filter_complex',
      filter,
      '-map',
      '[out]',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
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
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'bottom-right',
  ): Promise<string> {
    Logger.info(`[VideoClipper] Adding watermark at ${position}`);

    const overlayX = position.includes('right') ? 'W-w-20' : '20';
    const overlayY = position.includes('top') ? '20' : 'H-h-20';

    const filter = `overlay=${overlayX}:${overlayY}`;

    const args = [
      '-i',
      inputPath,
      '-i',
      watermarkPath,
      '-filter_complex',
      filter,
      '-c:a',
      'copy',
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
