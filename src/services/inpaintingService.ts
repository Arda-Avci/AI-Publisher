import path from 'node:path';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';
import { RunPodClient } from './runpod.js';
import { db } from '../db.js';
import { uploadToB2 } from '../lib/b2.js';
import { RETRY } from '../constants.js';

export interface InpaintOptions {
  prompt: string;
  negativePrompt?: string;
  maskPath?: string;
  maskUrl?: string;
  seed?: number;
  guidanceScale?: number;
  strength?: number;
  width?: number;
  height?: number;
}

export interface InpaintResult {
  imageUrl: string;
  seed: number;
  cost: number;
}

const INPAINT_ENDPOINT = 'https://api.runpod.ai/v2/FLUX-inpainting/run';

export async function inpaintImage(
  imagePath: string,
  options: InpaintOptions,
  userId?: number,
): Promise<InpaintResult> {
  const imageBuf = Buffer.from(await fs.readFile(imagePath));
  await uploadToB2(imageBuf, `inpaint-inputs/${path.basename(imagePath)}`);
  const imageUrl = `${process.env.B2_PUBLIC_URL || ''}/inpaint-inputs/${path.basename(imagePath)}`;

  let maskUrl = options.maskUrl;
  if (options.maskPath) {
    const maskBuf = Buffer.from(await fs.readFile(options.maskPath));
    await uploadToB2(maskBuf, `inpaint-masks/${path.basename(options.maskPath)}`);
    maskUrl = `${process.env.B2_PUBLIC_URL || ''}/inpaint-masks/${path.basename(options.maskPath)}`;
  }

  const payload: Record<string, unknown> = {
    input: {
      image_url: imageUrl,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt ?? '',
      guidance_scale: options.guidanceScale ?? 7.5,
      strength: options.strength ?? 0.8,
      num_inference_steps: 28,
      seed: options.seed ?? -1,
      width: options.width ?? 1024,
      height: options.height ?? 1024,
    },
  };

  if (maskUrl) {
    (payload.input as Record<string, unknown>).mask_url = maskUrl;
  }

  try {
    Logger.info('[Inpainting] Starting FLUX inpainting job');
    const job = await RunPodClient.runJob(INPAINT_ENDPOINT, payload);

    const result = await pollInpaintJob(job.id);
    const seed = options.seed ?? (result.seed as number ?? Math.floor(Math.random() * 999999));
    const cost = estimateCost(options.width ?? 1024, options.height ?? 1024);

    if (userId) {
      await db.run(
        `INSERT INTO generation_log (user_id, type, prompt, cost, created_at)
         VALUES (?, 'inpaint', ?, ?, datetime('now'))`,
        [userId, options.prompt.slice(0, 500), cost],
      );
    }

    Logger.info('[Inpainting] Complete:', { seed, cost });
    return { imageUrl: result.output as string, seed, cost };
  } catch (err) {
    Logger.error('[Inpainting] Failed:', err);
    throw err;
  }
}

async function pollInpaintJob(jobId: string, maxRetries = RETRY.INPAINT_POLL, delayMs = 3000): Promise<Record<string, unknown>> {
  for (let i = 0; i < maxRetries; i++) {
    const status = await RunPodClient.getJobStatus(INPAINT_ENDPOINT, jobId);
    if (status.status === 'COMPLETED') return status as unknown as Record<string, unknown>;
    if (status.status === 'FAILED') throw new Error(`Inpainting job failed: ${JSON.stringify(status)}`);
    await sleep(delayMs);
  }
  throw new Error('Inpainting job timed out');
}

function estimateCost(width: number, height: number): number {
  const mp = (width * height) / 1_000_000;
  return Math.round(mp * 0.05 * 100) / 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
