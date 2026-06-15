export type ScriptStatus = 'draft' | 'generating' | 'completed' | 'error';
export type SceneType = 'opening' | 'talk' | 'reaction' | 'wide' | 'closing';

export interface Script {
  id: number;
  show_id: number;
  user_id: number;
  title: string;
  status: ScriptStatus;
  scene_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScriptSegment {
  id: number;
  script_id: number;
  scene_number: number;
  scene_type: SceneType;
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
