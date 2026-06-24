import { z } from 'zod';

// ── Existing TalkShow types ──

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

// ── CrewAI Writer Pipeline types ──

export const CharacterInfoSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
  motivation: z.string(),
  flaw: z.string(),
  description: z.string().optional(),
});

export const ScenePlanSchema = z.object({
  sceneNumber: z.number(),
  location: z.string(),
  timeOfDay: z.string(),
  interior: z.boolean(),
  purpose: z.string(),
  characters: z.array(z.string()),
  plot: z.string(),
});

export const ReviewResultSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.string()).optional(),
  feedback: z.string().optional(),
});

export const ScriptOutputSchema = z.object({
  logline: z.string(),
  theme: z.string(),
  genre: z.string(),
  characters: z.array(CharacterInfoSchema),
  synopsis: z.string(),
  scenes: z.array(ScenePlanSchema),
  fullScript: z.string(),
  revisionCount: z.number(),
  status: z.enum(['approved', 'revised', 'max_revisions']),
});

export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;
export type ScenePlan = z.infer<typeof ScenePlanSchema>;
export type ReviewResult = z.infer<typeof ReviewResultSchema>;
