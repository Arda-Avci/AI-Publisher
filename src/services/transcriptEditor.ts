/**
 * Transcript Editor — Edit videos by deleting words from transcript.
 *
 * Uses Whisper word-level timestamps to identify which video segments to remove,
 * then applies FFmpeg `between()` filter or segment/concat to produce the edited video.
 *
 * @module services/transcriptEditor
 */

import fs from 'fs-extra';
import path from 'path';
import { runFFmpeg, runFFmpegWithFallback, getVideoDuration } from './videoService.js';
import { Logger } from '../lib/logger.js';
import { WhisperWord } from '../types/clipper.js';

export interface TimeRange {
  start: number; // seconds (inclusive)
  end: number; // seconds (exclusive)
}

export interface VideoSegment {
  start: number;
  end: number;
  path?: string;
}

export interface TranscriptEditResult {
  outputPath: string;
  removedRanges: TimeRange[];
  keptRanges: TimeRange[];
  durationBefore: number;
  durationAfter: number;
}

/**
 * Parse a transcript string and deletions array to compute time ranges to remove.
 *
 * @param transcript - Full transcript text (words separated by whitespace)
 * @param deletions - Array of word indices (0-based) to delete
 * @param wordTimestamps - Whisper word-level timestamps (must match transcript words)
 * @returns Array of TimeRange objects to remove
 */
export function parseTranscriptEdits(
  transcript: string,
  deletions: number[],
  wordTimestamps: WhisperWord[],
): TimeRange[] {
  if (!deletions || deletions.length === 0) return [];

  const sortedDels = [...new Set(deletions)].sort((a, b) => a - b);
  const ranges: TimeRange[] = [];

  // Merge adjacent or overlapping deletions into ranges
  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;

  for (const idx of sortedDels) {
    if (idx < 0 || idx >= wordTimestamps.length) continue;

    const word = wordTimestamps[idx];
    if (!word) continue;
    if (rangeStart === null) {
      rangeStart = word.start;
      rangeEnd = word.end;
    } else if (word.start <= rangeEnd! + 0.5) {
      // Extend current range (with 0.5s tolerance for adjacent words)
      rangeEnd = Math.max(rangeEnd!, word.end);
    } else {
      // Close current range and start new one
      ranges.push({ start: rangeStart, end: rangeEnd! });
      rangeStart = word.start;
      rangeEnd = word.end;
    }
  }

  if (rangeStart !== null && rangeEnd !== null) {
    ranges.push({ start: rangeStart, end: rangeEnd });
  }

  return ranges;
}

/**
 * Find word timestamps from Whisper transcript output.
 *
 * @param transcript - Full transcript text
 * @param wordTimestamps - Array of WhisperWord objects from Whisper transcription
 * @returns Map of word index to WhisperWord
 */
export function findWordTimestamps(
  transcript: string,
  wordTimestamps: WhisperWord[],
): Map<number, WhisperWord> {
  const words = transcript.split(/\s+/).filter((w) => w.length > 0);
  const wordMap = new Map<number, WhisperWord>();

  // Try to match words to timestamps by text content
  let timestampIdx = 0;
  for (let i = 0; i < words.length && timestampIdx < wordTimestamps.length; i++) {
    const targetWordObj = words[i];
    if (!targetWordObj) continue;
    const targetWord = targetWordObj.toLowerCase().replace(/[.,!?]+$/, '');
    // Find the timestamp that matches this word
    while (timestampIdx < wordTimestamps.length) {
      const tsObj = wordTimestamps[timestampIdx];
      if (!tsObj) {
        timestampIdx++;
        continue;
      }
      const tsWord = tsObj.word.toLowerCase().replace(/[.,!?]+$/, '');
      if (tsWord === targetWord || tsWord.includes(targetWord) || targetWord.includes(tsWord)) {
        wordMap.set(i, tsObj);
        timestampIdx++;
        break;
      }
      timestampIdx++;
    }
  }

  return wordMap;
}

/**
 * Cut video by transcript — removes unwanted time ranges using FFmpeg between() filter.
 *
 * Uses FFmpeg `select` filter with `between()` to KEEP only the desired ranges.
 * This is the inverse of cutting: we keep the good parts and skip the bad parts.
 *
 * @param videoPath - Input video path
 * @param keepRanges - Array of TimeRange to keep (not remove)
 * @param outputPath - Output video path
 */
export async function cutVideoByTranscript(
  videoPath: string,
  keepRanges: TimeRange[],
  outputPath: string,
): Promise<void> {
  if (keepRanges.length === 0) {
    await fs.copy(videoPath, outputPath);
    return;
  }

  // Build FFmpeg select expression: between(t,start,end) OR between(t,start,end)...
  // We select segments to KEEP
  const selectExpr = keepRanges
    .map((r) => `between(t,${r.start.toFixed(3)},${r.end.toFixed(3)})`)
    .join('+');

  const args = [
    '-y',
    '-i',
    videoPath,
    '-vf',
    `select=${selectExpr},setpts=PTS-STARTPTS`,
    '-af',
    `aselect=${selectExpr},asetpts=PTS-STARTPTS`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    outputPath,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info('[transcriptEditor] cutVideoByTranscript complete', {
    outputPath,
    keepRanges: keepRanges.length,
  });
}

/**
 * Assemble multiple video segments into a single video using FFmpeg concat.
 *
 * @param segments - Array of VideoSegment objects with start/end times
 * @param videoPath - Source video path to extract segments from
 * @param outputPath - Output path for assembled video
 */
export async function assembleVideoSegments(
  segments: VideoSegment[],
  videoPath: string,
  outputPath: string,
): Promise<void> {
  if (segments.length === 0) {
    throw new Error('No segments provided for assembly');
  }

  if (segments.length === 1) {
    // Single segment — just extract that portion
    const seg = segments[0];
    if (!seg) {
      throw new Error('No segment found');
    }
    await runFFmpeg('ffmpeg', [
      '-y',
      '-ss',
      seg.start.toFixed(3),
      '-i',
      videoPath,
      '-t',
      (seg.end - seg.start).toFixed(3),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      outputPath,
    ]);
    return;
  }

  // Multiple segments — extract each, then concat
  const tempDir = path.join(process.cwd(), 'videolar', `transcript_edit_${Date.now()}`);
  await fs.ensureDir(tempDir);

  try {
    const segmentPaths: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg) continue;
      const segPath = path.join(tempDir, `seg_${String(i).padStart(3, '0')}.mp4`);
      await runFFmpeg('ffmpeg', [
        '-y',
        '-ss',
        seg.start.toFixed(3),
        '-i',
        videoPath,
        '-t',
        (seg.end - seg.start).toFixed(3),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        segPath,
      ]);
      segmentPaths.push(segPath);
    }

    // Create concat file
    const concatFile = path.join(tempDir, 'concat.txt');
    const concatContent = segmentPaths
      .map((p) => `file '${path.resolve(p).replace(/\\/g, '/')}'`)
      .join('\n');
    await fs.writeFile(concatFile, concatContent);

    await runFFmpeg('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatFile,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      outputPath,
    ]);

    Logger.info('[transcriptEditor] assembleVideoSegments complete', {
      outputPath,
      segmentCount: segments.length,
    });
  } finally {
    await fs.remove(tempDir);
  }
}

/**
 * Edit video by removing words from transcript.
 *
 * Main orchestrator: takes a WhisperWord array and deletion indices,
 * computes time ranges to remove, and produces the edited video.
 *
 * @param videoPath - Input video
 * @param wordTimestamps - Whisper word-level timestamps
 * @param deletions - Array of word indices to delete
 * @param outputPath - Output video path
 * @returns TranscriptEditResult with statistics
 */
export async function editVideoByTranscript(
  videoPath: string,
  wordTimestamps: WhisperWord[],
  deletions: number[],
  outputPath: string,
): Promise<TranscriptEditResult> {
  const durationBefore = await getVideoDuration(videoPath);

  // Compute ranges to REMOVE (inverse of ranges to keep)
  const removeRanges = parseTranscriptEdits('', deletions, wordTimestamps);

  // Compute ranges to KEEP (everything except removed ranges)
  const allRanges: TimeRange[] = [];
  let cursor = 0;

  // Sort remove ranges by start time
  const sortedRemoves = [...removeRanges].sort((a, b) => a.start - b.start);

  for (const rem of sortedRemoves) {
    if (rem.start > cursor) {
      allRanges.push({ start: cursor, end: rem.start });
    }
    cursor = rem.end;
  }

  if (cursor < durationBefore) {
    allRanges.push({ start: cursor, end: durationBefore });
  }

  if (allRanges.length === 0) {
    // Everything was removed — just copy original
    await fs.copy(videoPath, outputPath);
    return {
      outputPath,
      removedRanges: removeRanges,
      keptRanges: [],
      durationBefore,
      durationAfter: durationBefore,
    };
  }

  await cutVideoByTranscript(videoPath, allRanges, outputPath);

  const durationAfter = await getVideoDuration(outputPath);

  return {
    outputPath,
    removedRanges: removeRanges,
    keptRanges: allRanges,
    durationBefore,
    durationAfter,
  };
}
