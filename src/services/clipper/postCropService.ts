/**
 * Post-Crop Service
 * Orchestrates the post-crop pipeline: subtitle burning + audio ducking/music mixing
 */

import path from 'path';
import fs from 'fs-extra';
import { runInWorker } from '../videoService.js';
import { applyKineticSubtitles, applySmartAudioDucking } from '../videoService.js';
import { Logger } from '../../lib/logger.js';
import type { ClipSegment } from './types.js';

export interface SubtitleOptions {
  enabled: boolean;
  primaryColor?: string; // default '#00F2FE' (neon cyan)
  secondaryColor?: string;
  fontPath?: string;
  style?: 'kinetic' | 'static' | 'caption';
}

export interface MusicOptions {
  enabled: boolean;
  musicPath: string;
  volume?: number; // 0.0-1.0, default 0.3
  duckingEnabled?: boolean;
}

export interface PostCropOptions {
  croppedVideoPath: string;
  outputPath: string;
  clipSegment: ClipSegment;
  subtitleOptions?: SubtitleOptions;
  musicOptions?: MusicOptions;
}

/**
 * Format time for SRT subtitles (HH:MM:SS,mmm)
 */
export function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Generate SRT file from clip segments
 */
/**
 * Generate simple SRT for a single clip segment
 */
async function generateSRTForSegment(segment: ClipSegment, outputPath: string): Promise<string> {
  const startTime = formatSRTTime(segment.startTime);
  const endTime = formatSRTTime(segment.endTime);
  const text =
    segment.highlights && segment.highlights.length > 0
      ? segment.highlights.join(' ')
      : segment.suggestedCaption || '';

  const srtContent = `1
${startTime} --> ${endTime}
${text}
`;
  const srtPath = outputPath.replace(/\.\w+$/, '.srt');
  await fs.ensureDir(path.dirname(srtPath));
  await fs.writeFile(srtPath, srtContent, 'utf-8');
  Logger.info(`[PostCropService] SRT generated for segment: ${srtPath}`);
  return srtPath;
}

/**
 * Process post-crop pipeline:
 * 1. Generate SRT from clip segments
 * 2. Burn subtitles using applyKineticSubtitles
 * 3. Mix background music with smart ducking using applySmartAudioDucking
 */
export async function processPostCrop(options: PostCropOptions): Promise<string> {
  const { croppedVideoPath, outputPath, clipSegment, subtitleOptions, musicOptions } = options;

  Logger.info(`[PostCropService] Starting post-crop pipeline for: ${croppedVideoPath}`);

  await fs.ensureDir(path.dirname(outputPath));

  let currentPath = croppedVideoPath;
  const tempFiles: string[] = [];

  try {
    // Step 1: Generate and burn subtitles
    if (subtitleOptions?.enabled) {
      const srtPath = await generateSRTForSegment(clipSegment, outputPath);
      tempFiles.push(srtPath);

      const primaryColor = subtitleOptions.primaryColor || '#00F2FE';
      const secondaryColor = subtitleOptions.secondaryColor || '#FFFFFF';
      const fontPath = subtitleOptions.fontPath;

      const subbedPath = outputPath.replace(/\.mp4$/, '_subbed.mp4');

      Logger.info(`[PostCropService] Burning kinetic subtitles with color: ${primaryColor}`);

      await applyKineticSubtitles(
        currentPath,
        srtPath,
        subbedPath,
        primaryColor,
        secondaryColor,
        fontPath,
      );

      currentPath = subbedPath;
      tempFiles.push(subbedPath);
    }

    // Step 2: Mix background music with smart ducking
    if (musicOptions?.enabled && musicOptions.musicPath) {
      const musicVolume = musicOptions.volume ?? 0.3;
      const duckingEnabled = musicOptions.duckingEnabled ?? true;

      // Check if music file exists
      if (!(await fs.pathExists(musicOptions.musicPath))) {
        Logger.warn(
          `[PostCropService] Music file not found: ${musicOptions.musicPath}, skipping audio mix`,
        );
      } else {
        const musicMixedPath = outputPath.replace(/\.mp4$/, '_music.mp4');

        Logger.info(
          `[PostCropService] Mixing background music with ducking=${duckingEnabled}, volume=${musicVolume}`,
        );

        if (duckingEnabled) {
          // Use smart audio ducking when enabled
          // For this we need speech audio - use the original video's audio as speech source
          await applySmartAudioDucking(
            currentPath,
            currentPath, // speech audio (same as video audio)
            musicOptions.musicPath,
            musicMixedPath,
          );
        } else {
          // Simple music mix without ducking
          const filter = [
            `[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[outa]`,
            `[outa]volume=${musicVolume}[out]`,
          ].join(';');

          const args = [
            '-y',
            '-i',
            currentPath,
            '-i',
            musicOptions.musicPath,
            '-filter_complex',
            filter,
            '-map',
            '0:v',
            '-map',
            '[out]',
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-shortest',
            musicMixedPath,
          ];

          await runInWorker('ffmpeg', args, 120000);
        }

        currentPath = musicMixedPath;
        tempFiles.push(musicMixedPath);
      }
    }

    // Copy final result to output path
    await fs.copy(currentPath, outputPath, { overwrite: true });
    Logger.info(`[PostCropService] Post-crop pipeline complete: ${outputPath}`);

    return outputPath;
  } catch (error) {
    Logger.error(`[PostCropService] Post-crop pipeline failed:`, error);
    // On failure, return original cropped video
    await fs.copy(croppedVideoPath, outputPath, { overwrite: true });
    return outputPath;
  } finally {
    // Cleanup temp files (but not the final output)
    for (const tempFile of tempFiles) {
      if (tempFile !== outputPath && (await fs.pathExists(tempFile))) {
        await fs.remove(tempFile).catch(() => {});
      }
    }
  }
}
