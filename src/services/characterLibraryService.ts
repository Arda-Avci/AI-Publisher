/**
 * CharacterLibraryService — user-owned character kütüphanesi.
 *
 * Her kullanici kendi karakterlerini olusturur, duzenler, listeler.
 * Otomatik yas + cinsiyet bazli default fiziksel olculer ve outfit preset'i atar.
 */

import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import {
  CharacterProfileSchema,
  type CharacterProfile,
} from '../types/characterProfile.js';
import {
  getCharacterDefaults,
  getOutfitPrompt,
  type Gender,
  type PresetMeasurements,
  type PresetAppearance,
} from './characterPresets.js';

// (Logger is used as static class below)

export interface LibraryCharacter {
  id: number;
  user_id: number;
  name: string;
  role: string | null;
  age: number | null;
  gender: Gender;
  body_type: string | null;
  outfit_preset: string | null;
  visual_style: string;
  measurements: PresetMeasurements;
  appearance: PresetAppearance;
  style: { clothingStyle?: string; personality?: string; voice?: string; accessories?: string[] };
  freeform_description: string | null;
  reference_image_base64: string | null;
  is_favorite: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterInput {
  name: string;
  age: number;
  gender: Gender;
  role?: string;
  /** Eger verilirse defaultlarin uzerine yazilir (kullanici elle degistirdi) */
  measurements?: Partial<PresetMeasurements>;
  appearance?: Partial<PresetAppearance>;
  outfit_preset?: string;
  visual_style?: string;
  freeform_description?: string;
  reference_image_base64?: string;
}

export interface UpdateCharacterInput {
  name?: string;
  age?: number;
  gender?: Gender;
  role?: string;
  measurements?: Partial<PresetMeasurements>;
  appearance?: Partial<PresetAppearance>;
  style?: { clothingStyle?: string; personality?: string; voice?: string; accessories?: string[] };
  outfit_preset?: string;
  visual_style?: string;
  freeform_description?: string;
  reference_image_base64?: string;
  is_favorite?: 0 | 1;
}

function rowToChar(row: Record<string, unknown>): LibraryCharacter {
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    name: row.name as string,
    role: (row.role as string) || null,
    age: (row.age as number) || null,
    gender: ((row.gender as Gender) || 'unspecified'),
    body_type: (row.body_type as string) || null,
    outfit_preset: (row.outfit_preset as string) || null,
    visual_style: (row.visual_style as string) || 'realistic',
    measurements: parseJsonField(row.measurements) as unknown as PresetMeasurements,
    appearance: parseJsonField(row.appearance) as unknown as PresetAppearance,
    style: parseJsonField(row.style),
    freeform_description: (row.freeform_description as string) || null,
    reference_image_base64: (row.reference_image_base64 as string) || null,
    is_favorite: (row.is_favorite as number) || 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function parseJsonField(field: unknown): Record<string, unknown> {
  if (!field) return {};
  if (typeof field === 'object') return field as Record<string, unknown>;
  if (typeof field === 'string') {
    try { return JSON.parse(field); } catch { return {}; }
  }
  return {};
}

/** Yeni karakter olustur (otomatik defaultlarla) */
export async function createCharacter(userId: number, input: CreateCharacterInput): Promise<LibraryCharacter> {
  // Yas + cinsiyet bazli default degerler
  const defaults = getCharacterDefaults(input.name, input.age, input.gender);

  // Kullanici override'larini defaultlar uzerine yaz
  const finalMeasurements: PresetMeasurements = { ...defaults.measurements, ...(input.measurements || {}) };
  const finalAppearance: PresetAppearance = { ...defaults.appearance, ...(input.appearance || {}) };
  const finalOutfit = input.outfit_preset || defaults.outfit_preset;

  const row = await db.get(
    `INSERT INTO character_profiles_v2
      (user_id, name, role, age, gender, body_type, outfit_preset, visual_style,
       measurements, appearance, style, freeform_description, reference_image_base64)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?, ?)
     RETURNING *`,
    [
      userId,
      input.name,
      input.role || null,
      input.age,
      input.gender,
      finalAppearance.bodyType || null,
      finalOutfit,
      input.visual_style || 'realistic',
      JSON.stringify(finalMeasurements),
      JSON.stringify(finalAppearance),
      JSON.stringify({ outfit: getOutfitPrompt(finalOutfit) || null }),
      input.freeform_description || null,
      input.reference_image_base64 || null,
    ],
  );
  return rowToChar(row);
}

/** Kullaniciya ait karakterleri listele */
export async function listCharacters(userId: number, opts?: { favoriteOnly?: boolean; search?: string }): Promise<LibraryCharacter[]> {
  const conditions: string[] = ['user_id = ?'];
  const params: (string | number)[] = [userId];
  if (opts?.favoriteOnly) {
    conditions.push('is_favorite = 1');
  }
  if (opts?.search) {
    conditions.push('(name ILIKE ? OR role ILIKE ?)');
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  const sql = `SELECT * FROM character_profiles_v2 WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`;
  const rows = await db.all(sql, params);
  return rows.map((r: Record<string, unknown>) => rowToChar(r));
}

/** Tek karakter getir (user-scoped) */
export async function getCharacter(userId: number, id: number): Promise<LibraryCharacter | null> {
  const row = await db.get(
    'SELECT * FROM character_profiles_v2 WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row ? rowToChar(row) : null;
}

/** Karakter guncelle */
export async function updateCharacter(userId: number, id: number, input: UpdateCharacterInput): Promise<LibraryCharacter | null> {
  const current = await getCharacter(userId, id);
  if (!current) return null;

  // Degisiklikleri birlestir
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.role !== undefined) updates.role = input.role;
  if (input.age !== undefined) updates.age = input.age;
  if (input.gender !== undefined) updates.gender = input.gender;
  if (input.outfit_preset !== undefined) updates.outfit_preset = input.outfit_preset;
  if (input.freeform_description !== undefined) updates.freeform_description = input.freeform_description;
  if (input.reference_image_base64 !== undefined) updates.reference_image_base64 = input.reference_image_base64;
  if (input.is_favorite !== undefined) updates.is_favorite = input.is_favorite;
  if (input.visual_style !== undefined) updates.visual_style = input.visual_style;
  if (input.measurements) updates.measurements = { ...current.measurements, ...input.measurements };
  if (input.appearance) updates.appearance = { ...current.appearance, ...input.appearance };
  if (input.style) {
    const newStyle: Record<string, unknown> = { ...current.style, ...input.style };
    if (input.outfit_preset) newStyle.outfit = getOutfitPrompt(input.outfit_preset) || null;
    updates.style = newStyle;
  }
  updates.updated_at = new Date().toISOString();

  // SQL update
  const setClauses: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'measurements' || k === 'appearance' || k === 'style') {
      setClauses.push(`${k} = ?::jsonb`);
      params.push(JSON.stringify(v));
    } else {
      setClauses.push(`${k} = ?`);
      params.push(v);
    }
  }
  params.push(id, userId);

  const row = await db.get(
    `UPDATE character_profiles_v2 SET ${setClauses.join(', ')}
     WHERE id = ? AND user_id = ? RETURNING *`,
    params,
  );
  return row ? rowToChar(row) : null;
}

/** Karakter sil */
export async function deleteCharacter(userId: number, id: number): Promise<boolean> {
  const result = await db.run(
    'DELETE FROM character_profiles_v2 WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return (result.changes ?? 0) > 0;
}

/** LibraryCharacter → CharacterProfile (job icin) donusumu */
export function libraryToProfile(char: LibraryCharacter): CharacterProfile {
  return {
    name: char.name,
    role: char.role ?? undefined,
    measurements: char.measurements as CharacterProfile['measurements'],
    appearance: {
      ...(char.appearance as CharacterProfile['appearance']),
      age: char.age ?? undefined,
      gender: char.gender,
    },
    style: {
      ...(char.style as CharacterProfile['style']),
      outfitDescription: getOutfitPrompt(char.outfit_preset ?? '') ?? undefined,
    },
    visualStyle: (char.visual_style as CharacterProfile['visualStyle']) ?? 'realistic',
    freeformDescription: char.freeform_description ?? undefined,
  };
}

/** Kütüphane karakterini job'a eklemek icin JSON string uretir */
export function libraryToJobProfilesJson(chars: LibraryCharacter[]): string {
  const profiles = chars.map(libraryToProfile);
  const validated = profiles.map((p) => CharacterProfileSchema.parse(p));
  return JSON.stringify(validated);
}
