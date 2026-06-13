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
    const cropFilter = this.calculateCropFilter(inputPath, aspectRatio, trackCenter);

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
   * Calculate FFmpeg crop filter based on aspect ratio and face tracking
   */
  private calculateCropFilter(
    inputPath: string,
    targetRatio: '9:16' | '16:9' | '1:1',
    _trackCenter?: { x: number; y: number }
  ): string {
    // For now, simple center crop
    // Face tracking would require OpenCV integration
    const [width, height] = this.getVideoDimensions(inputPath);

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

    // Center crop
    const x = Math.round((width - cropW) / 2);
    const y = Math.round((height - cropH) / 2);

    return `crop=${cropW}:${cropH}:${x}:${y},scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`;
  }

  /**
   * Get video dimensions (placeholder - would need ffprobe)
   */
  private getVideoDimensions(_inputPath: string): [number, number] {
    // Default to 1920x1080
    // In real implementation, use ffprobe to get actual dimensions
    return [1920, 1080];
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