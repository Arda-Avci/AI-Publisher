import axios from 'axios';
import { RunPodClient } from './runpod.js';
import { Logger } from '../lib/logger.js';
import { uploadToB2 } from '../lib/b2.js';
import { db } from '../db.js';
import { TIMEOUT } from '../constants.js';

// ── Core Types ──────────────────────────────────────────

export interface SceneInput {
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  interior: boolean;
  characters: string[];
  plot: string;
  durationSeconds?: number;
}

export interface StoryboardRequest {
  scriptId: number;
  userId: number;
  scenes: SceneInput[];
  artStyle?: string;
  resolution?: '1024x1024' | '2048x2048';
}

export interface StoryboardImageResult {
  sceneNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export interface StoryboardResult {
  scriptId: number;
  totalScenes: number;
  generatedScenes: number;
  images: StoryboardImageResult[];
  status: 'completed' | 'partial' | 'failed';
  error?: string;
}

// ── Constants ───────────────────────────────────────────

const DEFAULT_FLUX_ENDPOINT_ID = 'flx3231xn6ms9s';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const FLUX_ENDPOINT_ID = process.env.RUNPOD_FLUX_ENDPOINT_ID || DEFAULT_FLUX_ENDPOINT_ID;

// ── 1. Placeholder (1x1 transparent PNG) ───────────────

function createPlaceholderBuffer(): Buffer {
  // Minimal 1x1 transparent PNG
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

// ── 2. buildScenePrompt ────────────────────────────────

export function buildScenePrompt(
  scene: SceneInput,
  artStyle?: string,
): string {
  const locationType = scene.interior ? 'Interior' : 'Exterior';
  const characterDesc = scene.characters.length > 0
    ? scene.characters.join(', ')
    : 'unknown character';

  let prompt = `${locationType} at ${scene.location}, ${scene.timeOfDay}. ${characterDesc}. Action: ${scene.plot}. Cinematic lighting, 4K, detailed.`;

  if (artStyle) {
    prompt += ` Style: ${artStyle}.`;
  }

  return prompt;
}

// ── 3. generateStoryboardImage ─────────────────────────

export async function generateStoryboardImage(
  sceneDescription: string,
  artStyle?: string,
): Promise<{ imageBuffer: Buffer; width: number; height: number }> {
  const width = 2048;
  const height = 2048;
  const fullPrompt = artStyle
    ? `${sceneDescription} Style: ${artStyle}.`
    : sceneDescription;

  if (!RUNPOD_API_KEY) {
    Logger.warn('[StoryboardGenerator] RUNPOD_API_KEY not configured. Returning placeholder.');
    return { imageBuffer: createPlaceholderBuffer(), width: 1, height: 1 };
  }

  if (!FLUX_ENDPOINT_ID) {
    Logger.warn('[StoryboardGenerator] RUNPOD_FLUX_ENDPOINT_ID not configured. Returning placeholder.');
    return { imageBuffer: createPlaceholderBuffer(), width: 1, height: 1 };
  }

  try {
    const result = await RunPodClient.runSync(
      FLUX_ENDPOINT_ID,
      {
        prompt: fullPrompt,
        width,
        height,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
      120000,
    );

    if (result.status === 'FAILED') {
      throw new Error(result.error || 'RunPod FLUX hatasi');
    }

    let imageBuffer: Buffer | null = null;

    const output = result.output;

    if (typeof output === 'string') {
      const base64Data = output.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (Array.isArray(output) && output.length > 0) {
      // URL array — fetch first
      const imageUrl = output[0];
      if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
        const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: TIMEOUT.AI_SLOW });
        imageBuffer = Buffer.from(imgResp.data);
      } else if (typeof imageUrl === 'string') {
        // Base64 in array
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      }
    } else if (output && typeof output === 'object') {
      // Object with image field
      const maybeBase64 = (output as any).image_base64 || (output as any).image || (output as any).base64;
      if (maybeBase64) {
        const base64Data = String(maybeBase64).replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else if ((output as any).image_url) {
        const imgResp = await axios.get((output as any).image_url, { responseType: 'arraybuffer', timeout: TIMEOUT.AI_SLOW });
        imageBuffer = Buffer.from(imgResp.data);
      }
    }

    if (!imageBuffer) {
      if (typeof output === 'string' && output.startsWith('http')) {
        const imgResp = await axios.get(output, { responseType: 'arraybuffer', timeout: TIMEOUT.AI_SLOW });
        imageBuffer = Buffer.from(imgResp.data);
      } else {
        throw new Error('FLUX output format taninamadi');
      }
    }

    Logger.info(`[StoryboardGenerator] Image generated (${width}x${height})`);
    return { imageBuffer, width, height };
  } catch (error: any) {
    Logger.warn(`[StoryboardGenerator] FLUX generation failed: ${error.message}. Returning placeholder.`);
    return { imageBuffer: createPlaceholderBuffer(), width: 1, height: 1 };
  }
}

// ── 4. generateFullStoryboard ──────────────────────────

export async function generateFullStoryboard(
  request: StoryboardRequest,
): Promise<StoryboardResult> {
  const { scriptId, userId, scenes, artStyle, resolution } = request;
  const [_resWidth, _resHeight] = (resolution || '2048x2048').split('x').map(Number) as [number, number];

  const images: StoryboardImageResult[] = [];
  let failedCount = 0;

  for (const scene of scenes) {
    try {
      const prompt = buildScenePrompt(scene, artStyle);
      const { imageBuffer, width, height } = await generateStoryboardImage(prompt, artStyle);

      // B2'ye yükle
      const timestamp = Date.now();
      const key = `storyboards/${scriptId}/scene_${scene.sceneNumber}_${timestamp}.png`;
      const uploaded = await uploadToB2(imageBuffer, key, 'image/png');

      if (!uploaded) {
        Logger.warn(`[StoryboardGenerator] B2 upload failed for scene ${scene.sceneNumber}, skipping DB save`);
        failedCount++;
        continue;
      }

      // B2 URL'sini olustur
      const bucket = process.env.B2_BUCKET || 'ai-publisher-models';
      const endpoint = process.env.B2_ENDPOINT_URL || 'https://s3.us-west-004.backblazeb2.com';
      const imageUrl = `${endpoint}/${bucket}/${key}`;

      // DB'ye kaydet
      await db.run(
        `INSERT INTO storyboard_images (script_id, user_id, scene_number, image_url, width, height, prompt_used)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [scriptId, userId, scene.sceneNumber, imageUrl, width, height, prompt],
      );

      images.push({ sceneNumber: scene.sceneNumber, imageUrl, width, height });
      Logger.info(`[StoryboardGenerator] Scene ${scene.sceneNumber} OK`);
    } catch (error: any) {
      Logger.error(`[StoryboardGenerator] Scene ${scene.sceneNumber} failed: ${error.message}`);
      failedCount++;
    }
  }

  const totalScenes = scenes.length;
  const generatedScenes = images.length;

  let status: StoryboardResult['status'] = 'completed';
  if (totalScenes > 0 && generatedScenes === 0) {
    status = 'failed';
  } else if (generatedScenes < totalScenes) {
    status = 'partial';
  }

  return {
    scriptId,
    totalScenes,
    generatedScenes,
    images,
    status,
    ...(status === 'failed' ? { error: 'Hiçbir sahne olusturulamadi.' } : {}),
  };
}

// ── 5. DB Query Helpers ────────────────────────────────

export async function getStoryboardImages(scriptId: number): Promise<StoryboardImageResult[]> {
  const rows = await db.all(
    'SELECT scene_number, image_url, width, height FROM storyboard_images WHERE script_id = ? ORDER BY scene_number ASC',
    [scriptId],
  );
  return rows.map((r: any) => ({
    sceneNumber: r.scene_number,
    imageUrl: r.image_url,
    width: r.width,
    height: r.height,
  }));
}

export async function deleteStoryboardImages(scriptId: number): Promise<boolean> {
  const result = await db.run('DELETE FROM storyboard_images WHERE script_id = ?', [scriptId]);
  return (result.changes ?? 0) > 0;
}
