import dotenv from 'dotenv';
import { Logger } from '../lib/logger.js';

dotenv.config();

export type ModelCategory = 'video' | 'image' | 'audio' | 'face' | 'upscale' | 'browser' | 'lora';

export interface ModelEndpoint {
  modelName: string;
  envVar: string;
  category: ModelCategory;
  description: string;
  defaultInput: Record<string, unknown>;
}

const MODEL_REGISTRY: Record<string, ModelEndpoint> = {
  'animatediff': {
    modelName: 'AnimateDiff',
    envVar: 'RUNPOD_ANIMATEDIFF_ENDPOINT_ID',
    category: 'video',
    description: 'AnimateDiff text-to-video animation',
    defaultInput: { prompt: '', num_frames: 16, width: 512, height: 512, fps: 8 },
  },
  'audioldm2': {
    modelName: 'AudioLDM2',
    envVar: 'RUNPOD_AUDIOLDM2_ENDPOINT_ID',
    category: 'audio',
    description: 'AudioLDM2 text-to-audio generation',
    defaultInput: { prompt: '', duration: 8 },
  },
  'cogvideox': {
    modelName: 'CogVideoX-5B',
    envVar: 'RUNPOD_COGVIDEOX_5B_ENDPOINT_ID',
    category: 'video',
    description: 'CogVideoX-5B text-to-video',
    defaultInput: { prompt: '', num_frames: 49, width: 720, height: 480 },
  },
  'cogvideox-2b': {
    modelName: 'CogVideoX-2B',
    envVar: 'RUNPOD_COGVIDEOX_2B_ENDPOINT_ID',
    category: 'video',
    description: 'CogVideoX-2B text-to-video (lighter)',
    defaultInput: { prompt: '', num_frames: 49, width: 720, height: 480 },
  },
  'dynamicrafter': {
    modelName: 'DynamiCrafter',
    envVar: 'RUNPOD_DYNAMICRAFTER_ENDPOINT_ID',
    category: 'video',
    description: 'DynamiCrafter image-to-video',
    defaultInput: { prompt: '', image_url: '', num_frames: 16, fps: 8 },
  },
  'f5tts': {
    modelName: 'F5-TTS',
    envVar: 'RUNPOD_F5TTS_ENDPOINT_ID',
    category: 'audio',
    description: 'F5-TTS text-to-speech with reference audio',
    defaultInput: { text: '', reference_audio: '' },
  },
  'geneface': {
    modelName: 'GeneFace++',
    envVar: 'RUNPOD_GENEFACE_ENDPOINT_ID',
    category: 'face',
    description: 'GeneFace++ talking face generation',
    defaultInput: { audio_url: '', source_image: '' },
  },
  'hunyuan': {
    modelName: 'HunyuanVideo',
    envVar: 'RUNPOD_HUNYUANVIDEO_ENDPOINT_ID',
    category: 'video',
    description: 'HunyuanVideo text-to-video',
    defaultInput: { prompt: '' },
  },
  'kokorotts': {
    modelName: 'Kokoro-TTS',
    envVar: 'RUNPOD_KOKOROTTS_ENDPOINT_ID',
    category: 'audio',
    description: 'Kokoro TTS generation',
    defaultInput: { text: '', voice: 'default' },
  },
  'lora-trainer': {
    modelName: 'LoRA Trainer',
    envVar: 'RUNPOD_LORATRAINER_ENDPOINT_ID',
    category: 'lora',
    description: 'LoRA model fine-tuning',
    defaultInput: { images_urls: [], trigger_word: '', training_steps: 1000 },
  },
  'ltx': {
    modelName: 'LTX-Video',
    envVar: 'RUNPOD_LTX_ENDPOINT_ID',
    category: 'video',
    description: 'LTX-Video text-to-video generation',
    defaultInput: { prompt: '', num_frames: 65, width: 768, height: 432, fps: 8 },
  },
  'mochi': {
    modelName: 'Mochi-1',
    envVar: 'RUNPOD_MOCHI_ENDPOINT_ID',
    category: 'video',
    description: 'Mochi-1 text-to-video',
    defaultInput: { prompt: '', num_frames: 49, width: 848, height: 480 },
  },
  'musetalk': {
    modelName: 'MuseTalk',
    envVar: 'RUNPOD_MUSETALK_ENDPOINT_ID',
    category: 'face',
    description: 'MuseTalk lip-sync avatar',
    defaultInput: { video_url: '', audio_url: '' },
  },
  'pyramid-flow': {
    modelName: 'Pyramid-Flow',
    envVar: 'RUNPOD_PYRAMIDFLOW_ENDPOINT_ID',
    category: 'video',
    description: 'Pyramid-Flow text-to-video',
    defaultInput: { prompt: '', num_frames: 49, width: 640, height: 384 },
  },
  'sadtalker': {
    modelName: 'SadTalker',
    envVar: 'RUNPOD_SADTALKER_ENDPOINT_ID',
    category: 'face',
    description: 'SadTalker talking head from image+audio',
    defaultInput: { source_image: '', audio_url: '' },
  },
  'stablediffusion': {
    modelName: 'Stable Diffusion',
    envVar: 'RUNPOD_STABLEDIFFUSION_ENDPOINT_ID',
    category: 'image',
    description: 'Stable Diffusion text-to-image',
    defaultInput: { prompt: '', width: 1024, height: 1024, num_inference_steps: 30 },
  },
  'svd': {
    modelName: 'SVD-XT',
    envVar: 'RUNPOD_SVD_ENDPOINT_ID',
    category: 'video',
    description: 'Stable Video Diffusion XT image-to-video',
    defaultInput: { image_url: '', num_frames: 25, fps: 7 },
  },
  'video-retalking': {
    modelName: 'Video-ReTalking',
    envVar: 'RUNPOD_VIDEORETALKING_ENDPOINT_ID',
    category: 'face',
    description: 'Video-ReTalking face reenactment',
    defaultInput: { video_url: '', audio_url: '' },
  },
  'videocrafter': {
    modelName: 'VideoCrafter',
    envVar: 'RUNPOD_VIDEOCRAFTER_ENDPOINT_ID',
    category: 'video',
    description: 'VideoCrafter text-to-video',
    defaultInput: { prompt: '', num_frames: 16, width: 640, height: 384 },
  },
  'wan': {
    modelName: 'Wan2.1',
    envVar: 'RUNPOD_WAN_ENDPOINT_ID',
    category: 'video',
    description: 'Wan2.1 text-to-video',
    defaultInput: { prompt: '', num_frames: 81, width: 832, height: 480, fps: 8 },
  },
  'wan25': {
    modelName: 'Wan2.5',
    envVar: 'RUNPOD_WAN25_ENDPOINT_ID',
    category: 'video',
    description: 'Wan2.5 text-to-video (improved)',
    defaultInput: { prompt: '', num_frames: 81, width: 832, height: 480, fps: 16 },
  },
  'wan22-comfyui': {
    modelName: 'Wan2.2-ComfyUI',
    envVar: 'RUNPOD_WAN22_COMFYUI_ENDPOINT_ID',
    category: 'video',
    description: 'Wan2.2 via ComfyUI workflow (active)',
    defaultInput: { workflow: {} },
  },
  'wav2lip': {
    modelName: 'Wav2Lip',
    envVar: 'RUNPOD_WAV2LIP_ENDPOINT_ID',
    category: 'face',
    description: 'Wav2Lip lip-sync',
    defaultInput: { video_url: '', audio_url: '' },
  },
  'whisper': {
    modelName: 'Whisper',
    envVar: 'RUNPOD_WHISPER_ENDPOINT_ID',
    category: 'audio',
    description: 'Whisper speech-to-text',
    defaultInput: { audio_url: '', language: 'tr' },
  },
  'xtts': {
    modelName: 'XTTS-v2',
    envVar: 'RUNPOD_XTTS_ENDPOINT_ID',
    category: 'audio',
    description: 'XTTS-v2 text-to-speech with voice cloning',
    defaultInput: { text: '', speaker_audio: '' },
  },
  'zeroscope': {
    modelName: 'ZeroScope',
    envVar: 'RUNPOD_ZEROSCOPE_ENDPOINT_ID',
    category: 'video',
    description: 'ZeroScope text-to-video',
    defaultInput: { prompt: '', num_frames: 24, width: 1024, height: 576, fps: 8 },
  },
  'veo31': {
    modelName: 'Veo-31',
    envVar: 'RUNPOD_VEO31_ENDPOINT_ID',
    category: 'video',
    description: 'Google Veo 3.1 (cloud API, no RunPod endpoint)',
    defaultInput: { prompt: '', aspect_ratio: '16:9' },
  },
  'browser-use': {
    modelName: 'Browser-Use',
    envVar: 'RUNPOD_BROWSER_USE_ENDPOINT_ID',
    category: 'browser',
    description: 'Remote browser automation for social media publishing',
    defaultInput: { task: '', url: '', cookies: {} },
  },
  'realesrgan': {
    modelName: 'Real-ESRGAN',
    envVar: 'RUNPOD_REALESRGAN_ENDPOINT_ID',
    category: 'upscale',
    description: 'Real-ESRGAN video/image upscaler',
    defaultInput: { image_url: '', scale: 2 },
  },
};

export function getEndpointId(modelKey: string): string | undefined {
  const entry = MODEL_REGISTRY[modelKey];
  if (!entry) return undefined;
  const envVar = entry.envVar;
  return process.env[envVar] || undefined;
}

export function getModelConfig(modelKey: string): ModelEndpoint | undefined {
  return MODEL_REGISTRY[modelKey];
}

export function getAllModelKeys(): string[] {
  return Object.keys(MODEL_REGISTRY);
}

export function getModelsByCategory(category: ModelCategory): ModelEndpoint[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.category === category);
}

export function validateEndpoints(): { configured: string[]; missing: string[] } {
  const configured: string[] = [];
  const missing: string[] = [];

  for (const [key, entry] of Object.entries(MODEL_REGISTRY)) {
    const value = process.env[entry.envVar];
    if (value && !value.includes('your_') && !value.includes('replace_')) {
      configured.push(key);
    } else {
      missing.push(key);
    }
  }

  return { configured, missing };
}

export function getEndpointForModel(modelType: string): string | undefined {
  const direct = getEndpointId(modelType);
  if (direct) return direct;

  const normalized = modelType.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  for (const [key, entry] of Object.entries(MODEL_REGISTRY)) {
    const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (keyNorm === normalized) {
      return process.env[entry.envVar] || undefined;
    }
  }

  Logger.warn(`[RunPodEndpoints] No endpoint mapped for model type: ${modelType}`);
  return undefined;
}

export { MODEL_REGISTRY };
