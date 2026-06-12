import { db } from '../db.js';
import { Character } from '../types/character.js';
import { Logger } from '../lib/logger.js';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export class CharacterService {
  async findAll(userId: number): Promise<Character[]> {
    Logger.debug('CharacterService.findAll', { userId });
    return db.all('SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  async findById(id: number): Promise<Character | null> {
    Logger.debug('CharacterService.findById', { id });
    const row = await db.get('SELECT * FROM characters WHERE id = ?', [id]);
    return row || null;
  }

  async create(data: Partial<Character>): Promise<Character> {
    const slug = generateSlug(data.name || '');
    Logger.info('CharacterService.create', { name: data.name, slug });

    const row = await db.get(
      `INSERT INTO characters (user_id, name, description, slug, role_archetype, reference_image_base64, tts_voice_id, voice_provider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [
        data.user_id,
        data.name,
        data.description || '',
        slug,
        data.role_archetype || 'supporting',
        data.reference_image_base64 || null,
        data.tts_voice_id || '',
        data.voice_provider || 'edge',
      ]
    );
    return row as Character;
  }

  async update(id: number, data: Partial<Character>): Promise<Character | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const slug = data.name ? generateSlug(data.name) : existing.slug;
    Logger.info('CharacterService.update', { id, name: data.name || existing.name });

    const row = await db.get(
      `UPDATE characters
       SET name = ?, description = ?, slug = ?, role_archetype = ?,
           reference_image_base64 = ?, tts_voice_id = ?, voice_provider = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING *`,
      [
        data.name ?? existing.name,
        data.description ?? existing.description,
        slug,
        data.role_archetype ?? existing.role_archetype,
        data.reference_image_base64 !== undefined ? data.reference_image_base64 : existing.reference_image_base64,
        data.tts_voice_id ?? existing.tts_voice_id,
        data.voice_provider ?? existing.voice_provider,
        id,
      ]
    );
    return row as Character;
  }

  async delete(id: number): Promise<boolean> {
    Logger.info('CharacterService.delete', { id });
    const result = await db.run('DELETE FROM characters WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}
