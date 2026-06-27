import { Logger } from '../lib/logger.js';
import { RunPodClient } from './runpod.js';
import { uploadToB2 } from '../lib/b2.js';
import { runFFmpegWithFallback } from './videoService.js';
import { db } from '../db.js';
import path from 'node:path';
import fs from 'fs-extra';

export interface VideoToVideoOptions {
  prompt: string;
  negativePrompt?: string;
  stylePreset?: string;
  strength?: number;
  guidanceScale?: number;
  seed?: number;
  fps?: number;
  width?: number;
  height?: number;
  numFrames?: number;
}

export interface VideoToVideoResult {
  outputPath: string;
  inputUrl: string;
  outputUrl: string;
  seed: number;
  cost: number;
}

const STYLE_PRESETS: Record<string, string> = {
  cinematic: 'Cinematic film look, anamorphic lens, shallow depth of field, 24fps',
  claymation: 'Claymation stop-motion style, plasticine textures, visible fingerprints',
  anime: 'Anime style, cel-shaded, bold outlines, vibrant colors',
  oil_painting: 'Oil painting on canvas, visible brushstrokes, impasto texture',
  watercolor: 'Watercolor painting, soft edges, paper texture, color bleeding',
  sketch: 'Pencil sketch, cross-hatching, grayscale with single accent color',
  pixel_art: 'Pixel art, retro game aesthetic, limited color palette 8-bit',
  noir: 'Film noir, high contrast black and white, dramatic shadows, 1940s',
  vaporwave: 'Vaporwave aesthetic, neon purple/pink, CRT scanlines, retro-futuristic',
  '3d_render': 'Pixar-style 3D render, subsurface scattering, global illumination',
};

export async function videoToVideo(
  inputVideoPath: string,
  options: VideoToVideoOptions,
  userId?: number,
): Promise<VideoToVideoResult> {
  const videoBuf = Buffer.from(await fs.readFile(inputVideoPath));
  const inputKey = `v2v-inputs/${path.basename(inputVideoPath)}`;
  await uploadToB2(videoBuf, inputKey);
  const inputUrl = `${process.env.B2_PUBLIC_URL || ''}/${inputKey}`;

  const stylePrompt = options.stylePreset
    ? `${STYLE_PRESETS[options.stylePreset] ?? options.stylePreset}. ${options.prompt}`
    : options.prompt;

  const payload: Record<string, unknown> = {
    input: {
      video_url: inputUrl,
      prompt: stylePrompt,
      negative_prompt: options.negativePrompt ?? 'blurry, low quality, distorted faces, bad anatomy',
      strength: options.strength ?? 0.7,
      guidance_scale: options.guidanceScale ?? 7.5,
      seed: options.seed ?? -1,
      fps: options.fps ?? 24,
      width: options.width ?? 1024,
      height: options.height ?? 576,
      num_frames: options.numFrames ?? 120,
    },
  };

  const ENDPOINT = 'https://api.runpod.ai/v2/video-to-video/run';

  Logger.info('[VideoToVideo] Starting:', {
    stylePreset: options.stylePreset ?? 'none',
    strength: options.strength ?? 0.7,
  });

  try {
    const job = await RunPodClient.runJob(ENDPOINT, payload);
    const result = await pollV2VJob(job.id);

    const outputUrl = result.output as string;
    const outDir = path.join(process.cwd(), 'videolar', 'v2v');
    await fs.ensureDir(outDir);
    const outputPath = path.join(outDir, `v2v_${Date.now()}.mp4`);

    await downloadFromUrl(outputUrl, outputPath);

    const seed = options.seed ?? (result.seed as number ?? Math.floor(Math.random() * 999999));
    const cost = estimateCost(options.width ?? 1024, options.height ?? 576, options.numFrames ?? 120);

    if (userId) {
      await db.run(
        `INSERT INTO generation_log (user_id, type, prompt, cost, created_at)
         VALUES (?, 'video_to_video', ?, ?, datetime('now'))`,
        [userId, options.prompt.slice(0, 500), cost],
      );
    }

    Logger.info('[VideoToVideo] Complete:', { seed, cost, outputPath });
    return { outputPath, inputUrl, outputUrl, seed, cost };
  } catch (err) {
    Logger.error('[VideoToVideo] Failed:', err);
    throw err;
  }
}

async function pollV2VJob(jobId: string, maxRetries = 120, delayMs = 5000): Promise<Record<string, unknown>> {
  const ENDPOINT = 'https://api.runpod.ai/v2/video-to-video/run';
  for (let i = 0; i < maxRetries; i++) {
    const status = await RunPodClient.getJobStatus(ENDPOINT, jobId);
    if (status.status === 'COMPLETED') return status;
    if (status.status === 'FAILED') throw new Error(`V2V job failed: ${JSON.stringify(status)}`);
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error('Video-to-video job timed out');
}

function estimateCost(width: number, height: number, numFrames: number): number {
  const totalPixels = width * height * numFrames;
  const base = 0.05;
  return Math.round(totalPixels / 1_000_000 * base * 100) / 100;
}

async function downloadFromUrl(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
  const buf = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(dest, buf);
}
