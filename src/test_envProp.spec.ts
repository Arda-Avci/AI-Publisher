import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, initDatabase } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import {
  getEnvironments,
  getEnvironmentById,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  getProps,
  getPropById,
  createProp,
  updateProp,
  deleteProp,
} from './services/envPropService.js';
import { EnvCategorySchema, PropCategorySchema, EnvironmentSchema, PropSchema } from './types/envProp.js';

describe('Env/Prop Library', () => {
  let testUserId: number;

  beforeAll(async () => {
    await initDatabase();

    const testUsername = encryptUsername('test.envprop@gmail.com');
    await db.run('DELETE FROM users WHERE username = ?', [testUsername]);
    await db.run(
      'INSERT INTO users (username, password, credits, monthly_credit_limit) VALUES (?, ?, ?, ?)',
      [testUsername, 'testpass', 100, 100],
    );

    const user = await db.get('SELECT id FROM users WHERE username = ?', [testUsername]);
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await db.run('DELETE FROM env_props WHERE user_id = ?', [testUserId]);
      await db.run('DELETE FROM env_environments WHERE user_id = ?', [testUserId]);
      await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    }
  });

  // ── Schema Tests ──────────────────────────────────────────────

  describe('Zod Schemas', () => {
    it('EnvCategorySchema gecerli kategorileri kabul eder', () => {
      for (const cat of ['indoor', 'outdoor', 'fantasy', 'sci-fi', 'custom'] as const) {
        expect(EnvCategorySchema.parse(cat)).toBe(cat);
      }
    });

    it('EnvCategorySchema gecersiz kategoriyi reddeder', () => {
      const r = EnvCategorySchema.safeParse('invalid-cat');
      expect(r.success).toBe(false);
    });

    it('PropCategorySchema gecerli kategorileri kabul eder', () => {
      for (const cat of ['furniture', 'vehicle', 'weapon', 'technology', 'custom'] as const) {
        expect(PropCategorySchema.parse(cat)).toBe(cat);
      }
    });

    it('PropCategorySchema gecersiz kategoriyi reddeder', () => {
      const r = PropCategorySchema.safeParse('invalid-prop');
      expect(r.success).toBe(false);
    });

    it('EnvironmentSchema bos isim reddeder', () => {
      const r = EnvironmentSchema.safeParse({ name: '', category: 'indoor' });
      expect(r.success).toBe(false);
    });

    it('EnvironmentSchema varsayilan degerleri atar', () => {
      const r = EnvironmentSchema.parse({ name: 'Test', category: 'indoor' });
      expect(r.description).toBe('');
      expect(r.mood_tags).toEqual([]);
      expect(r.is_favorite).toBe(false);
    });
  });

  // ── Environment CRUD ──────────────────────────────────────────

  describe('Environment CRUD', () => {
    let envId: number;

    it('createEnvironment basariyla ortam olusturur', async () => {
      const env = await createEnvironment(testUserId, {
        name: 'TestEnvironment',
        category: 'fantasy',
        description: 'Büyülü orman',
        mood_tags: ['gizemli', 'karanlik'],
        color_palette: ['#2d1b69', '#1a1a2e'],
        lighting_notes: 'Loş mor ışık',
        reference_image_url: 'https://example.com/env.jpg',
        is_favorite: true,
      });
      expect(env.id).toBeGreaterThan(0);
      expect(env.name).toBe('TestEnvironment');
      expect(env.category).toBe('fantasy');
      expect(env.mood_tags).toContain('gizemli');
      expect(env.is_favorite).toBe(true);
      envId = env.id!;
    });

    it('getEnvironmentById olusturulan ortami getirir', async () => {
      const env = await getEnvironmentById(envId, testUserId);
      expect(env).not.toBeNull();
      expect(env!.name).toBe('TestEnvironment');
      expect(env!.category).toBe('fantasy');
    });

    it('getEnvironments kullaniciya ait ortamlari listeler', async () => {
      const list = await getEnvironments(testUserId);
      expect(list.length).toBeGreaterThanOrEqual(1);
      const found = list.find((e) => e.id === envId);
      expect(found).toBeDefined();
    });

    it('updateEnvironment ortami gunceller', async () => {
      const updated = await updateEnvironment(envId, testUserId, {
        name: 'TestEnvGuncel',
        description: 'Güncellenmiş orman',
        is_favorite: false,
      });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('TestEnvGuncel');
      expect(updated!.description).toBe('Güncellenmiş orman');
      expect(updated!.is_favorite).toBe(false);
    });

    it('deleteEnvironment ortami siler', async () => {
      const ok = await deleteEnvironment(envId, testUserId);
      expect(ok).toBe(true);
      const check = await getEnvironmentById(envId, testUserId);
      expect(check).toBeNull();
    });

    it('getEnvironmentById olmayan ID icin null doner', async () => {
      const env = await getEnvironmentById(99999, testUserId);
      expect(env).toBeNull();
    });

    it('updateEnvironment olmayan ortam icin null doner', async () => {
      const result = await updateEnvironment(99999, testUserId, { name: 'Yok' });
      expect(result).toBeNull();
    });

    it('deleteEnvironment olmayan ortam icin false doner', async () => {
      const ok = await deleteEnvironment(99999, testUserId);
      expect(ok).toBe(false);
    });
  });

  // ── Prop CRUD ─────────────────────────────────────────────────

  describe('Prop CRUD', () => {
    let envId: number;
    let propId: number;

    beforeAll(async () => {
      // Referans ortam olustur
      const env = await createEnvironment(testUserId, {
        name: 'PropTestEnv',
        category: 'urban',
        description: 'Props icin ortam',
        mood_tags: [],
        color_palette: [],
        lighting_notes: '',
        is_favorite: false,
      });
      envId = env.id!;
    });

    afterAll(async () => {
      await deleteEnvironment(envId, testUserId);
    });

    it('createProp basariyla nesne olusturur', async () => {
      const prop = await createProp(testUserId, {
        name: 'TestSword',
        category: 'weapon',
        description: 'Efsanevi kiliç',
        environment_id: envId,
        interaction_notes: 'Sağ el ile tutulur',
        reference_image_url: 'https://example.com/sword.jpg',
        is_favorite: true,
      });
      expect(prop.id).toBeGreaterThan(0);
      expect(prop.name).toBe('TestSword');
      expect(prop.category).toBe('weapon');
      expect(prop.environment_id).toBe(envId);
      expect(prop.is_favorite).toBe(true);
      propId = prop.id!;
    });

    it('getPropById olusturulan nesneyi getirir', async () => {
      const prop = await getPropById(propId, testUserId);
      expect(prop).not.toBeNull();
      expect(prop!.name).toBe('TestSword');
      expect(prop!.interaction_notes).toBe('Sağ el ile tutulur');
    });

    it('getProps kullaniciya ait nesneleri listeler', async () => {
      const list = await getProps(testUserId);
      expect(list.length).toBeGreaterThanOrEqual(1);
      const found = list.find((p) => p.id === propId);
      expect(found).toBeDefined();
    });

    it('getProps environment_id filtresi ile calisir', async () => {
      const list = await getProps(testUserId, envId);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.every((p) => p.environment_id === envId)).toBe(true);
    });

    it('updateProp nesneyi gunceller', async () => {
      const updated = await updateProp(propId, testUserId, {
        name: 'TestSwordV2',
        is_favorite: false,
        interaction_notes: 'İki el ile tutulur',
      });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('TestSwordV2');
      expect(updated!.interaction_notes).toBe('İki el ile tutulur');
      expect(updated!.is_favorite).toBe(false);
    });

    it('deleteProp nesneyi siler', async () => {
      const ok = await deleteProp(propId, testUserId);
      expect(ok).toBe(true);
      const check = await getPropById(propId, testUserId);
      expect(check).toBeNull();
    });

    it('getPropById olmayan ID icin null doner', async () => {
      const prop = await getPropById(99999, testUserId);
      expect(prop).toBeNull();
    });

    it('updateProp olmayan nesne icin null doner', async () => {
      const result = await updateProp(99999, testUserId, { name: 'Yok' });
      expect(result).toBeNull();
    });

    it('deleteProp olmayan nesne icin false doner', async () => {
      const ok = await deleteProp(99999, testUserId);
      expect(ok).toBe(false);
    });

    it('environment silindiginde props environment_id NULL olur', async () => {
      // Referans ortama bagli yeni prop olustur
      const prop = await createProp(testUserId, {
        name: 'OrphanProp',
        category: 'decoration',
        description: 'Yetim kalacak nesne',
        environment_id: envId,
        interaction_notes: '',
        is_favorite: false,
      });
      const localPropId = prop.id!;

      // Ortami sil
      await deleteEnvironment(envId, testUserId);

      // Prop hala duruyor mu? environment_id NULL olmali
      const orphan = await getPropById(localPropId, testUserId);
      expect(orphan).not.toBeNull();
      expect(orphan!.environment_id).toBeNull();

      // Temizlik
      await deleteProp(localPropId, testUserId);
    });
  });
});
