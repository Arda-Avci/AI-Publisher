/**
 * Subtitle Mixer Service
 * Embeds subtitles and mixes background music with optional audio ducking
 *
 * @example
 * const result = await subtitleMixer.embedSubtitles(videoPath, srtPath, outputPath);
 * await subtitleMixer.mixBackgroundMusic(videoPath, musicPath, outputPath, 0.15);
 * await subtitleMixer.applyAudioDuck(musicPath, voicePath, outputPath);
 * await subtitleMixer.generateSrtFromWhisper(transcript, outputPath);
 */

import path from 'path';
import fs from 'fs-extra';
import { runFFmpeg, getVideoDuration } from '../videoService.js';
import { Logger } from '../../lib/logger.js';
import type {
  WhisperWord,
  SrtEntry,
  SubtitleStyleOptions,
  AudioDuckingOptions,
  SubtitleMixerOptions,
  SubtitleMixerResult,
} from '../../types/clipper.js';

// ── SRT utilities ─────────────────────────────────────────────────────────────

/**
 * Convert seconds to SRT timestamp format (HH:MM:SS,mmm)
 */
function secondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Convert SRT timestamp to seconds
 */
function srtTimeToSeconds(srtTime: string): number {
  const parts = srtTime.split(':');
  const secsParts = parts[2].split(',');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parseInt(secsParts[0], 10);
  const ms = parseInt(secsParts[1], 10);
  return h * 3600 + m * 60 + s + ms / 1000;
}

// ── Subtitle embedding ───────────────────────────────────────────────────────

/**
 * Embed SRT subtitles into a video using FFmpeg subtitles filter.
 * Supports styled subtitles via ASS format conversion.
 *
 * @param videoPath - Source video path
 * @param srtPath - SRT subtitle file path
 * @param outputPath - Destination video path
 * @param styleOptions - Optional subtitle styling
 */
export async function embedSubtitles(
  videoPath: string,
  srtPath: string,
  outputPath: string,
  styleOptions?: SubtitleStyleOptions
): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));

  const style = styleOptions ?? {};
  const primaryColor = style.primaryColor ?? '#FFFFFF';
  const fontSizeRatio = style.fontSizeRatio ?? 0.04;
  const fontFamily = style.fontFamily ?? 'Arial';
  const bold = style.bold ?? false;
  const position = style.position ?? 'bottom';
  const marginX = style.marginX ?? 20;
  const marginY = style.marginY ?? 20;

  // Convert hex color to FFmpeg format (BGR)
  const hexToFfmpegColor = (hex: string): string => {
    let cleaned = hex.replace('#', '');
    if (cleaned.length === 6) {
      const r = cleaned.substring(0, 2);
      const g = cleaned.substring(2, 4);
      const b = cleaned.substring(4, 6);
      return `0x${b}${g}${r}`; // BGR format
    }
    return '0xFFFFFF';
  };

  const ffmpegColor = hexToFfmpegColor(primaryColor);
  const alignment = position === 'top' ? 'top' : position === 'center' ? 'center' : 'bottom';
  const marginV = position === 'top' ? marginY : position === 'bottom' ? marginY : 'h/2';

  // Video boyutlarını al (original_size Windows FFmpeg bug fix için)
  let videoWidth = 1920, videoHeight = 1080;
  try {
    const { stdout } = await runFFmpeg('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=s=x:p=0', videoPath
    ], 15000);
    const dims = stdout?.trim();
    if (dims) {
      const [w, h] = dims.split('x').map(Number);
      if (w && h) { videoWidth = w; videoHeight = h; }
    }
  } catch { /* use defaults */ }

  // Build force_style string for libass
  const forceStyle = [
    `FontName=${fontFamily}`,
    `FontSize=${fontSizeRatio}`,
    `PrimaryColour=${ffmpegColor}`,
    `Bold=${bold ? -1 : 0}`,
    `Alignment=${alignment === 'top' ? 5 : alignment === 'center' ? 6 : 2}`,
    `MarginV=${marginV}`,
    `MarginL=${marginX}`,
    `MarginR=${marginX}`,
  ].join(',');

  const srtEscaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  // original_size Windows FFmpeg libass bug fix
  const vf = `subtitles=${srtEscaped}:force_style='${forceStyle}':original_size=${videoWidth}x${videoHeight}`;

  const args = [
    '-y',
    '-i', videoPath,
    '-vf', vf,
    '-c:a', 'copy',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  try {
    await runFFmpeg('ffmpeg', args, 180000);
    Logger.info(`[SubtitleMixer] Subtitles embedded: ${outputPath}`);
  } catch (err) {
    Logger.error('[SubtitleMixer] Failed to embed subtitles:', err);
    throw err;
  }
}

// ── Background music mixing ──────────────────────────────────────────────────

/**
 * Mix background music into video, looping the music to match video duration.
 *
 * @param videoPath - Source video path
 * @param musicPath - Background music file path
 * @param outputPath - Destination video path
 * @param musicVolume - Music volume (0.0-1.0, default 0.15)
 */
export async function mixBackgroundMusic(
  videoPath: string,
  musicPath: string,
  outputPath: string,
  musicVolume = 0.15
): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));

  const duration = await getVideoDuration(videoPath);

  // Get music duration
  let musicDuration = 0;
  try {
    const { stdout } = await runFFmpeg('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      musicPath,
    ]);
    musicDuration = parseFloat(stdout.trim()) || 0;
  } catch (err) {
    Logger.warn('[SubtitleMixer] Could not get music duration:', err);
  }

  // Calculate loop count to cover video duration
  const loopCount = musicDuration > 0 ? Math.ceil(duration / musicDuration) : 1;
  const musicVolLinear = Math.max(0, Math.min(1, musicVolume));

  // Use AMIX to blend audio streams, with adelay to sync loop starts
  const filter = [
    `[1:a]volume=${musicVolLinear}[music]`,
    `[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
  ].join(';');

  const args = [
    '-y',
    '-i', videoPath,
    '-stream_loop', String(loopCount),
    '-i', musicPath,
    '-filter_complex', filter,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outputPath,
  ];

  try {
    await runFFmpeg('ffmpeg', args, 180000);
    Logger.info(`[SubtitleMixer] Background music mixed: ${outputPath}`);
  } catch (err) {
    Logger.error('[SubtitleMixer] Failed to mix background music:', err);
    throw err;
  }
}

// ── Audio ducking ─────────────────────────────────────────────────────────────

/**
 * Apply audio ducking: lower background music volume when speech is present.
 * Uses FFmpeg's sidechaincompress filter for voice-activated ducking.
 *
 * @param musicPath - Background music path
 * @param voicePath - Speech/voice audio path
 * @param outputPath - Destination audio path
 * @param threshold - Threshold in dB (default -20)
 * @param attack - Attack time in seconds (default 0.3)
 * @param release - Release time in seconds (default 0.8)
 */
export async function applyAudioDuck(
  musicPath: string,
  voicePath: string,
  outputPath: string,
  threshold = -20,
  attack = 0.3,
  release = 0.8
): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));

  // Convert threshold from dB to linear value for sidechaincompress
  // threshold dB means: if voice is above this level, compress music
  const thresholdLinear = Math.pow(10, threshold / 20);

  const filter = [
    `[1:a]volume=0.20[bg]`,
    `[bg][0:a]sidechaincompress=threshold=${thresholdLinear.toFixed(3)}:ratio=3.0:attack=${attack}:release=${release}[bg_ducked]`,
    `[0:a][bg_ducked]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
  ].join(';');

  const args = [
    '-y',
    '-i', voicePath,
    '-i', musicPath,
    '-filter_complex', filter,
    '-map', '[aout]',
    '-c:a', 'aac',
    '-b:a', '192k',
    outputPath,
  ];

  try {
    await runFFmpeg('ffmpeg', args, 180000);
    Logger.info(`[SubtitleMixer] Audio ducking applied: ${outputPath}`);
  } catch (err) {
    Logger.error('[SubtitleMixer] Failed to apply audio ducking:', err);
    throw err;
  }
}

// ── SRT generation from Whisper transcript ───────────────────────────────────

/**
 * Generate an SRT file from Whisper word-level transcript.
 * Performs word-level timing estimation by splitting segment duration evenly.
 *
 * @param transcript - Whisper transcript object with word-level segments
 * @param outputPath - Destination SRT file path
 * @param maxCharsPerLine - Maximum characters per subtitle line (default 42)
 */
export async function generateSrtFromWhisper(
  transcript: { text: string; segments: Array<{ start: number; end: number; text: string; words?: WhisperWord[] }> },
  outputPath: string,
  maxCharsPerLine = 42
): Promise<string> {
  const entries: SrtEntry[] = [];
  let index = 1;

  for (const seg of transcript.segments) {
    const text = seg.text?.trim();
    if (!text) continue;

    // Prefer word-level timestamps when available
    if (seg.words && seg.words.length > 0) {
      let lineWords: WhisperWord[] = [];
      let lineText = '';
      for (const w of seg.words) {
        const candidate = lineText ? lineText + ' ' + w.word : w.word;
        if (candidate.length <= maxCharsPerLine) {
          lineWords.push(w);
          lineText = candidate;
        } else {
          if (lineWords.length > 0) {
            entries.push({
              index: index++,
              startTime: lineWords[0].start,
              endTime: lineWords[lineWords.length - 1].end,
              text: lineText,
            });
          }
          lineWords = [w];
          lineText = w.word;
        }
      }
      if (lineWords.length > 0) {
        entries.push({
          index: index++,
          startTime: lineWords[0].start,
          endTime: lineWords[lineWords.length - 1].end,
          text: lineText,
        });
      }
    } else {
      // Fallback: segment-level word-wrap
      const lines = wrapText(text, maxCharsPerLine);
      const wordDuration = (seg.end - seg.start) / Math.max(lines.join(' ').split(/\s+/).length, 1);

      for (const line of lines) {
        const wordsInLine = line.split(/\s+/).length;
        entries.push({
          index: index++,
          startTime: seg.start,
          endTime: seg.end, // approximate
          text: line,
        });
      }
    }
  }

  // Build SRT content
  const srtContent = entries
    .map(entry => {
      const start = secondsToSrtTime(entry.startTime);
      const end = secondsToSrtTime(entry.endTime);
      return `${entry.index}\n${start} --> ${end}\n${entry.text}`;
    })
    .join('\n\n');

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, srtContent, 'utf-8');
  Logger.info(`[SubtitleMixer] SRT generated: ${outputPath} (${entries.length} entries)`);

  return outputPath;
}

/**
 * Simple word-wrap helper
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

// ── Main Subtitle Mixer class ────────────────────────────────────────────────

export class SubtitleMixer {
  /**
   * Process a video with subtitles and optional background music.
   *
   * @param videoPath - Source video path
   * @param options - Mixer options
   * @returns Mixer result with output paths and flags
   */
  async process(
    videoPath: string,
    options: SubtitleMixerOptions
  ): Promise<SubtitleMixerResult> {
    const {
      srtPath,
      outputPath,
      subtitleStyle,
      musicPath,
      musicVolume = 0.15,
      duckingOptions,
      voicePath,
    } = options;

    await fs.ensureDir(path.dirname(outputPath));
    const duration = await getVideoDuration(videoPath);

    let currentPath = videoPath;
    let subtitlesEmbedded = false;
    let musicMixed = false;
    let duckingApplied = false;
    let finalSrtPath = srtPath;

    // Step 1: Embed subtitles if SRT path is provided
    if (srtPath) {
      const withSubsPath = outputPath.replace(/\.\w+$/, '_subs.mp4');
      await embedSubtitles(currentPath, srtPath, withSubsPath, subtitleStyle);
      currentPath = withSubsPath;
      subtitlesEmbedded = true;
    }

    // Step 2: Mix background music if provided
    if (musicPath) {
      const withMusicPath = currentPath.replace(/\.\w+$/, '_music.mp4');

      if (voicePath && duckingOptions) {
        // First apply ducking to music, then mix with video
        const duckedMusicPath = musicPath.replace(/\.\w+$/, '_ducked.mp3');
        await applyAudioDuck(
          musicPath,
          voicePath,
          duckedMusicPath,
          duckingOptions.thresholdDb ?? -20,
          duckingOptions.attackSec ?? 0.3,
          duckingOptions.releaseSec ?? 0.8
        );
        await mixBackgroundMusic(currentPath, duckedMusicPath, withMusicPath, musicVolume);
        duckingApplied = true;
      } else {
        await mixBackgroundMusic(currentPath, musicPath, withMusicPath, musicVolume);
      }

      currentPath = withMusicPath;
      musicMixed = true;
    }

    // Step 3: Copy to final output path if intermediate steps were applied
    if (currentPath !== outputPath) {
      await fs.copy(currentPath, outputPath);
    }

    return {
      outputPath,
      srtPath: finalSrtPath,
      duration,
      subtitlesEmbedded,
      musicMixed,
      duckingApplied,
    };
  }

  /**
   * Generate an SRT file from Whisper transcript.
   * Alias for the standalone generateSrtFromWhisper function.
   */
  async generateSrtFromWhisper(
    transcript: { text: string; segments: Array<{ start: number; end: number; text: string; words?: WhisperWord[] }> },
    outputPath: string,
    maxCharsPerLine = 42
  ): Promise<string> {
    return generateSrtFromWhisper(transcript, outputPath, maxCharsPerLine);
  }
}

export const subtitleMixer = new SubtitleMixer();
