import { Logger } from '../lib/logger.js';

const MOTION_MAP: Record<string, string> = {
  zoom_in: 'camera zooming in slowly, cinematic zoom, forward motion',
  zoom_out: 'camera zooming out slowly, cinematic zoom-out, pulling back',
  pan_left: 'panning left slowly, camera moving left',
  pan_right: 'panning right slowly, camera moving right',
  breathing: 'subtle camera breathing motion, slow organic camera handheld movement',
};

function getMotionString(motion: string | undefined | null): string {
  if (!motion || motion === 'none') return '';
  return MOTION_MAP[motion] || '';
}

export interface BuildPromptInput {
  videoPrompt: string;
  cameraMotion?: string | null;
  characterFeatures?: string | null;
  modelType: string;
}

export function buildModelPrompt(input: BuildPromptInput): string {
  const { videoPrompt, cameraMotion, characterFeatures, modelType } = input;
  const base = videoPrompt || '';
  const motion = getMotionString(cameraMotion);
  const features = characterFeatures || '';
  const lower = modelType.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Wan 2.1
  if (lower.includes('wan21') || lower === 'wan') {
    const parts = [features, `[Cinematic Shot] ${base}`, motion, 'photorealistic', '4k resolution', 'smooth motion']
      .filter(Boolean);
    return parts.join(', ');
  }

  // Wan 2.5
  if (lower.includes('wan25')) {
    const parts = [features, `[Detailed Scene Setup] ${base}`, `[Sequential Action] ${motion || 'dynamic motion'}`, 'high fidelity', 'masterpiece', '8k resolution']
      .filter(Boolean);
    return parts.join(', ');
  }

  // HunyuanVideo
  if (lower.includes('hunyuan')) {
    const parts = [features, `[3D Volumetric Scene] ${base}`, motion, 'photorealistic', '8k']
      .filter(Boolean);
    return parts.join(', ');
  }

  // CogVideoX-5b / CogVideoX-2b
  if (lower.includes('cogvideox')) {
    const parts = [`[Artistic Style] ${base}`, motion, 'highly detailed', 'masterpiece style']
      .filter(Boolean);
    return parts.join(', ');
  }

  // LTX-Video
  if (lower.includes('ltx')) {
    const parts = [features, `[Consistent Geometry] ${base}`, motion, 'sharp focus', 'high fidelity', '4k']
      .filter(Boolean);
    return parts.join(', ');
  }

  // AnimateDiff
  if (lower.includes('animatediff')) {
    const parts = [features, `[Animation] ${base}`, motion, 'best quality', 'high resolution']
      .filter(Boolean);
    return parts.join(', ');
  }

  // ZeroScope (tag-style)
  if (lower.includes('zeroscope')) {
    const parts = [features, base, motion, 'highly detailed', '1024p', 'zeroscope style']
      .filter(Boolean);
    return parts.join(', ');
  }

  // DynamiCrafter (I2V)
  if (lower.includes('dynamicrafter')) {
    const parts = [features, base, motion, 'slow motion', 'natural loop']
      .filter(Boolean);
    return parts.join(', ');
  }

  // Mochi
  if (lower.includes('mochi')) {
    const parts = [features, base, motion, 'cinematic', 'high fidelity']
      .filter(Boolean);
    return parts.join(', ');
  }

  // Pyramid-Flow
  if (lower.includes('pyramid')) {
    const parts = [features, base, motion, 'detailed', 'smooth animation']
      .filter(Boolean);
    return parts.join(', ');
  }

  // VideoCrafter
  if (lower.includes('videocrafter')) {
    const parts = [features, base, motion, 'high quality']
      .filter(Boolean);
    return parts.join(', ');
  }

  // SVD — no prompt, image only. Return empty.
  if (lower.includes('svd')) {
    return '';
  }

  // Default fallback
  Logger.debug(`[buildModelPrompt] Unknown modelType "${modelType}", using raw prompt`);
  const parts = [features, base, motion].filter(Boolean);
  return parts.join(', ') || '';
}

export function modelAcceptsPrompt(modelType: string): boolean {
  const lower = modelType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !lower.includes('svd');
}
