/**
 * Cloud Video API Factory
 *
 * Strategy/Factory pattern for cloud video generation APIs.
 * Each service implements IVideoAPIService.
 *
 * Usage:
 *   import { getVideoAPIService, isCloudAPIModel } from './apiVideoService.js';
 *
 *   const service = getVideoAPIService('runway-gen4');
 *   if (service.isConfigured()) {
 *     const result = await service.generate({ prompt, duration: 5 });
 *   }
 */

import { Logger } from '../lib/logger.js';

export interface VideoGenOptions {
  prompt: string;
  imageUrl?: string;   // for I2V
  duration?: number;   // seconds
  aspectRatio?: '16:9' | '9:16' | '1:1';
  fps?: number;
  resolution?: '480p' | '720p' | '1080p';
}

export interface VideoResult {
  videoUrl: string;
  duration: number;       // actual seconds
  thumbnailUrl?: string;
}

export interface IVideoAPIService {
  generate(opts: VideoGenOptions): Promise<VideoResult>;
  estimateCost(durationSec: number): number;   // credits
  isConfigured(): boolean;
  getModelType(): string;
}

// Lazy-loaded service singletons
let _services: Record<string, IVideoAPIService | null> = {};

function lazyLoad(name: string): IVideoAPIService {
  if (!_services[name]) {
    try {
      const mod = require(`./${name}.js`);
      _services[name] = mod.default || mod;
    } catch {
      _services[name] = null;
    }
  }
  return _services[name]!;
}

/** Check if a model type is a cloud API (not RunPod). */
export function isCloudAPIModel(modelType: string): boolean {
  if (!modelType) return false;
  const t = modelType.toLowerCase();
  return (
    t.includes('runway') ||
    t.includes('kling') ||
    t.includes('pika') ||
    t.includes('luma') ||
    t.includes('haiper') ||
    t.includes('pixverse') ||
    t.includes('veo-2') ||
    t.includes('gen-3')
  );
}

/** Get the appropriate cloud API service for a model type. */
export function getVideoAPIService(modelType: string): IVideoAPIService | null {
  if (!modelType) return null;
  const t = modelType.toLowerCase();

  if (t.includes('runway') || t.includes('gen-3') || t.includes('gen-4')) {
    return lazyLoad('runwayService');
  }
  if (t.includes('kling')) {
    return lazyLoad('klingService');
  }
  if (t.includes('pika')) {
    return lazyLoad('pikaService');
  }
  if (t.includes('luma')) {
    return lazyLoad('lumaService');
  }
  if (t.includes('haiper')) {
    return lazyLoad('haiperService');
  }
  if (t.includes('pixverse')) {
    return lazyLoad('pixverseService');
  }
  if (t.includes('veo-2') || t.includes('vertex')) {
    return lazyLoad('veo2Service');
  }

  return null;
}

/** Estimate cost in credits for a given model + duration. */
export function estimateAPICost(modelType: string, durationSec: number): number {
  const service = getVideoAPIService(modelType);
  if (!service) return 0;
  return service.estimateCost(durationSec);
}

/** Generate video via the appropriate cloud API. */
export async function generateViaAPI(
  modelType: string,
  opts: VideoGenOptions,
): Promise<VideoResult> {
  const service = getVideoAPIService(modelType);
  if (!service) {
    throw new Error(`No cloud API configured for model: ${modelType}`);
  }
  if (!service.isConfigured()) {
    throw new Error(`${service.getModelType()} API key not configured`);
  }
  Logger.info(`[API] Generating via ${service.getModelType()}`, { prompt: opts.prompt.substring(0, 80) });
  return service.generate(opts);
}
