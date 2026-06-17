/**
 * Studio Sound Enhancement Service
 *
 * Applies professional audio enhancement filters using FFmpeg:
 * - High-pass filter (removes low-frequency rumble below 200Hz)
 * - Low-pass filter (removes high-frequency hiss above 3000Hz)
 * - Adaptive denoise (afftdn filter for studio-quality clean audio)
 *
 * @module services/studioSound
 */

import { runFFmpeg, runFFmpegWithFallback, FFmpegCommand } from './videoService.js';
import { Logger } from '../lib/logger.js';

/**
 * Audio enhancement options.
 */
export interface StudioSoundOptions {
  /** Apply adaptive denoise filter (default: true) */
  denoise?: boolean;
  /** Apply audio equalization (default: false) */
  equalize?: boolean;
  /** Apply echo/reverb reduction (default: true) */
  deecho?: boolean;
  /** Output level in dB (default: -3) */
  levelDb?: number;
}

/**
 * Default enhancement options.
 */
const DEFAULT_OPTIONS: StudioSoundOptions = {
  denoise: true,
  equalize: false,
  deecho: true,
  levelDb: -3,
};

/**
 * Enhances audio quality of a video file using FFmpeg filters.
 *
 * Filter chain:
 *   highpass=f=200  - Removes frequencies below 200Hz (rumble, HVAC)
 *   lowpass=f=3000  - Removes frequencies above 3000Hz (hiss, tape noise)
 *   afftdn=nr=10:nf=-20 - Adaptive denoise (noise reduction level 10, floor -20dB)
 *   loudnorm        - EBU R128 loudness normalization
 *
 * @param inputVideo  - Absolute path to input video
 * @param outputVideo - Absolute path to output video
 * @param options     - Enhancement options
 */
export async function enhanceAudio(
  inputVideo: string,
  outputVideo: string,
  options: StudioSoundOptions = DEFAULT_OPTIONS,
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  Logger.info('[studioSound] Starting audio enhancement', { inputVideo, outputVideo, opts });

  // Build filter chain
  const filterParts: string[] = [];

  // High-pass: remove low-end rumble
  filterParts.push('highpass=f=200');

  // Low-pass: remove high-end hiss
  filterParts.push('lowpass=f=3000');

  // Adaptive denoise
  if (opts.denoise) {
    filterParts.push('afftdn=nr=10:nf=-20');
  }

  // Echo/reverb reduction (anlmdn for stationary noise + dynaudnorm for dynamic range)
  if (opts.deecho) {
    filterParts.push('anlmdn=s=7:p=0.005');
    filterParts.push('dynaudnorm=g=15:f=150');
  }

  // Equalization curve (broadcast-ready tilt)
  if (opts.equalize) {
    // Gentle presence boost at 2-4kHz for voice clarity
    filterParts.push('equalizer=f=3000:t=h:width_type=s:width=0.5:g=2');
    filterParts.push('equalizer=f=300:t=h:width_type=s:width=0.5:g=-1');
  }

  // Loudness normalization (EBU R128)
  filterParts.push(
    `loudnorm=I=${opts.levelDb ?? -3}:LRA=11:TP=${(opts.levelDb ?? -3) + 1}:measured_type=integrated`,
  );

  const filterChain = filterParts.join(',');

  const args = [
    '-y',
    '-i',
    inputVideo,
    '-vn', // Skip video stream
    '-af',
    filterChain,
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000', // Sample rate
    outputVideo,
  ];

  const cmd: FFmpegCommand = { cmd: 'ffmpeg', args, timeoutMs: 120000 };

  try {
    await runFFmpegWithFallback([cmd]);
    Logger.info('[studioSound] Audio enhancement completed', { outputVideo });
  } catch (err: any) {
    Logger.error('[studioSound] Enhancement failed', err);
    throw err;
  }
}

/**
 * Applies studio sound enhancement to a video file (processes both audio and video streams).
 * Video is pass-through, audio is enhanced.
 *
 * @param inputVideo  - Absolute path to input video
 * @param outputVideo - Absolute path to output video
 * @param options     - Enhancement options
 */
export async function enhanceVideoAudio(
  inputVideo: string,
  outputVideo: string,
  options: StudioSoundOptions = DEFAULT_OPTIONS,
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  Logger.info('[studioSound] Starting video+audio enhancement', { inputVideo, outputVideo, opts });

  const filterParts: string[] = [];

  filterParts.push('highpass=f=200');
  filterParts.push('lowpass=f=3000');

  if (opts.denoise) {
    filterParts.push('afftdn=nr=10:nf=-20');
  }

  if (opts.deecho) {
    filterParts.push('anlmdn=s=7:p=0.005');
    filterParts.push('dynaudnorm=g=15:f=150');
  }

  if (opts.equalize) {
    filterParts.push('equalizer=f=3000:t=h:width_type=s:width=0.5:g=2');
    filterParts.push('equalizer=f=300:t=h:width_type=s:width=0.5:g=-1');
  }

  filterParts.push(
    `loudnorm=I=${opts.levelDb ?? -3}:LRA=11:TP=${(opts.levelDb ?? -3) + 1}:measured_type=integrated`,
  );

  const filterChain = filterParts.join(',');

  const args = [
    '-y',
    '-i',
    inputVideo,
    '-af',
    filterChain,
    '-c:v',
    'copy', // Pass-through video
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    outputVideo,
  ];

  const cmd: FFmpegCommand = { cmd: 'ffmpeg', args, timeoutMs: 120000 };

  try {
    await runFFmpegWithFallback([cmd]);
    Logger.info('[studioSound] Video+audio enhancement completed', { outputVideo });
  } catch (err: any) {
    Logger.error('[studioSound] Video+audio enhancement failed', err);
    throw err;
  }
}

/**
 * Removes background noise from an audio file using FFmpeg afftdn filter.
 *
 * @param audioPath  - Absolute path to input audio/video file
 * @param outputPath - Absolute path for output audio file
 * @returns Path to the noise-reduced audio file
 */
export async function removeBackgroundNoise(
  audioPath: string,
  outputPath: string,
): Promise<string> {
  Logger.info('[studioSound] Removing background noise', { audioPath, outputPath });

  const args = [
    '-y',
    '-i',
    audioPath,
    '-af',
    'afftdn=nl=1:nh=0.5:nf=-25',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    outputPath,
  ];

  try {
    await runFFmpegWithFallback([{ cmd: 'ffmpeg', args, timeoutMs: 120000 }]);
    Logger.info('[studioSound] Background noise removal completed', { outputPath });
    return outputPath;
  } catch (err: any) {
    Logger.error('[studioSound] Background noise removal failed', err);
    throw err;
  }
}

/**
 * Removes reverb/echo from an audio file using FFmpeg aecho filter.
 *
 * @param audioPath  - Absolute path to input audio/video file
 * @param outputPath - Absolute path for output audio file
 * @returns Path to the reverb-reduced audio file
 */
export async function removeReverb(audioPath: string, outputPath: string): Promise<string> {
  Logger.info('[studioSound] Removing reverb', { audioPath, outputPath });

  const args = [
    '-y',
    '-i',
    audioPath,
    '-af',
    'aecho=0.8:0.88:60:0.4:200:0.3',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    outputPath,
  ];

  try {
    await runFFmpegWithFallback([{ cmd: 'ffmpeg', args, timeoutMs: 120000 }]);
    Logger.info('[studioSound] Reverb removal completed', { outputPath });
    return outputPath;
  } catch (err: any) {
    Logger.error('[studioSound] Reverb removal failed', err);
    throw err;
  }
}
