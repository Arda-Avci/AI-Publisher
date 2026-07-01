/**
 * AI B-Roll Synthesis Service
 *
 * Generates contextual B-Roll clips using CogVideoX based on keyword analysis,
 * and inserts them into main videos at semantically appropriate moments.
 *
 * @module services/aiBroll
 */

import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import { dockerHost } from '../lib/docker-host.js';
import { runFFmpeg, runFFmpegWithFallback, FFmpegCommand } from './videoService.js';
import { Logger } from '../lib/logger.js';
import { DIRECTORIES, TIMEOUT } from '../constants.js';;

/**
 * Represents a single B-Roll clip to be inserted.
 */
export interface BrollClip {
  /** Keywords describing the B-Roll content */
  keywords: string[];
  /** Duration in seconds */
  duration: number;
  /** Output path where the generated B-Roll video is saved */
  outputPath: string;
  /** Timestamp in main video (seconds) where this B-Roll should be inserted */
  insertAtSeconds: number;
}

/**
 * Result of B-Roll generation.
 */
export interface GenerateBrollResult {
  /** Path to the generated B-Roll video */
  outputPath: string;
  /** Whether generation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Generates a keyword-based 3-4 second B-Roll clip using CogVideoX via Docker.
 *
 * Calls Docker endpoint: /generate-media?mode=cogvideo_broll&prompt={keyword}&duration={duration}
 *
 * @param keyword     - Single keyword or short phrase describing the B-Roll
 * @param duration    - Duration in seconds (3-4 typical)
 * @param outputPath  - Absolute path to save the generated B-Roll video
 * @returns Path to generated video on success
 */
export async function generateCogVideoXBroll(
  keyword: string,
  duration: number,
  outputPath: string,
): Promise<string> {
  const cogUrl = dockerHost.getUrl('cogvideox');
  Logger.info('[aiBroll] Generating CogVideoX B-Roll', { keyword, duration, outputPath });

  try {
    const response = await axios.get(`${cogUrl}/generate-media`, {
      params: {
        mode: 'cogvideo_broll',
        prompt: keyword,
        duration,
      },
      timeout: TIMEOUT.HEAVY_GEN,
    });

    const resultPath = response.data?.output_path || response.data?.video_path;
    if (!resultPath) {
      throw new Error(`No output_path in response: ${JSON.stringify(response.data)}`);
    }

    if (resultPath.startsWith('http')) {
      const writer = fs.createWriteStream(outputPath);
      const axiosStream = await axios.get(resultPath, {
        responseType: 'stream',
        timeout: TIMEOUT.FFMPEG,
      });
      axiosStream.data.pipe(writer);
      await new Promise<void>((res, rej) => {
        writer.on('finish', res);
        writer.on('error', rej);
      });
    } else {
      await fs.copy(resultPath, outputPath);
    }

    if (!(await fs.pathExists(outputPath))) {
      throw new Error(`B-Roll file not found after download: ${outputPath}`);
    }

    Logger.info('[aiBroll] CogVideoX B-Roll generated', { outputPath });
    return outputPath;
  } catch (err: any) {
    Logger.error('[aiBroll] CogVideoX B-Roll failed', err);
    throw err;
  }
}

/**
 * Generates a B-Roll clip using CogVideoX via Docker.
 *
 * @param keywords     - Keywords describing the B-Roll content
 * @param duration     - Duration in seconds (3-4 typical)
 * @param outputPath   - Absolute path to save the generated B-Roll
 * @returns Result with output path
 */
export async function generateBroll(
  keywords: string[],
  duration: number,
  outputPath: string,
): Promise<GenerateBrollResult> {
  const cogUrl = dockerHost.getUrl('cogvideox');
  const keywordStr = keywords.join(', ');

  try {
    Logger.info('[aiBroll] Generating B-Roll via Docker CogVideoX', {
      keywords: keywordStr,
      duration,
      outputPath,
    });

    const response = await axios.post(
      `${cogUrl}/generate-broll`,
      {
        keywords,
        duration,
        output_path: outputPath,
        model: 'CogVideoX-2b',
      },
      {
        timeout: TIMEOUT.HEAVY_GEN,
      },
    );

    const taskId = response.data?.task_id;
    if (!taskId) {
      throw new Error(`No task_id in response: ${JSON.stringify(response.data)}`);
    }

    // Poll for completion
    let taskStatus = 'processing';
    let attempt = 0;
    const startTime = Date.now();

    while (taskStatus === 'processing' || taskStatus === 'accepted') {
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Early exit: check if file exists
      if (await fs.pathExists(outputPath)) {
        Logger.info('[aiBroll] B-Roll file already exists (callback pushed)', { outputPath });
        taskStatus = 'success';
        break;
      }

      if (Date.now() - startTime > 600000) {
        throw new Error('B-Roll generation timed out after 10 minutes');
      }

      try {
        const statusRes = await axios.get(`${cogUrl}/status/${taskId}`, {
          timeout: TIMEOUT.POLL_TASK,
        });
        taskStatus = statusRes.data?.status || 'processing';
        Logger.info(`[aiBroll] Polling #${attempt}`, {
          taskStatus,
          message: statusRes.data?.message,
        });
      } catch (pollErr: any) {
        Logger.warn(`[aiBroll] Poll error (attempt ${attempt})`, { error: pollErr.message });
        if (attempt > 60) {
          throw new Error(`Polling timeout: ${pollErr.message}`);
        }
      }
    }

    if (taskStatus === 'success' || (await fs.pathExists(outputPath))) {
      Logger.info('[aiBroll] B-Roll generation succeeded', { outputPath });
      return { outputPath, success: true };
    }

    throw new Error(`B-Roll task ended with status: ${taskStatus}`);
  } catch (err: any) {
    Logger.error('[aiBroll] B-Roll generation failed', err);
    return { outputPath, success: false, error: err.message };
  }
}

/**
 * Inserts B-Roll clips into a main video at specified timestamps using FFmpeg.
 *
 * Uses the libavfilter complex filtergraph to:
 * 1. Trim main video around each B-Roll insertion point
 * 2. Concatenate segments with B-Roll clips in between
 *
 * @param mainVideo    - Absolute path to the main video
 * @param brollClips   - Array of BrollClip objects to insert
 * @param output       - Absolute path for the final video with B-Rolls
 */
export async function insertBroll(
  mainVideo: string,
  brollClips: BrollClip[],
  output: string,
): Promise<void> {
  if (brollClips.length === 0) {
    Logger.info('[aiBroll] No B-Roll clips provided, copying original');
    await fs.copy(mainVideo, output);
    return;
  }

  Logger.info('[aiBroll] Inserting B-Roll clips', {
    mainVideo,
    output,
    clipCount: brollClips.length,
  });

  // Get main video duration
  const { stdout: durStr } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    mainVideo,
  ]);
  const totalDur = parseFloat(durStr.trim());

  // Sort clips by insert time
  const sorted = [...brollClips].sort((a, b) => a.insertAtSeconds - b.insertAtSeconds);

  // Build filtergraph for segment-wise assembly
  // Format: [0:v] [1:v] [0:v] [2:v] ... concat=n=2N:v=1:a=0
  const inputArgs: string[] = ['-y', '-i', mainVideo];

  // Collect all video segments and B-Roll paths
  const videoSegments: string[] = [];
  const brollPaths: string[] = [];
  const brollStartTimes: number[] = [];

  let lastEnd = 0;

  for (let i = 0; i < sorted.length; i++) {
    const clip = sorted[i];
    if (!clip) continue;
    const clipStart = Math.max(0, clip.insertAtSeconds);
    const clipEnd = Math.min(totalDur, clipStart + clip.duration);

    // Segment before this B-Roll
    if (clipStart > lastEnd) {
      videoSegments.push(`[seg_${videoSegments.length}_v]`);
    }

    // The B-Roll clip
    if (await fs.pathExists(clip.outputPath)) {
      brollPaths.push(clip.outputPath);
      brollStartTimes.push(clipStart);
    } else {
      Logger.warn(`[aiBroll] B-Roll file not found, skipping: ${clip.outputPath}`);
    }

    lastEnd = clipEnd;
  }

  if (brollPaths.length === 0) {
    Logger.warn('[aiBroll] No valid B-Roll files found, copying original');
    await fs.copy(mainVideo, output);
    return;
  }

  // Add B-Roll inputs
  for (const brollPath of brollPaths) {
    inputArgs.push('-i', brollPath);
  }

  // Build concat filter: alternates main-seg and broll
  // We need to use ffmpeg's concat with intermediate segments
  // Simpler approach: use complex filter with trim/segment

  // Use a concat demuxer approach with a temp list
  const concatDir = path.join(process.cwd(), DIRECTORIES.VIDEO_OUTPUT, `broll_concat_${Date.now()}`);
  await fs.ensureDir(concatDir);

  try {
    // Write concat file with proper ordering
    // Each B-Roll replaces the segment starting at its insertAtSeconds
    // We need to trim main video into segments between B-Rolls

    const segmentFiles: string[] = [];
    let currentTime = 0;
    const insertPoints = brollStartTimes; // sorted by time already

    for (let i = 0; i < insertPoints.length; i++) {
      const insertAt = insertPoints[i];
      if (insertAt === undefined) continue;

      // Segment before B-Roll
      if (insertAt > currentTime) {
        const segPath = path.join(concatDir, `seg_${segmentFiles.length}.mp4`);
        await runFFmpeg('ffmpeg', [
          '-y',
          '-i',
          mainVideo,
          '-ss',
          String(currentTime),
          '-t',
          String(insertAt - currentTime),
          '-c',
          'copy',
          segPath,
        ]);
        segmentFiles.push(segPath);
      }

      // B-Roll clip
      const brollPath = brollPaths[i];
      const sortedClip = sorted[i];
      if (!brollPath || !sortedClip) continue;
      const brollDur = sortedClip.duration;
      const brollOutPath = path.join(concatDir, `broll_${i}.mp4`);

      // Trim B-Roll to exact duration
      await runFFmpeg('ffmpeg', [
        '-y',
        '-i',
        brollPath,
        '-t',
        String(brollDur),
        '-c',
        'copy',
        brollOutPath,
      ]);
      segmentFiles.push(brollOutPath);

      currentTime = insertAt + brollDur;
    }

    // Final segment after last B-Roll
    if (currentTime < totalDur) {
      const segPath = path.join(concatDir, `seg_final.mp4`);
      await runFFmpeg('ffmpeg', [
        '-y',
        '-i',
        mainVideo,
        '-ss',
        String(currentTime),
        '-c',
        'copy',
        segPath,
      ]);
      segmentFiles.push(segPath);
    }

    // Write concat list
    const concatListPath = path.join(concatDir, 'concat_list.txt');
    const concatListContent = segmentFiles.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(concatListPath, concatListContent);

    // Concatenate all segments
    const finalCmd: FFmpegCommand = {
      cmd: 'ffmpeg',
      args: ['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', output],
      timeoutMs: 300000,
    };

    await runFFmpegWithFallback([finalCmd]);
    Logger.info('[aiBroll] B-Roll insertion completed', { output });
  } finally {
    // Cleanup temp directory
    await fs.remove(concatDir).catch((err) => {
      Logger.warn('[aiBroll] Cleanup failed', { error: err.message });
    });
  }
}
