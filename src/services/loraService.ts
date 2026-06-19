import { Logger } from '../lib/logger.js';
import { colab } from '../lib/colab-manager.js';
import axios from 'axios';

export interface LoraTrainingResult {
  success: boolean;
  weightsPath?: string;
  characterName: string;
  stepsCompleted?: number;
  error?: string;
}

export interface LoraInferResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/**
 * Train LoRA weights for a character from reference images.
 */
export async function trainLoRA(
  jobId: number,
  characterName: string,
  imagePaths: string[],
): Promise<LoraTrainingResult> {
  const COLAB_URL = process.env.COLAB_URL || 'http://localhost:5016';
  try {
    const response = await axios.post(`${COLAB_URL}/train`, {
      job_id: jobId,
      character_name: characterName,
      image_paths: imagePaths,
      output_dir: `/content/lora_weights/${jobId}`,
    }, { timeout: 300000 });

    if (response.data?.status === 'success') {
      Logger.info(`[LoRA] Training complete for ${characterName}`, { jobId, steps: response.data.steps_completed });
      return {
        success: true,
        weightsPath: response.data.weights_path,
        characterName,
        stepsCompleted: response.data.steps_completed,
      };
    }
    return { success: false, characterName, error: 'Training returned non-success status' };
  } catch (err) {
    Logger.error(`[LoRA] Training failed for ${characterName}`, err);
    return { success: false, characterName, error: (err as Error).message };
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
  const COLAB_URL = process.env.COLAB_URL || 'http://localhost:5016';
  try {
    const response = await axios.post(`${COLAB_URL}/infer`, {
      weights_path: weightsPath,
      prompt,
      output_path: outputPath,
    }, { timeout: 60000 });

    if (response.data?.status === 'success') {
      return { success: true, outputPath: response.data.output_path };
    }
    return { success: false, error: 'Infer returned non-success status' };
  } catch (err) {
    Logger.error('[LoRA] Infer failed', err);
    return { success: false, error: (err as Error).message };
  }
}
