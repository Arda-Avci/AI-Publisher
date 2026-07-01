/**
 * Backward-compatible RunPod endpoint registry → Modal model mapping shim.
 * Remove after full migration.
 */
import { Logger } from '../lib/logger.js';
import { getModalFn } from './modalClient.js';

export type ModelCategory = 'video' | 'image' | 'audio' | 'face' | 'upscale' | 'browser' | 'lora';

export interface ModelEndpoint {
  modelName: string;
  envVar: string;
  category: ModelCategory;
  description: string;
  defaultInput: Record<string, unknown>;
}

const MODEL_REGISTRY: Record<string, ModelEndpoint> = {};

export function getEndpointId(modelKey: string): string | undefined {
  const fn = getModalFn(modelKey);
  if (fn) return `${fn.app}/${fn.fn}`;
  Logger.warn(`[RunPodEndpointsCompat] No Modal mapping for model: ${modelKey}`);
  return undefined;
}

export function getModelConfig(_modelKey: string): ModelEndpoint | undefined {
  return undefined;
}

export function getAllModelKeys(): string[] {
  return ['cogvideox', 'wan', 'hunyuan', 'ltx', 'stablediffusion'];
}

export function getModelsByCategory(_category: ModelCategory): ModelEndpoint[] {
  return [];
}

export function validateEndpoints(): { configured: string[]; missing: string[] } {
  return { configured: [], missing: [] };
}

export function getEndpointForModel(modelType: string): string | undefined {
  return getEndpointId(modelType);
}

export { MODEL_REGISTRY };
