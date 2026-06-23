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
  viral_score?: number | null;
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

export interface TalkShowMessage {
  role: string;
  speaker: string;
  content: string;
  confidence: number;
  sentiment: string;
  evidence?: string[];
  timestamp: number;
}

export interface TalkShowConsensus {
  pick: 'home' | 'draw' | 'away' | 'no_consensus';
  confidence: number;
  rationale: string;
}

export interface TalkShowResult {
  topic: string;
  match: {
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    venue: string;
    competition: string;
  };
  transcript: TalkShowMessage[];
  summary: string;
  consensus: TalkShowConsensus;
  generatedAt: number;
  durationMs: number;
}

export type LlmProvider = 'zen' | 'gemini' | 'claude' | 'deepseek';
export type AvatarStyle = 'realistic' | 'animatic';
export type AvatarSource = 'ai' | 'upload';
export type RelationshipType = 'friendly' | 'neutral' | 'antagonistic' | 'respectful';

export interface CharacterRelationship {
  characterId: number;
  type: RelationshipType;
  notes?: string;
}

export interface Character {
  id: number;
  name: string;
  description: string;
  role_archetype: 'protagonist' | 'mentor' | 'comic_relief' | 'antagonist' | 'supporting' | 'narrator';
  voice_provider: 'edge' | 'openai' | 'xtts';
  voice_id: string;
  reference_image?: string;
  llm_provider?: LlmProvider;
  llm_model?: string;
  avatar_style?: AvatarStyle;
  avatar_source?: AvatarSource;
  color?: string;
  relationships?: CharacterRelationship[];
  created_at?: string;
  updated_at?: string;
}

export interface TrendItem {
  platform: 'tiktok' | 'youtube' | 'x' | 'instagram';
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  engagement: number;
  hashtags: string[];
  category: string;
  author?: string;
  scrapedAt: string;
}

export interface TrendHistoryPoint {
  date: string;
  count: number;
  platform: string;
}

export interface TrendSummary {
  platform: string;
  total: number;
  topCategories: { category: string; count: number }[];
}

export type ProductionTemplate = 'cinematic' | 'dynamic' | 'simple' | 'pixar' | 'cogvideox5b' | 'cogvideox2b' | 'sadtalker' | 'dynamicrafter' | 'zeroscope' | 'geneface' | 'pyramid-flow' | 'video-retalking' | 'mochi' | 'veo31';
export type Platform = 'youtube' | 'tiktok' | 'x' | 'meta';
export type TtsProvider = 'edge' | 'openai' | 'xtts';
export type Language = 'tr' | 'en';
export type Tab = 'create' | 'gallery' | 'opportunities' | 'groupchat' | 'canvas' | 'apikeys' | 'batch';

export interface Script {
  id: number;
  show_id: number;
  user_id: number;
  title: string;
  status: 'draft' | 'generating' | 'completed' | 'error';
  scene_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScriptSegment {
  id: number;
  script_id: number;
  scene_number: number;
  scene_type: 'opening' | 'talk' | 'reaction' | 'wide' | 'closing';
  character_id: number | null;
  character_name: string | null;
  dialogue_text: string;
  camera_instruction: string;
  duration_seconds: number;
  order_index: number;
  metadata: Record<string, unknown>;
}

export interface ScriptWithSegments extends Script {
  segments: ScriptSegment[];
}
