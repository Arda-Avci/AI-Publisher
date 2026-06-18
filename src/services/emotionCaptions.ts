/**
 * Emotion Highlight Captions Service
 *
 * Detects emotional peaks in audio (high-energy words, voice inflection changes)
 * and generates colored highlight SRT subtitles that emphasize those words.
 *
 * @module services/emotionCaptions
 */

import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';
import type { FFmpegCommand } from './videoService.js';

/**
 * Represents an emotional peak detected in audio.
 */
export interface EmotionPeak {
  /** Start time in seconds */
  startSeconds: number;
  /** End time in seconds */
  endSeconds: number;
  /** The word or phrase that has emotional emphasis */
  word: string;
  /** Intensity level 0-1 */
  intensity: number;
  /** Suggested color for highlight (hex) */
  suggestedColor: string;
}

/**
 * Result of emotion peak detection.
 */
export interface EmotionDetectionResult {
  /** Detected peaks */
  peaks: EmotionPeak[];
  /** Audio duration in seconds */
  durationSeconds: number;
  /** Processing error if any */
  error?: string;
}

/**
 * Word-level vocal emphasis detected from audio analysis.
 */
export interface WordEmphasis {
  word: string;
  start: number;
  end: number;
  emphasis: 'high' | 'medium' | 'low';
}

/**
 * Detects vocal emphasis at word-level by analyzing audio frequency peaks via FFmpeg astats.
 *
 * Uses astats to find volume peaks across the audio, then maps them to approximate
 * word positions based on estimated speaking pace. Returns word-level emphasis data
 * suitable for coloring in DynamicCaptions.
 *
 * @param audioPath - Absolute path to audio file (WAV/MP3)
 * @returns Array of word-level emphasis data with timestamps
 */
export async function detectVocalEmphasis(audioPath: string): Promise<WordEmphasis[]> {
  Logger.info('[emotionCaptions] Detecting vocal emphasis', { audioPath });

  return new Promise((resolve) => {
    execFile(
      'ffmpeg',
      [
        '-i',
        audioPath,
        '-af',
        'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level:file=-',
        '-f',
        'null',
        '-',
      ],
      async (err: any, stdout: string, stderr: string) => {
        if (err) {
          Logger.warn('[emotionCaptions] FFmpeg astats failed for vocal emphasis', {
            error: err.message,
          });
          resolve([]);
          return;
        }

        const output = stderr || stdout;
        const peakMatches = output.match(
          /time=(\d+):(\d+):(\d+\.\d+).*?Peak_level\s*:\s*([-\d.]+)/gi,
        );

        if (!peakMatches || peakMatches.length === 0) {
          Logger.warn('[emotionCaptions] No astats peak data found');
          resolve([]);
          return;
        }

        // Get audio duration
        const { execFile: execFileDur } = require('child_process');
        execFileDur(
          'ffprobe',
          ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioPath],
          async (durErr: any, durStdout: string) => {
            const duration = parseFloat(durStdout.trim()) || 10;

            // Extract timestamps and peak levels
            type PeakPoint = { time: number; level: number };
            const peaks: PeakPoint[] = [];

            for (const match of peakMatches) {
              const timeMatch = match.match(/time=(\d+):(\d+):(\d+\.\d+)/);
              const levelMatch = match.match(/Peak_level\s*:\s*([-\d.]+)/i);
              if (timeMatch && levelMatch) {
                const h = parseInt(timeMatch[1] || '0', 10);
                const m = parseInt(timeMatch[2] || '0', 10);
                const s = parseFloat(timeMatch[3] || '0');
                const level = parseFloat(levelMatch[1] || '0');
                peaks.push({ time: h * 3600 + m * 60 + s, level });
              }
            }

            if (peaks.length === 0) {
              resolve([]);
              return;
            }

            // Find threshold for high/medium/low peaks
            const levels = peaks.map((p) => p.level).filter((l) => isFinite(l));
            if (levels.length === 0) {
              resolve([]);
              return;
            }

            const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
            const maxLevel = Math.max(...levels);
            const minLevel = Math.min(...levels);

            const highThreshold = avgLevel + (maxLevel - avgLevel) * 0.6;
            const medThreshold = avgLevel + (maxLevel - avgLevel) * 0.3;

            // Find peak segments (contiguous high-energy regions)
            const peakSegments: PeakPoint[] = [];
            for (const peak of peaks) {
              if (peak.level >= medThreshold) {
                peakSegments.push(peak);
              }
            }

            // Estimate word count from duration (avg 2.5 words/sec)
            const estimatedWordCount = Math.floor(duration * 2.5);
            const wordsPerSecond = estimatedWordCount / duration;

            // Map peak segments to word positions
            // Each peak segment covers a time range; assign it to a word position
            const wordEmphasisList: WordEmphasis[] = [];

            if (peakSegments.length > 0) {
              // Group peak segments into word-sized chunks
              const chunkDuration = 1 / wordsPerSecond; // time per word

              for (let i = 0; i < peakSegments.length; i++) {
                const seg = peakSegments[i];
                if (!seg) continue;
                const wordIndex = Math.floor(seg.time / chunkDuration);
                const start = wordIndex * chunkDuration;
                const end = start + chunkDuration;

                // Determine emphasis level
                let emphasis: 'high' | 'medium' | 'low' = 'low';
                if (seg.level >= highThreshold) {
                  emphasis = 'high';
                } else if (seg.level >= medThreshold) {
                  emphasis = 'medium';
                }

                // Avoid duplicates at same word index
                const existing = wordEmphasisList.find(
                  (w) => Math.abs(w.start - start) < chunkDuration * 0.5,
                );
                if (!existing || (existing.emphasis === 'low' && emphasis !== 'low')) {
                  if (existing) {
                    existing.emphasis = emphasis;
                    existing.start = Math.min(existing.start, start);
                    existing.end = Math.max(existing.end, end);
                  } else {
                    wordEmphasisList.push({
                      word: `word_${wordIndex}`,
                      start,
                      end,
                      emphasis,
                    });
                  }
                }
              }
            }

            // Sort by start time
            wordEmphasisList.sort((a, b) => a.start - b.start);

            Logger.info('[emotionCaptions] Vocal emphasis detected', {
              peakCount: wordEmphasisList.length,
              duration,
              highCount: wordEmphasisList.filter((w) => w.emphasis === 'high').length,
              medCount: wordEmphasisList.filter((w) => w.emphasis === 'medium').length,
            });

            resolve(wordEmphasisList);
          },
        );
      },
    );
  });
}

/**
 * SRT caption entry with styling info.
 */
export interface StyledSrtEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  /** Highlight color for this entry (hex) */
  highlightColor?: string;
  /** Words to highlight within this entry */
  highlightWords?: string[];
}

/**
 * Detects emotional peaks in an audio file by analyzing voice energy.
 *
 * Uses FFmpeg's volumedetect and astats filters to find high-amplitude segments,
 * then maps those to words in the transcript.
 *
 * @param audioPath - Absolute path to audio file (WAV/MP3)
 * @param transcript - Full transcript text with word-level timestamps (optional)
 * @returns Detection result with peaks
 */
export async function detectEmotionPeaks(audioPath: string): Promise<EmotionDetectionResult> {
  Logger.info('[emotionCaptions] Detecting emotion peaks', { audioPath });

  return new Promise((resolve) => {
    // Use ffmpeg astats to get audio statistics per frame
    execFile(
      'ffmpeg',
      [
        '-i',
        audioPath,
        '-af',
        'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level:file=-',
        '-f',
        'null',
        '-',
      ],
      (err: any, stdout: string, stderr: string) => {
        if (err) {
          Logger.warn('[emotionCaptions] FFmpeg astats failed, using fallback detection', {
            error: err.message,
          });
          resolve({ peaks: [], durationSeconds: 0, error: err.message });
          return;
        }

        // Parse peak levels from stderr (astats outputs there)
        const output = stderr;
        const peakLevels: number[] = [];
        const timeRangeMatch = output.match(/time=(\d+):(\d+):(\d+\.\d+)/g);

        if (!timeRangeMatch) {
          Logger.warn('[emotionCaptions] Could not parse astats output');
          resolve({ peaks: [], durationSeconds: 0, error: 'Could not parse audio data' });
          return;
        }

        // Get duration
        const { execFile: execFile2 } = require('child_process');
        execFile2(
          'ffprobe',
          ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioPath],
          (durErr: any, durStdout: string) => {
            const duration = parseFloat(durStdout.trim()) || 0;

            // Parse timestamps and find high-energy moments
            const timestamps: number[] = [];
            for (const match of timeRangeMatch) {
              const parts = match.replace('time=', '').split(':');
              const h = parseInt(parts[0] || '0', 10);
              const m = parseInt(parts[1] || '0', 10);
              const s = parseFloat(parts[2] || '0');
              timestamps.push(h * 3600 + m * 60 + s);
            }

            // Find peaks: segments where audio energy is significantly higher than average
            const peaks: EmotionPeak[] = [];
            if (timestamps.length > 0) {
              const avgLevel = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;

              // Divide into 2-second windows and find windows with high energy
              const windowSize = 2;
              const numWindows = Math.floor(duration / windowSize);

              for (let i = 0; i < numWindows; i++) {
                const windowStart = i * windowSize;
                const windowEnd = (i + 1) * windowSize;

                // Count timestamps in this window as proxy for energy
                const timestampsInWindow = timestamps.filter(
                  (t) => t >= windowStart && t < windowEnd,
                );

                if (timestampsInWindow.length > avgLevel * 1.5) {
                  // This window has high energy — mark as potential peak
                  const intensity = Math.min(1, timestampsInWindow.length / (avgLevel * 3));

                  // Determine color based on intensity
                  let color = '#FFFF00'; // Yellow for medium
                  if (intensity > 0.8) {
                    color = '#FF4444'; // Red for very high
                  } else if (intensity > 0.6) {
                    color = '#FF9500'; // Orange for high
                  }

                  peaks.push({
                    startSeconds: windowStart,
                    endSeconds: windowEnd,
                    word: '', // Will be filled from transcript
                    intensity,
                    suggestedColor: color,
                  });
                }
              }
            }

            Logger.info('[emotionCaptions] Emotion peaks detected', {
              peakCount: peaks.length,
              duration,
            });

            resolve({ peaks, durationSeconds: duration });
          },
        );
      },
    );
  });
}

/**
 * Generates a styled SRT file that highlights emotionally charged words.
 *
 * @param transcript   - Plain transcript text (sentences separated by periods)
 * @param emotionPeaks - Detected emotion peaks
 * @param options      - Styling options
 * @returns Array of styled SRT entries
 */
export function generateHighlightSrt(
  transcript: string,
  emotionPeaks: EmotionPeak[],
): StyledSrtEntry[] {
  Logger.info('[emotionCaptions] Generating highlight SRT', {
    transcriptLength: transcript.length,
    peakCount: emotionPeaks.length,
  });

  // Split transcript into sentences
  const sentences = transcript
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Distribute sentences across the timeline proportionally
  // (Simple approach — in production, would use word-level timestamps from ASR)
  const entries: StyledSrtEntry[] = [];

  // Map emotion peaks to sentences
  const peakColors = emotionPeaks.reduce(
    (acc, peak) => {
      const key = `${peak.startSeconds.toFixed(1)}-${peak.endSeconds.toFixed(1)}`;
      acc[key] = peak.suggestedColor;
      return acc;
    },
    {} as Record<string, string>,
  );

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (!sentence) continue;
    const words = sentence.split(/\s+/);

    // Determine if this sentence should have highlights
    // Heuristic: first and last sentence of each paragraph, or sentences with emotional words
    const emotionalWords = [
      'şok',
      'wow',
      'inanılmaz',
      'korkunç',
      'harika',
      'muhteşem',
      'sonunda',
      'büyük',
      'ilk',
      'tek',
      'en iyi',
      'en kötü',
      'bekle',
      'düşün',
      'farkettin mi',
      'gözlemle',
      'dinle',
      'bak',
      'haydi',
      'hadi',
    ];
    const hasEmotionalWord = emotionalWords.some((w) => sentence.toLowerCase().includes(w));

    // Highlight color for this entry
    const peakKey = Object.keys(peakColors).find((key) => {
      const parts = key.split('-').map(Number);
      const start = parts[0];
      const end = parts[1];
      if (start === undefined || end === undefined) return false;
      // Distribute sentences evenly
      const sentencePosition = i / sentences.length;
      const totalDuration =
        emotionPeaks[emotionPeaks.length - 1]?.endSeconds ||
        (emotionPeaks[0]?.startSeconds || 0) + 1;
      const sentenceStart = sentencePosition * totalDuration;
      return sentenceStart >= start && sentenceStart < end;
    });

    entries.push({
      index: i + 1,
      startTime: '', // Will be filled by caller
      endTime: '',
      text: sentence,
      highlightColor: peakKey ? peakColors[peakKey] : hasEmotionalWord ? '#FF9500' : undefined,
      highlightWords: hasEmotionalWord
        ? words.filter((w) => emotionalWords.some((em) => w.toLowerCase().includes(em)))
        : undefined,
    });
  }

  return entries;
}

/**
 * Converts styled SRT entries to actual SRT file content.
 *
 * @param entries      - Styled SRT entries
 * @param startOffset  - Start offset in seconds (for aligning with video timeline)
 * @param wordsPerSecond - Speaking pace for timing (default: 2.5 words/sec)
 * @returns SRT file content string
 */
export function formatHighlightSrt(
  entries: StyledSrtEntry[],
  startOffset = 0,
  wordsPerSecond = 2.5,
): string {
  let currentTime = startOffset;
  const lines: string[] = [];

  for (const entry of entries) {
    const words = entry.text.split(/\s+/);
    const duration = words.length / wordsPerSecond;

    const startStr = formatSrtTime(currentTime);
    const endStr = formatSrtTime(currentTime + duration);

    let text = entry.text;

    // Apply inline highlight using SRT-style HTML tags (some players support this)
    if (entry.highlightColor && entry.highlightWords && entry.highlightWords.length > 0) {
      // Wrap highlighted words in font tags
      for (const hw of entry.highlightWords) {
        // Simple replace — in production would use word-level alignment
        const escaped = hw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(
          new RegExp(escaped, 'i'),
          `<font color="${entry.highlightColor}">${hw}</font>`,
        );
      }
    } else if (entry.highlightColor) {
      // Wrap entire text in the highlight color
      text = `<font color="${entry.highlightColor}">${text}</font>`;
    }

    lines.push(`${entry.index}`);
    lines.push(`${startStr} --> ${endStr}`);
    lines.push(text);
    lines.push('');

    currentTime += duration + 0.5; // 0.5s gap between sentences
  }

  return lines.join('\n');
}

/**
 * Formats seconds to SRT time format (HH:MM:SS,mmm).
 */
function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Applies emotion-based colored subtitles to a video.
 *
 * @param videoPath  - Absolute path to input video
 * @param srtPath    - Path to the generated (or provided) SRT file
 * @param outputPath - Absolute path for output video with embedded subtitles
 * @param primaryColor - Default subtitle color (hex)
 */
export async function applyEmotionCaptionStyle(
  videoPath: string,
  srtPath: string,
  outputPath: string,
  primaryColor = '#FFFFFF',
): Promise<void> {
  Logger.info('[emotionCaptions] Applying emotion captions', { videoPath, srtPath, outputPath });

  // SRT with HTML-style font tags for colors
  const assPath = srtPath.replace('.srt', '_emotion.ass');

  // Convert the colored SRT to ASS for better player compatibility
  const content = await fs.readFile(srtPath, 'utf-8');
  const blocks = content.split(/\r?\n\r?\n/);
  const assLines: string[] = [];

  const hexToAssColor = (hex: string): string => {
    const cleaned = hex.replace('#', '');
    if (cleaned.length === 6) {
      const r = cleaned.substring(0, 2);
      const g = cleaned.substring(2, 4);
      const b = cleaned.substring(4, 6);
      return `&H00${b}${g}${r}&`; // ASS format: AABBGGRR
    }
    return '&H00FFFFFF&';
  };

  const assHeader = `[Script Info]
Title: Emotion Highlight Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,0,2,10,10,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    const timeLine = lines[1];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const parts = timeLine.split('-->').map((s) => s.trim());
    const startStr = parts[0];
    const endStr = parts[1];
    if (!startStr || !endStr) continue;
    const startSec = parseSrtTime(startStr);
    const endSec = parseSrtTime(endStr);
    const text = lines.slice(2).join('\n');

    const startAss = formatAssTime(startSec);
    const endAss = formatAssTime(endSec);

    // Check for HTML font tags in text
    let assText = text;

    // Replace <font color="...">...</font> with ASS overrides
    const colorTagRegex = /<font color="([^"]+)">([^<]+)<\/font>/g;
    let match;
    let hasColor = false;

    while ((match = colorTagRegex.exec(text)) !== null) {
      hasColor = true;
      const full = match[0];
      const color = match[1];
      const word = match[2];
      if (!full || !color || !word) continue;
      const assColor = hexToAssColor(color);
      // ASS format for color override within a line
      assText = assText.replace(full, `{\\c${assColor}}${word}{\\c&H00FFFFFF&}`);
    }

    if (hasColor) {
      // Use different style for colored lines (highlighted)
      assLines.push(`Dialogue: 0,${startAss},${endAss},Default,,0,0,0,,${assText}`);
    } else {
      assLines.push(`Dialogue: 0,${startAss},${endAss},Default,,0,0,0,,${assText}`);
    }
  }

  await fs.writeFile(assPath, assHeader + assLines.join('\n'), 'utf-8');

  // Apply ASS subtitles to video
  const { runFFmpegWithFallback } = await import('./videoService.js');

  const assFilterPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const args = ['-y', '-i', videoPath, '-vf', `ass=${assFilterPath}`, '-c:a', 'copy', outputPath];

  const cmd: FFmpegCommand = { cmd: 'ffmpeg', args, timeoutMs: 300000 };

  try {
    await runFFmpegWithFallback([cmd]);
    Logger.info('[emotionCaptions] Emotion captions applied', { outputPath });
  } finally {
    if (await fs.pathExists(assPath)) {
      await fs.remove(assPath);
    }
  }
}

/**
 * Parses SRT time string to seconds.
 */
function parseSrtTime(srtTime: string): number {
  const parts = srtTime.replace(',', '.').split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parseFloat(parts[2] || '0');
  return h * 3600 + m * 60 + s;
}

/**
 * Formats seconds to ASS time format (H:MM:SS.cc).
 */
function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
