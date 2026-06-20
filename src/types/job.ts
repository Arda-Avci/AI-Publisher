export interface VideoJob {
  id: number;
  user_id: number;
  status: 'pending' | 'processing' | 'failed' | 'completed' | 'cancelled' | 'awaiting_approval';
  master_prompt?: string;
  production_notes?: string;
  character_features?: string;
  material_path?: string;
  estimated_minutes?: number;
  total_scenes?: number;
  completed_scenes?: number;
  current_stage?: string;
  progress_percent?: number;
  final_filename?: string;
  target_platforms?: string;
  yt_title?: string;
  yt_desc?: string;
  yt_tags?: string;
  yt_status?: string;
  tt_desc?: string;
  tt_tags?: string;
  tt_status?: string;
  x_desc?: string;
  x_tags?: string;
  x_status?: string;
  meta_desc?: string;
  meta_tags?: string;
  meta_status?: string;
  playlist_id?: string;
  cover_image_path?: string;
  cover_images?: string;
  has_shorts?: number;
  has_subtitles?: number;
  source_video_id?: string;
  source_video_meta?: string;
  differentiation_target_lang?: string;
  differentiation_duration_mode?: string;
  differentiation_layout?: number;
  transcript?: string;
  transcript_cleaned?: string;
  transcript_translated?: string;
  scene_prompts?: string;
  colab_task_id?: string;
  tts_provider?: string;
  tts_voice?: string;
  model_type?: string;
  production_template?: string;
  brand_kit_enabled?: number;
  dubbing_lang?: string;
  kinetic_subtitles?: number;
  viral_score?: number;
  auto_sfx_placement?: number;
  audio_ducking?: number;
  background_music_path?: string;
  retry_count?: number;

  dubbing_enabled?: number;
  dubbing_voice?: string;
  dubbing_source_lang?: string;
  dubbing_status?: string;
  dubbing_output_path?: string;

  storyboard_enabled?: number;

  deep_think?: number;

  // v6.0 Grup 1
  niche_profile?: string;
  niche_enabled?: number;
  split_layout?: string;
  split_enabled?: number;
  use_musetalk?: number;
  musetalk_enabled?: number;
  color_grade_preset?: string;
  color_grade_enabled?: number;
  auto_cut_enabled?: number;
  auto_cut_preset?: string;
  sd_flux_enabled?: number;
  sd_flux_prompt?: string;
  kinetic_subtitles_style?: string;
  transcript_word_timings?: string;
  beat_sync_enabled?: number;
  beat_sync_bpm?: number;
  beat_sync_min_segment?: number;
  studio_sound_enabled?: number;
  eye_contact_enabled?: number;
  smart_reframe_enabled?: number;
  inpaint_enabled?: number;
  viral_hook_enabled?: number;
  broll_enabled?: number;
  emotion_captions?: number;

  // LoRA fine-tuning
  lora_enabled?: number;
  character_images?: string;
  multi_character?: number;
}

export interface VideoScene {
  id: number;
  job_id: number;
  scene_number: number;
  video_prompt: string;
  speech_text?: string;
  sfx_prompt?: string;
  camera_motion?: string;
  image_path?: string;
  mask_path?: string;
  video_path?: string;
  audio_path?: string;
  status?: string;
  sort_order: number;
  music_volume?: number;
  speaker?: string;
}
