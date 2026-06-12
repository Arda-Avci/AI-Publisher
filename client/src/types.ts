export interface Job {
  id: number;
  master_prompt: string;
  production_notes: string;
  character_features: string;
  material_path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'awaiting_approval';
  current_stage: string;
  progress_percent: number;
  final_filename?: string;
  cover_image_path?: string;
  cover_images?: string;
  total_scenes: number;
  completed_scenes: number;
  estimated_minutes: number;
  yt_title?: string;
  yt_desc?: string;
  yt_tags?: string;
  tt_desc?: string;
  tt_tags?: string;
  x_desc?: string;
  x_tags?: string;
  meta_desc?: string;
  meta_tags?: string;
  tts_provider?: string;
  tts_voice?: string;
  model_type?: string;
  has_shorts?: number;
}

export interface Scene {
  id?: number;
  sceneNumber: number;
  videoPrompt?: string;
  speechText?: string;
  sfxPrompt?: string;
  cameraMotion?: string;
  duration?: number;
  image_path?: string;
  status?: string;
  videoPath?: string;
  audioPath?: string;
  sort_order?: number;
}

export interface OpportunityVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  platform: string;
  channelTitle?: string;
}

export interface UserCredits {
  credits: number;
  limit: number;
  resetDate: string;
}

export type ProductionTemplate = 'cinematic' | 'dynamic' | 'simple' | 'pixar';
export type Platform = 'youtube' | 'tiktok' | 'x' | 'meta';
export type TtsProvider = 'edge' | 'openai' | 'xtts';
export type Language = 'tr' | 'en';
export type Tab = 'create' | 'gallery' | 'opportunities' | 'groupchat';
