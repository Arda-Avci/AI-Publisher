/**
 * Story Bible Service
 * Persistent story development with characters, plot points, and world-building
 */

import { db } from '../db.js';

export interface StoryBible {
  id: number;
  userId: number;
  title: string;
  genre: string;
  description: string;
  worldSetting?: string;
  themes?: string;
  tone?: string;
  targetAudience?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryCharacter {
  id: number;
  storyBibleId: number;
  name: string;
  role: string;
  description: string;
  backstory?: string;
  personality?: string;
  goals?: string;
  conflicts?: string;
  avatarUrl?: string;
}

export interface PlotPoint {
  id: number;
  storyBibleId: number;
  title: string;
  description: string;
  orderIndex: number;
  act: 'setup' | 'confrontation' | 'resolution';
}

/**
 * Create a new story bible
 */
export async function createStoryBible(
  userId: number,
  title: string,
  genre: string,
  description: string,
  options?: {
    worldSetting?: string;
    themes?: string;
    tone?: string;
    targetAudience?: string;
  },
): Promise<StoryBible> {
  const result = await db.run(
    `INSERT INTO story_bibles (user_id, title, genre, description, world_setting, themes, tone, target_audience)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      userId,
      title,
      genre,
      description,
      options?.worldSetting || null,
      options?.themes || null,
      options?.tone || null,
      options?.targetAudience || null,
    ],
  );

  const bible = await getStoryBible(result.lastID!);
  if (!bible) throw new Error('Failed to retrieve created story bible');
  return bible;
}

/**
 * Get a story bible by ID
 */
export async function getStoryBible(id: number): Promise<StoryBible | null> {
  const row = await db.get('SELECT * FROM story_bibles WHERE id = $1', [id]);
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    genre: row.genre,
    description: row.description,
    worldSetting: row.world_setting,
    themes: row.themes,
    tone: row.tone,
    targetAudience: row.target_audience,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all story bibles for a user
 */
export async function getUserStoryBibles(userId: number): Promise<StoryBible[]> {
  const rows = await db.all(
    'SELECT * FROM story_bibles WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId],
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    genre: row.genre,
    description: row.description,
    worldSetting: row.world_setting,
    themes: row.themes,
    tone: row.tone,
    targetAudience: row.target_audience,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Update a story bible
 */
export async function updateStoryBible(
  id: number,
  updates: Partial<{
    title: string;
    genre: string;
    description: string;
    worldSetting: string;
    themes: string;
    tone: string;
    targetAudience: string;
  }>,
): Promise<StoryBible | null> {
  const updatesList: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (updates.title !== undefined) {
    updatesList.push(`title = $${i++}`);
    params.push(updates.title);
  }
  if (updates.genre !== undefined) {
    updatesList.push(`genre = $${i++}`);
    params.push(updates.genre);
  }
  if (updates.description !== undefined) {
    updatesList.push(`description = $${i++}`);
    params.push(updates.description);
  }
  if (updates.worldSetting !== undefined) {
    updatesList.push(`world_setting = $${i++}`);
    params.push(updates.worldSetting);
  }
  if (updates.themes !== undefined) {
    updatesList.push(`themes = $${i++}`);
    params.push(updates.themes);
  }
  if (updates.tone !== undefined) {
    updatesList.push(`tone = $${i++}`);
    params.push(updates.tone);
  }
  if (updates.targetAudience !== undefined) {
    updatesList.push(`target_audience = $${i++}`);
    params.push(updates.targetAudience);
  }

  if (updatesList.length === 0) return getStoryBible(id);

  params.push(id);
  await db.run(
    `UPDATE story_bibles SET ${updatesList.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i}`,
    params,
  );

  return getStoryBible(id);
}

/**
 * Delete a story bible
 */
export async function deleteStoryBible(id: number): Promise<void> {
  await db.run('DELETE FROM story_bibles WHERE id = $1', [id]);
}

/**
 * Add a character to a story bible
 */
export async function addCharacter(
  storyBibleId: number,
  character: Omit<StoryCharacter, 'id' | 'storyBibleId'>,
): Promise<StoryCharacter> {
  const result = await db.run(
    `INSERT INTO story_characters (story_bible_id, name, role, description, backstory, personality, goals, conflicts, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      storyBibleId,
      character.name,
      character.role,
      character.description,
      character.backstory || null,
      character.personality || null,
      character.goals || null,
      character.conflicts || null,
      character.avatarUrl || null,
    ],
  );

  const char = await getCharacter(result.lastID!);
  if (!char) throw new Error('Failed to retrieve created character');
  return char;
}

/**
 * Get a character by ID
 */
export async function getCharacter(id: number): Promise<StoryCharacter | null> {
  const row = await db.get('SELECT * FROM story_characters WHERE id = $1', [id]);
  if (!row) return null;

  return {
    id: row.id,
    storyBibleId: row.story_bible_id,
    name: row.name,
    role: row.role,
    description: row.description,
    backstory: row.backstory,
    personality: row.personality,
    goals: row.goals,
    conflicts: row.conflicts,
    avatarUrl: row.avatar_url,
  };
}

/**
 * Get all characters for a story bible
 */
export async function getStoryCharacters(storyBibleId: number): Promise<StoryCharacter[]> {
  const rows = await db.all(
    'SELECT * FROM story_characters WHERE story_bible_id = $1 ORDER BY id',
    [storyBibleId],
  );
  return rows.map((row) => ({
    id: row.id,
    storyBibleId: row.story_bible_id,
    name: row.name,
    role: row.role,
    description: row.description,
    backstory: row.backstory,
    personality: row.personality,
    goals: row.goals,
    conflicts: row.conflicts,
    avatarUrl: row.avatar_url,
  }));
}

/**
 * Update a character
 */
export async function updateCharacter(
  id: number,
  updates: Partial<Omit<StoryCharacter, 'id' | 'storyBibleId'>>,
): Promise<StoryCharacter | null> {
  const updatesList: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (updates.name !== undefined) {
    updatesList.push(`name = $${i++}`);
    params.push(updates.name);
  }
  if (updates.role !== undefined) {
    updatesList.push(`role = $${i++}`);
    params.push(updates.role);
  }
  if (updates.description !== undefined) {
    updatesList.push(`description = $${i++}`);
    params.push(updates.description);
  }
  if (updates.backstory !== undefined) {
    updatesList.push(`backstory = $${i++}`);
    params.push(updates.backstory);
  }
  if (updates.personality !== undefined) {
    updatesList.push(`personality = $${i++}`);
    params.push(updates.personality);
  }
  if (updates.goals !== undefined) {
    updatesList.push(`goals = $${i++}`);
    params.push(updates.goals);
  }
  if (updates.conflicts !== undefined) {
    updatesList.push(`conflicts = $${i++}`);
    params.push(updates.conflicts);
  }
  if (updates.avatarUrl !== undefined) {
    updatesList.push(`avatar_url = $${i++}`);
    params.push(updates.avatarUrl);
  }

  if (updatesList.length === 0) return getCharacter(id);

  params.push(id);
  await db.run(`UPDATE story_characters SET ${updatesList.join(', ')} WHERE id = $${i}`, params);

  return getCharacter(id);
}

/**
 * Delete a character
 */
export async function deleteCharacter(id: number): Promise<void> {
  await db.run('DELETE FROM story_characters WHERE id = $1', [id]);
}

/**
 * Add a plot point to a story bible
 */
export async function addPlotPoint(
  storyBibleId: number,
  plotPoint: Omit<PlotPoint, 'id' | 'storyBibleId'>,
): Promise<PlotPoint> {
  const result = await db.run(
    `INSERT INTO story_plot_points (story_bible_id, title, description, order_index, act)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [storyBibleId, plotPoint.title, plotPoint.description, plotPoint.orderIndex, plotPoint.act],
  );

  const plot = await getPlotPoint(result.lastID!);
  if (!plot) throw new Error('Failed to retrieve created plot point');
  return plot;
}

/**
 * Get a plot point by ID
 */
export async function getPlotPoint(id: number): Promise<PlotPoint | null> {
  const row = await db.get('SELECT * FROM story_plot_points WHERE id = $1', [id]);
  if (!row) return null;

  return {
    id: row.id,
    storyBibleId: row.story_bible_id,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    act: row.act,
  };
}

/**
 * Get all plot points for a story bible
 */
export async function getStoryPlotPoints(storyBibleId: number): Promise<PlotPoint[]> {
  const rows = await db.all(
    'SELECT * FROM story_plot_points WHERE story_bible_id = $1 ORDER BY order_index',
    [storyBibleId],
  );
  return rows.map((row) => ({
    id: row.id,
    storyBibleId: row.story_bible_id,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    act: row.act,
  }));
}

/**
 * Update a plot point
 */
export async function updatePlotPoint(
  id: number,
  updates: Partial<Omit<PlotPoint, 'id' | 'storyBibleId'>>,
): Promise<PlotPoint | null> {
  const updatesList: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (updates.title !== undefined) {
    updatesList.push(`title = $${i++}`);
    params.push(updates.title);
  }
  if (updates.description !== undefined) {
    updatesList.push(`description = $${i++}`);
    params.push(updates.description);
  }
  if (updates.orderIndex !== undefined) {
    updatesList.push(`order_index = $${i++}`);
    params.push(updates.orderIndex);
  }
  if (updates.act !== undefined) {
    updatesList.push(`act = $${i++}`);
    params.push(updates.act);
  }

  if (updatesList.length === 0) return getPlotPoint(id);

  params.push(id);
  await db.run(`UPDATE story_plot_points SET ${updatesList.join(', ')} WHERE id = $${i}`, params);

  return getPlotPoint(id);
}

/**
 * Delete a plot point
 */
export async function deletePlotPoint(id: number): Promise<void> {
  await db.run('DELETE FROM story_plot_points WHERE id = $1', [id]);
}

/**
 * Generate enhanced prompts from a story bible
 */
export async function generateFromStoryBible(
  storyBibleId: number,
  template: 'cinematic' | 'dynamic' | 'simple' | 'pixar',
  options?: {
    sceneCount?: number;
    includeCharacters?: boolean;
    includePlotPoints?: boolean;
  },
): Promise<{
  masterPrompt: string;
  productionNotes: string;
  characterFeatures: string;
  scenePrompts: string[];
}> {
  const storyBible = await getStoryBible(storyBibleId);
  if (!storyBible) throw new Error('Story bible not found');

  const characters =
    options?.includeCharacters !== false ? await getStoryCharacters(storyBibleId) : [];
  const plotPoints =
    options?.includePlotPoints !== false ? await getStoryPlotPoints(storyBibleId) : [];

  // Build master prompt from story bible
  let masterPrompt = `${storyBible.title}: ${storyBible.description}`;

  if (storyBible.worldSetting) {
    masterPrompt += `\n\nDünya/Ayar: ${storyBible.worldSetting}`;
  }

  if (storyBible.tone) {
    masterPrompt += `\n\nTon/Stil: ${storyBible.tone}`;
  }

  // Build character features
  let characterFeatures = '';
  if (characters.length > 0) {
    characterFeatures = characters
      .map((c) => `@${c.name} (${c.role}): ${c.description}`)
      .join('\n');
  }

  // Build production notes
  let productionNotes = `Tür: ${storyBible.genre}`;
  if (storyBible.targetAudience) {
    productionNotes += `\nHedef Kitle: ${storyBible.targetAudience}`;
  }
  if (storyBible.themes) {
    productionNotes += `\nTemalar: ${storyBible.themes}`;
  }

  // Build scene prompts from plot points
  const sceneCount = options?.sceneCount || 5;
  const scenePrompts = plotPoints.slice(0, sceneCount).map((pp, idx) => {
    const actLabel =
      pp.act === 'setup' ? 'Giriş' : pp.act === 'confrontation' ? 'Çatışma' : 'Çözüm';
    return `[${actLabel}] ${pp.title}: ${pp.description}`;
  });

  return {
    masterPrompt,
    productionNotes,
    characterFeatures,
    scenePrompts,
  };
}
