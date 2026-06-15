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
  id?: number;
  user_id: number;
  name: string;
  description: string;
  slug: string;
  role_archetype: 'protagonist' | 'mentor' | 'comic_relief' | 'antagonist' | 'supporting' | 'narrator';
  reference_image_base64?: string;
  tts_voice_id: string;
  voice_provider: 'edge' | 'openai' | 'xtts';
  llm_provider?: LlmProvider;
  llm_model?: string;
  avatar_style?: AvatarStyle;
  avatar_source?: AvatarSource;
  color?: string;
  relationships?: CharacterRelationship[];
  created_at?: string;
  updated_at?: string;
}

/** "Name - Description" paired string for AI prompt injection (Comic-Studio-Ai pattern). */
export function characterPromptLine(c: Character | { name: string; description: string }): string {
  return `${c.name} - ${c.description}`;
}

/** All characters as a single prompt block with consistency guard (ppt-anything one-liner pattern). */
export function characterConsistencyBlock(characters: Character[]): string {
  if (characters.length === 0) return '';
  const lines = characters.map(c => characterPromptLine(c));
  return [
    '',
    'CHARACTERS (maintain these across all scenes):',
    ...lines.map(l => `- ${l}`),
    '',
    'CRITICAL CONSISTENCY REQUIREMENTS:',
    '- Same appearance for each character across all scenes',
    '- Same clothing colors, same body shape, same facial features',
    '- Characters must look identical in every scene',
    '',
  ].join('\n');
}
