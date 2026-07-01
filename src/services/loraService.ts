import { Logger } from '../lib/logger.js';
import axios from 'axios';
import { db } from '../db.js';
import { dockerHost } from '../lib/docker-host.js';
import { TIMEOUT } from '../constants.js';

const LORA_URL = dockerHost.getUrl('lora-trainer');

export interface LoraTrainingResult {
  success: boolean;
  weightsPath?: string;
  characterName: string;
  stepsCompleted?: number;
  drivePath?: string;
  error?: string;
}

export interface LoraInferResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface PretrainedLora {
  id: string;
  name: string;
  source: string;
  repo?: string;
  path?: string;
  description: string;
  type: string;
}

/**
 * Get pre-trained LoRA list from docker + local DB.
 */
export async function getPretrainedLoras(): Promise<PretrainedLora[]> {
  const result: PretrainedLora[] = [];

  try {
    const resp = await axios.get(`${LORA_URL}/pretrained`, { timeout: TIMEOUT.LORA_CHECK });
    if (resp.data?.pretrained) {
      for (const item of resp.data.pretrained) {
        result.push({ id: item.id, name: item.name, source: item.source, repo: item.repo, description: item.description, type: item.type });
      }
    }
    if (resp.data?.drive) {
      for (const item of resp.data.drive) {
        result.push({ id: item.id, name: item.name, source: item.source, path: item.path, description: item.description, type: item.type });
      }
    }
  } catch {
    /* lora-trainer not available */
  }

  return result;
}

/**
 * Load a pre-trained LoRA from HF repo.
 */
export async function loadPretrainedLora(hfRepo: string): Promise<string | null> {
  try {
    const resp = await axios.post(`${LORA_URL}/pretrained/load`, { hf_repo: hfRepo }, { timeout: TIMEOUT.DOWNLOAD });
    if (resp.data?.status === 'success') {
      return resp.data.weights_path;
    }
    return null;
  } catch (err) {
    Logger.error('[LoRA] Failed to load pre-trained', err);
    return null;
  }
}

/**
 * Train LoRA weights for a character from reference images.
 */
export async function trainLoRA(
  jobId: number,
  characterName: string,
  imagePaths: string[],
  callbackUrl?: string,
): Promise<LoraTrainingResult> {
  try {
    const response = await axios.post(`${LORA_URL}/train`, {
      job_id: jobId,
      character_name: characterName,
      image_paths: imagePaths,
      output_dir: `/content/lora_weights/${jobId}`,
      callback_url: callbackUrl || '',
      use_cogvideo: true,
    }, { timeout: TIMEOUT.HEAVY_GEN });

    if (response.data?.status === 'success') {
      Logger.info(`[LoRA] Training complete for ${characterName}`, { jobId, steps: response.data.steps_completed });

      db.run(
        `INSERT INTO character_lora_weights (job_id, character_name, weights_path, drive_path, training_status, steps_completed)
         VALUES ($1, $2, $3, $4, 'completed', $5)`,
        [jobId, characterName, response.data.weights_path, response.data.drive_path || '', response.data.steps_completed || 0],
      ).catch((err) => Logger.warn('[LoRA] DB insert failed', err));

      return {
        success: true,
        weightsPath: response.data.weights_path,
        characterName,
        stepsCompleted: response.data.steps_completed,
        drivePath: response.data.drive_path,
      };
    }
    return { success: false, characterName, error: 'Training returned non-success status' };
  } catch (err) {
    Logger.error(`[LoRA] Training failed for ${characterName}`, err);
    return { success: false, characterName, error: (err as Error).message };
  }
}

/**
 * Check Drive for cached LoRA weights.
 */
export async function findDriveWeights(characterName: string): Promise<string | null> {
  try {
    const resp = await axios.get(`${LORA_URL}/pretrained`, { timeout: TIMEOUT.LORA_CHECK });
    const drive = resp.data?.drive || [];
    const match = drive.find((d: any) => d.name === characterName);
    return match?.path || null;
  } catch {
    return null;
  }
}

/**
 * Infer with LoRA: generate an image using trained weights.
 */
export async function inferWithLoRA(
  weightsPath: string,
  prompt: string,
  outputPath: string,
): Promise<LoraInferResult> {
  try {
    const response = await axios.post(`${LORA_URL}/infer`, {
      weights_path: weightsPath,
      prompt,
      output_path: outputPath,
      use_cogvideo: false,
    }, { timeout: TIMEOUT.AI_SLOW });

    if (response.data?.status === 'success') {
      return { success: true, outputPath: response.data.output_path };
    }
    return { success: false, error: 'Infer returned non-success status' };
  } catch (err) {
    Logger.error('[LoRA] Infer failed', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Poll training progress from container.
 */
export async function getTrainingProgress(jobId: number): Promise<{ percent: number; status: string }> {
  try {
    const resp = await axios.get(`${LORA_URL}/progress/${jobId}`, { timeout: TIMEOUT.LORA_CHECK });
    return resp.data;
  } catch {
    return { percent: 0, status: 'unknown' };
  }
}

/**
 * Get character LoRA weights for a specific scene.
 */
export async function getSceneCharacterWeights(jobId: number, sceneNumber: number): Promise<{ characterName: string; weightsPath: string } | null> {
  try {
    const row: any = await db.get(
      `SELECT sc.character_name, clw.weights_path
       FROM scene_characters sc
       JOIN character_lora_weights clw ON clw.id = sc.lora_weights_id
       WHERE sc.job_id = $1 AND sc.scene_number = $2 AND clw.training_status = 'completed'
       LIMIT 1`,
      [jobId, sceneNumber],
    );
    if (row) {
      return { characterName: row.character_name, weightsPath: row.weights_path };
    }
    return null;
  } catch (err) {
    Logger.warn('[LoRA] getSceneCharacterWeights failed', err);
    return null;
  }
}
