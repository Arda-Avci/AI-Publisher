import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, db } from './db.js';
import { CharacterService } from './services/characterService.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';

describe('CharacterService', () => {
  const service = new CharacterService();
  let testUserId: number;

  beforeAll(async () => {
    await initDatabase();
    const testUser = encryptUsername('char_svc_test_user');
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [testUser]);
    if (existing) {
      testUserId = existing.id;
    } else {
      const hp = await bcrypt.hash('test123', 10);
      const r = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [testUser, hp]);
      testUserId = r.lastID!;
    }
  });

  afterAll(async () => {
    const testUser = encryptUsername('char_svc_test_user');
    await db.run('DELETE FROM characters WHERE user_id = ?', [testUserId]);
    await db.run('DELETE FROM users WHERE username = ?', [testUser]);
  });

  it('create character returns character with auto-generated slug', async () => {
    const char = await service.create({
      user_id: testUserId,
      name: 'Test Hero',
      description: 'A brave warrior',
      role_archetype: 'protagonist',
    });

    expect(char).toBeDefined();
    expect(char.id).toBeGreaterThan(0);
    expect(char.name).toBe('Test Hero');
    expect(char.slug).toBe('test_hero');
    expect(char.description).toBe('A brave warrior');
    expect(char.role_archetype).toBe('protagonist');
  });

  it('findById returns null for non-existent character', async () => {
    const result = await service.findById(-1);
    expect(result).toBeNull();
  });

  it('findAll returns only characters for the given user', async () => {
    const chars = await service.findAll(testUserId);
    expect(chars).toBeInstanceOf(Array);
    expect(chars.length).toBeGreaterThanOrEqual(1);
    for (const c of chars) {
      expect(c.user_id).toBe(testUserId);
    }
  });

  it('update changes character fields', async () => {
    const char = await service.create({
      user_id: testUserId,
      name: 'Update Test',
      description: 'Before update',
    });

    const updated = await service.update(char.id!, {
      description: 'After update',
      color: '#FF0000',
    });

    expect(updated).not.toBeNull();
    expect(updated!.description).toBe('After update');
    expect(updated!.color).toBe('#FF0000');
  });

  it('delete returns false for non-existent character', async () => {
    const result = await service.delete(-1);
    expect(result).toBe(false);
  });

  it('delete removes character and returns true', async () => {
    const char = await service.create({
      user_id: testUserId,
      name: 'Delete Me',
    });

    const found = await service.findById(char.id!);
    expect(found).not.toBeNull();

    const deleted = await service.delete(char.id!);
    expect(deleted).toBe(true);

    const after = await service.findById(char.id!);
    expect(after).toBeNull();
  });
});
