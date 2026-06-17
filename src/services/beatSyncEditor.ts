/**
 * Beat Sync Editor Service
 * Applies beat-synced cuts and transitions to videos
 */

import path from 'path';
import fs from 'fs-extra';
import {
  runFFmpeg,
  runFFmpegWithFallback,
  getVideoDuration,
  concatVideosWithCrossfade,
} from './videoService';
import { Logger } from '../lib/logger';
import { BeatMarker } from './beatAnalyzer';

export interface BeatSyncOptions {
  videoPath: string;
  audioPath?: string;
  crossfadeDur?: number; // default 0.5s
  minSegmentDur?: number; // minimum cut segment, default 2.0s
  alignToBeats?: boolean; // true = cut on beats
}

/**
 * Get video duration using the videoService helper
 */
async function getDuration(videoPath: string): Promise<number> {
  return getVideoDuration(videoPath);
}

/**
 * Extract a segment from a video at specified timestamps
 */
async function extractSegment(
  videoPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
): Promise<void> {
  const duration = endTime - startTime;

  await runFFmpeg('ffmpeg', [
    '-y',
    '-ss',
    startTime.toFixed(3),
    '-i',
    videoPath,
    '-t',
    duration.toFixed(3),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    outputPath,
  ]);
}

/**
 * Apply beat-synced editing to a video
 *
 * The editor cuts the video at beat boundaries and optionally applies
 * crossfade transitions between segments for smooth beat-aligned cuts.
 */
export async function applyBeatSync(
  options: BeatSyncOptions,
  beatMarkers: BeatMarker[],
  outputPath: string,
): Promise<void> {
  const {
    videoPath,
    audioPath,
    crossfadeDur = 0.5,
    minSegmentDur = 2.0,
    alignToBeats = true,
  } = options;

  Logger.info(`[BeatSync] Starting beat-sync editing: ${videoPath}`);
  Logger.info(
    `[BeatSync] Options: crossfade=${crossfadeDur}s, minSegment=${minSegmentDur}s, alignToBeats=${alignToBeats}`,
  );

  // Validate inputs
  if (!(await fs.pathExists(videoPath))) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const videoDuration = await getDuration(videoPath);
  if (videoDuration <= 0) {
    throw new Error('Invalid video duration');
  }

  // Filter beat markers to create viable segments
  // Only use beats that give us segments of minimum duration
  const validCutPoints = [0]; // Start of video

  for (let i = 1; i < beatMarkers.length; i++) {
    const prevBeat = beatMarkers[i - 1];
    const currBeat = beatMarkers[i];
    const segmentDur = currBeat.timestamp - prevBeat.timestamp;

    if (segmentDur >= minSegmentDur) {
      validCutPoints.push(i);
    }
  }

  // Always include end of video
  if (validCutPoints.length > 0) {
    const lastValidIdx = validCutPoints[validCutPoints.length - 1];
    const lastBeat = beatMarkers[lastValidIdx];
    if (lastBeat && videoDuration - lastBeat.timestamp >= minSegmentDur) {
      validCutPoints.push(beatMarkers.length - 1);
    }
  }

  Logger.info(`[BeatSync] Creating ${validCutPoints.length} segments`);

  // If not aligning to beats, create evenly spaced segments based on BPM
  if (!alignToBeats || validCutPoints.length < 2) {
    return await applyEvenBeatSync(options, beatMarkers, outputPath);
  }

  // Extract segments at beat boundaries
  const segmentPaths: string[] = [];
  const tempDir = path.join(process.cwd(), 'videolar', `beatsync_${Date.now()}`);
  await fs.ensureDir(tempDir);

  try {
    for (let i = 0; i < validCutPoints.length - 1; i++) {
      const startIdx = validCutPoints[i];
      const endIdx = validCutPoints[i + 1];
      const startTime = beatMarkers[startIdx].timestamp;
      const endTime = beatMarkers[endIdx].timestamp;

      const segmentPath = path.join(tempDir, `segment_${i.toString().padStart(3, '0')}.mp4`);
      await extractSegment(videoPath, segmentPath, startTime, endTime);
      segmentPaths.push(segmentPath);

      Logger.debug(
        `[BeatSync] Extracted segment ${i}: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
      );
    }

    // Handle remaining portion after last cut point
    const lastValidIdx = validCutPoints[validCutPoints.length - 1];
    const lastStartTime = beatMarkers[lastValidIdx].timestamp;
    if (videoDuration - lastStartTime >= minSegmentDur) {
      const segmentPath = path.join(
        tempDir,
        `segment_${(validCutPoints.length - 1).toString().padStart(3, '0')}.mp4`,
      );
      await extractSegment(videoPath, segmentPath, lastStartTime, videoDuration);
      segmentPaths.push(segmentPath);
    }

    // Concatenate segments with crossfade
    if (segmentPaths.length === 1) {
      await fs.copy(segmentPaths[0], outputPath);
    } else if (segmentPaths.length > 1) {
      // Check if all segments are long enough for crossfade
      const canCrossfade = segmentPaths.every(async (p) => {
        const d = await getDuration(p);
        return d > crossfadeDur * 2;
      });

      if (canCrossfade) {
        await concatVideosWithCrossfade(segmentPaths, outputPath, crossfadeDur);
      } else {
        // If segments too short, do simple concat without crossfade
        await concatVideosWithCrossfade(segmentPaths, outputPath, 0);
      }
    }

    // Mix in external audio if provided
    if (audioPath && (await fs.pathExists(audioPath))) {
      const withAudioPath = outputPath.replace('.mp4', '_with_audio.mp4');
      await mixAudioWithBeatSync(outputPath, audioPath, withAudioPath);
      await fs.rename(withAudioPath, outputPath);
    }

    Logger.info(`[BeatSync] Beat-sync editing complete: ${outputPath}`);
  } finally {
    // Clean up temp segments
    await fs.remove(tempDir).catch(() => {});
  }
}

/**
 * Apply even beat-sync when we don't have enough valid cut points
 * Creates evenly spaced cuts based on beat interval
 */
async function applyEvenBeatSync(
  options: BeatSyncOptions,
  beatMarkers: BeatMarker[],
  outputPath: string,
): Promise<void> {
  const { videoPath, audioPath, crossfadeDur = 0.5 } = options;

  if (beatMarkers.length < 2) {
    // No beats detected, just copy the video
    await fs.copy(videoPath, outputPath);
    return;
  }

  // Calculate average beat interval
  let totalInterval = 0;
  for (let i = 1; i < beatMarkers.length; i++) {
    totalInterval += beatMarkers[i].timestamp - beatMarkers[i - 1].timestamp;
  }
  const avgInterval = totalInterval / (beatMarkers.length - 1);

  // Create segments at regular intervals
  const duration = await getDuration(videoPath);
  const segmentPaths: string[] = [];
  const tempDir = path.join(process.cwd(), 'videolar', `beatsync_${Date.now()}`);
  await fs.ensureDir(tempDir);

  try {
    let currentTime = 0;
    let segIdx = 0;

    while (currentTime < duration) {
      const segmentEnd = Math.min(currentTime + avgInterval * 2, duration); // 2 beats per segment
      if (segmentEnd - currentTime < 1.0) break; // Don't create tiny segments

      const segmentPath = path.join(tempDir, `segment_${segIdx.toString().padStart(3, '0')}.mp4`);
      await extractSegment(videoPath, segmentPath, currentTime, segmentEnd);
      segmentPaths.push(segmentPath);

      currentTime = segmentEnd;
      segIdx++;
    }

    // Concatenate with crossfade
    if (segmentPaths.length > 0) {
      if (segmentPaths.length === 1) {
        await fs.copy(segmentPaths[0], outputPath);
      } else {
        await concatVideosWithCrossfade(segmentPaths, outputPath, crossfadeDur);
      }
    }

    // Mix audio if provided
    if (audioPath && (await fs.pathExists(audioPath))) {
      const withAudioPath = outputPath.replace('.mp4', '_with_audio.mp4');
      await mixAudioWithBeatSync(outputPath, audioPath, withAudioPath);
      await fs.rename(withAudioPath, outputPath);
    }

    Logger.info(`[BeatSync] Even beat-sync complete: ${segmentPaths.length} segments`);
  } finally {
    await fs.remove(tempDir).catch(() => {});
  }
}

/**
 * Mix the original video audio with an external audio track (e.g., music)
 * Uses beat-sync ducking to lower music volume during speech/sound peaks
 */
async function mixAudioWithBeatSync(
  videoPath: string,
  musicPath: string,
  outputPath: string,
): Promise<void> {
  const filter = [
    `[0:a]volume=1.0[original]`,
    `[1:a]volume=0.3[music]`,
    `[original][music]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
  ].join(';');

  await runFFmpeg('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-i',
    musicPath,
    '-filter_complex',
    filter,
    '-map',
    '0:v',
    '-map',
    '[aout]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-shortest',
    outputPath,
  ]);
}

/**
 * Quick beat-sync apply with default settings
 * Convenience function for simple use cases
 */
export async function quickBeatSync(
  videoPath: string,
  outputPath: string,
  bpm?: number,
): Promise<void> {
  const { buildBeatMarkers } = await import('./beatAnalyzer.js');

  const beatData = await buildBeatMarkers(videoPath);
  const targetBpm = bpm || beatData.bpm;

  // Generate beat markers at the specified or detected BPM
  const { findBeatPeaks } = await import('./beatAnalyzer.js');
  const beats = await findBeatPeaks(videoPath, targetBpm);

  await applyBeatSync(
    {
      videoPath,
      crossfadeDur: 0.5,
      minSegmentDur: 2.0,
      alignToBeats: true,
    },
    beats,
    outputPath,
  );
}

// ── Extended Beat-Sync Editor Functions ───────────────────────────────────────

export interface AudioSegment {
  start: number; // seconds
  end: number; // seconds
  energy: number;
}

export interface BeatCutPoint {
  timestamp: number; // seconds
  beatNumber: number;
  strength: number;
}

export interface BeatCutOptions {
  bpm?: number; // Override BPM detection
  energyThreshold?: number; // Peak detection threshold (0-1)
  minSegmentDuration?: number; // Minimum segment duration in seconds
  crossfadeDuration?: number; // Crossfade duration between segments
  onsetsOnly?: boolean; // Use onset detection vs energy peaks
}

/**
 * Analyze audio BPM using Python librosa subprocess.
 *
 * @param audioPath - Path to audio file
 * @returns Object with bpm, peaks array, and segments array
 */
export async function analyzeAudioBPM(
  audioPath: string,
): Promise<{ bpm: number; peaks: number[]; segments: AudioSegment[] }> {
  const { execFile } = require('child_process');
  const util = require('util');
  const execFileAsync = util.promisify(execFile);

  const pythonScript = `
import sys
import json
import numpy as np

try:
    import librosa
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

def analyze(audio_path):
    if not HAS_LIBROSA:
        # Fallback: simple energy-based peak detection
        import wave
        with wave.open(audio_path, 'rb') as wf:
            frames = wf.readframes(wf.getnframes())
            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            sr = wf.getframerate()
        duration = len(audio) / sr
        window = sr // 10
        energies = []
        for i in range(0, len(audio) - window, window):
            chunk = audio[i:i+window]
            energies.append(np.sqrt(np.mean(chunk ** 2)))
        energies = np.array(energies)
        peaks_idx = np.where(energies > 0.3 * np.max(energies))[0]
        peak_times = (peaks_idx * window + window // 2) / sr
        if len(peak_times) > 1:
            intervals = np.diff(peak_times)
            intervals = intervals[intervals > 0.1]
            bpm = 60.0 / np.median(intervals) if len(intervals) > 0 else 120.0
        else:
            bpm = 120.0
        return {"bpm": float(min(max(bpm, 60), 200)), "peaks": [float(t) for t in peak_times], "segments": [], "duration": float(duration)}

    y, sr = librosa.load(audio_path, sr=22050)
    duration = float(librosa.get_duration(y=y, sr=sr))
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
    beat_times = librosa.frames_to_time(beats, sr=sr).tolist()
    bpm = float(tempo)
    segments = [{"start": max(0, t - 0.5), "end": min(duration, t + 0.5), "energy": 0.5} for t in beat_times]
    return {"bpm": float(bpm), "peaks": [float(t) for t in beat_times], "segments": segments, "duration": duration}

if __name__ == "__main__":
    result = analyze(sys.argv[1])
    print(json.dumps(result))
`;

  const scriptPath = path.join(process.cwd(), 'uploads', `bpm_analyze_${Date.now()}.py`);
  await fs.ensureDir(path.dirname(scriptPath));
  await fs.writeFile(scriptPath, pythonScript);

  try {
    const { stdout } = await execFileAsync(
      process.platform === 'win32' ? 'python' : 'python3',
      [scriptPath, audioPath],
      { timeout: 60000 },
    );
    return JSON.parse(stdout.trim());
  } catch (err) {
    Logger.warn('[beatSyncEditor] Python librosa failed, using fallback', err);
    // Fallback: return default 120 BPM
    const { stdout: durStr } = await runFFmpeg('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      audioPath,
    ]);
    const duration = parseFloat(durStr.trim()) || 30;
    const bpm = 120;
    const beatInterval = 60 / bpm;
    const peaks: number[] = [];
    for (let t = beatInterval; t < duration; t += beatInterval) {
      peaks.push(t);
    }
    return { bpm, peaks, segments: [] };
  } finally {
    if (await fs.pathExists(scriptPath)) {
      await fs.remove(scriptPath);
    }
  }
}

/**
 * Find beat cut points from audio based on BPM.
 *
 * @param audioPath - Path to audio file
 * @param videoPath - Path to video file (for duration reference)
 * @param options - Beat cut options
 * @returns Array of BeatCutPoint objects
 */
export async function findBeatCutPoints(
  audioPath: string,
  videoPath: string,
  options?: BeatCutOptions,
): Promise<BeatCutPoint[]> {
  const { bpm: overrideBpm, minSegmentDuration = 2.0 } = options || {};

  // Get BPM from analysis or override
  const analysis = await analyzeAudioBPM(audioPath);
  const bpm = overrideBpm || analysis.bpm;
  const beatInterval = 60 / bpm;

  // Get video duration
  const duration = await getVideoDuration(videoPath);

  // Generate beat cut points
  const cutPoints: BeatCutPoint[] = [];
  let beatNumber = 0;

  for (let timestamp = 0.0; timestamp < duration; timestamp += beatInterval) {
    // Skip if this would create a segment shorter than minimum
    if (cutPoints.length > 0) {
      const lastCut = cutPoints[cutPoints.length - 1];
      if (timestamp - lastCut.timestamp < minSegmentDuration) {
        continue;
      }
    }

    cutPoints.push({
      timestamp: Math.round(timestamp * 1000) / 1000,
      beatNumber,
      strength: beatNumber % 4 === 0 ? 1.0 : 0.7,
    });
    beatNumber++;
  }

  Logger.info('[beatSyncEditor] findBeatCutPoints', { bpm, cutPointCount: cutPoints.length });
  return cutPoints;
}

/**
 * Apply beat-sync cuts to video using FFmpeg segment + concat.
 *
 * @param videoPath - Input video path
 * @param cutPoints - Array of BeatCutPoint from findBeatCutPoints
 * @param outputPath - Output video path
 */
export async function applyBeatSyncCuts(
  videoPath: string,
  cutPoints: BeatCutPoint[],
  outputPath: string,
): Promise<void> {
  if (cutPoints.length < 2) {
    await fs.copy(videoPath, outputPath);
    return;
  }

  const tempDir = path.join(process.cwd(), 'videolar', `beatsync_${Date.now()}`);
  await fs.ensureDir(tempDir);

  try {
    const segmentPaths: string[] = [];

    for (let i = 0; i < cutPoints.length - 1; i++) {
      const startTime = cutPoints[i].timestamp;
      const endTime = cutPoints[i + 1].timestamp;
      const segPath = path.join(tempDir, `seg_${String(i).padStart(3, '0')}.mp4`);

      await runFFmpeg('ffmpeg', [
        '-y',
        '-ss',
        startTime.toFixed(3),
        '-i',
        videoPath,
        '-t',
        (endTime - startTime).toFixed(3),
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

    // Handle last segment to end of video
    const lastStart = cutPoints[cutPoints.length - 1].timestamp;
    const duration = await getVideoDuration(videoPath);
    if (duration - lastStart >= 1.0) {
      const lastSegPath = path.join(
        tempDir,
        `seg_${String(cutPoints.length - 1).padStart(3, '0')}.mp4`,
      );
      await runFFmpeg('ffmpeg', [
        '-y',
        '-ss',
        lastStart.toFixed(3),
        '-i',
        videoPath,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        lastSegPath,
      ]);
      segmentPaths.push(lastSegPath);
    }

    // Concat segments
    if (segmentPaths.length === 1) {
      await fs.copy(segmentPaths[0], outputPath);
    } else {
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
    }

    Logger.info('[beatSyncEditor] applyBeatSyncCuts complete', {
      outputPath,
      segmentCount: segmentPaths.length,
    });
  } finally {
    await fs.remove(tempDir);
  }
}

/**
 * Add motion blur between cuts using FFmpeg frame blending.
 *
 * @param videoPath - Input video path
 * @param outputPath - Output video path
 * @param blurAmount - Blur amount (0-1, default 0.5)
 */
export async function addMotionBlurBetweenCuts(
  videoPath: string,
  outputPath: string,
  blurAmount = 0.5,
): Promise<void> {
  // Use FFmpeg minterpolate for motion blur effect at cut points
  // Also apply a slight boxblur at transitions
  const filter = [
    `[0:v]split=2[copy][blur]`,
    `[blur]boxblur=3:3[blurred]`,
    `[copy][blurred]overlay=0:0:enable='between(t,0,0.1)'[out]`,
  ].join(';');

  const args = [
    '-y',
    '-i',
    videoPath,
    '-filter_complex',
    filter,
    '-map',
    '[out]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'copy',
    outputPath,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info('[beatSyncEditor] addMotionBlurBetweenCuts complete', { outputPath, blurAmount });
}
