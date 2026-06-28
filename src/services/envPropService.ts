
import { db } from '../db.js';
import type { Environment, Prop, EnvCategory, PropCategory } from '../types/envProp.js';

// ── Row dönüştürücüler ──────────────────────────────────────────

function rowToEnv(row: Record<string, unknown>): Environment {
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    name: row.name as string,
    category: row.category as EnvCategory,
    description: (row.description as string) || '',
    mood_tags: parseJsonArray<string>(row.mood_tags),
    color_palette: parseJsonArray<string>(row.color_palette),
    lighting_notes: (row.lighting_notes as string) || '',
    reference_image_url: (row.reference_image_url as string) || undefined,
    is_favorite: (row.is_favorite as number) === 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToProp(row: Record<string, unknown>): Prop {
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    name: row.name as string,
    category: row.category as PropCategory,
    description: (row.description as string) || '',
    environment_id: (row.environment_id as number) || null,
    interaction_notes: (row.interaction_notes as string) || '',
    reference_image_url: (row.reference_image_url as string) || undefined,
    is_favorite: (row.is_favorite as number) === 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function parseJsonArray<T>(field: unknown): T[] {
  if (!field) return [];
  if (Array.isArray(field)) return field as T[];
  if (typeof field === 'string') {
    try { return JSON.parse(field) as T[]; } catch { return []; }
  }
  return [];
}

// ── Environment CRUD ────────────────────────────────────────────

export async function getEnvironments(userId: number): Promise<Environment[]> {
  const rows = await db.all(
    'SELECT * FROM env_environments WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
  );
  return rows.map((r: Record<string, unknown>) => rowToEnv(r));
}

export async function getEnvironmentById(id: number, userId: number): Promise<Environment | null> {
  const row = await db.get(
    'SELECT * FROM env_environments WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row ? rowToEnv(row) : null;
}

export async function createEnvironment(
  userId: number,
  data: Omit<Environment, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<Environment> {
  const row = await db.get(
    `INSERT INTO env_environments
      (user_id, name, category, description, mood_tags, color_palette, lighting_notes, reference_image_url, is_favorite)
     VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?)
     RETURNING *`,
    [
      userId,
      data.name,
      data.category,
      data.description,
      JSON.stringify(data.mood_tags),
      JSON.stringify(data.color_palette),
      data.lighting_notes,
      data.reference_image_url || null,
      data.is_favorite ? 1 : 0,
    ],
  );
  return rowToEnv(row);
}

export async function updateEnvironment(
  id: number,
  userId: number,
  data: Partial<Omit<Environment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Environment | null> {
  const current = await getEnvironmentById(id, userId);
  if (!current) return null;

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.category !== undefined) updates.category = data.category;
  if (data.description !== undefined) updates.description = data.description;
  if (data.mood_tags !== undefined) updates.mood_tags = JSON.stringify(data.mood_tags);
  if (data.color_palette !== undefined) updates.color_palette = JSON.stringify(data.color_palette);
  if (data.lighting_notes !== undefined) updates.lighting_notes = data.lighting_notes;
  if (data.reference_image_url !== undefined) updates.reference_image_url = data.reference_image_url || null;
  if (data.is_favorite !== undefined) updates.is_favorite = data.is_favorite ? 1 : 0;
  updates.updated_at = new Date().toISOString();

  const setClauses: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'mood_tags' || k === 'color_palette') {
      setClauses.push(`${k} = ?::jsonb`);
      params.push(v);
    } else {
      setClauses.push(`${k} = ?`);
      params.push(v);
    }
  }
  params.push(id, userId);

  const row = await db.get(
    `UPDATE env_environments SET ${setClauses.join(', ')}
     WHERE id = ? AND user_id = ? RETURNING *`,
    params,
  );
  return row ? rowToEnv(row) : null;
}

export async function deleteEnvironment(id: number, userId: number): Promise<boolean> {
  const result = await db.run(
    'DELETE FROM env_environments WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return (result.changes ?? 0) > 0;
}

// ── Prop CRUD ───────────────────────────────────────────────────

export async function getProps(userId: number, envId?: number): Promise<Prop[]> {
  if (envId !== undefined) {
    const rows = await db.all(
      'SELECT * FROM env_props WHERE user_id = ? AND environment_id = ? ORDER BY updated_at DESC',
      [userId, envId],
    );
    return rows.map((r: Record<string, unknown>) => rowToProp(r));
  }
  const rows = await db.all(
    'SELECT * FROM env_props WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
  );
  return rows.map((r: Record<string, unknown>) => rowToProp(r));
}

export async function getPropById(id: number, userId: number): Promise<Prop | null> {
  const row = await db.get(
    'SELECT * FROM env_props WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row ? rowToProp(row) : null;
}

export async function createProp(
  userId: number,
  data: Omit<Prop, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<Prop> {
  const row = await db.get(
    `INSERT INTO env_props
      (user_id, name, category, description, environment_id, interaction_notes, reference_image_url, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      userId,
      data.name,
      data.category,
      data.description,
      data.environment_id ?? null,
      data.interaction_notes,
      data.reference_image_url || null,
      data.is_favorite ? 1 : 0,
    ],
  );
  return rowToProp(row);
}

export async function updateProp(
  id: number,
  userId: number,
  data: Partial<Omit<Prop, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Prop | null> {
  const current = await getPropById(id, userId);
  if (!current) return null;

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.category !== undefined) updates.category = data.category;
  if (data.description !== undefined) updates.description = data.description;
  if (data.environment_id !== undefined) updates.environment_id = data.environment_id ?? null;
  if (data.interaction_notes !== undefined) updates.interaction_notes = data.interaction_notes;
  if (data.reference_image_url !== undefined) updates.reference_image_url = data.reference_image_url || null;
  if (data.is_favorite !== undefined) updates.is_favorite = data.is_favorite ? 1 : 0;
  updates.updated_at = new Date().toISOString();

  const setClauses: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    setClauses.push(`${k} = ?`);
    params.push(v);
  }
  params.push(id, userId);

  const row = await db.get(
    `UPDATE env_props SET ${setClauses.join(', ')}
     WHERE id = ? AND user_id = ? RETURNING *`,
    params,
  );
  return row ? rowToProp(row) : null;
}

export async function deleteProp(id: number, userId: number): Promise<boolean> {
  const result = await db.run(
    'DELETE FROM env_props WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return (result.changes ?? 0) > 0;
}
