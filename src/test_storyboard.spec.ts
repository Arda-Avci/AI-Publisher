import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';
import { storyboardRouter } from './services/storyboardRoutes.js';
import {
  buildScenePrompt,
  generateStoryboardImage,
  generateFullStoryboard,
  getStoryboardImages,
  deleteStoryboardImages,
} from './services/storyboardGenerator.js';

describe('Storyboard Generator Service', () => {
  // ── buildScenePrompt Tests ───────────────────────────

  it('buildScenePrompt returns correct format', () => {
    const scene = {
      sceneNumber: 1,
      location: 'ancient temple',
      timeOfDay: 'sunset',
      interior: false,
      characters: ['Indiana Jones', 'Marion'],
      plot: 'Indiana finds the golden idol',
    };

    const prompt = buildScenePrompt(scene);

    expect(prompt).toContain('Exterior');
    expect(prompt).toContain('ancient temple');
    expect(prompt).toContain('sunset');
    expect(prompt).toContain('Indiana Jones');
    expect(prompt).toContain('Marion');
    expect(prompt).toContain('Indiana finds the golden idol');
    expect(prompt).toContain('Cinematic lighting');
    expect(prompt).toContain('4K');
    expect(prompt).toContain('detailed');
  });

  it('buildScenePrompt with artStyle includes style keywords', () => {
    const scene = {
      sceneNumber: 1,
      location: 'cyberpunk city',
      timeOfDay: 'night',
      interior: false,
      characters: ['Neo'],
      plot: 'Neo fights agents',
    };

    const prompt = buildScenePrompt(scene, 'anime, vibrant colors');

    expect(prompt).toContain('Exterior');
    expect(prompt).toContain('cyberpunk city');
    expect(prompt).toContain('Style: anime, vibrant colors');
  });

  it('buildScenePrompt handles interior vs exterior', () => {
    const interiorScene = {
      sceneNumber: 1,
      location: 'office',
      timeOfDay: 'morning',
      interior: true,
      characters: ['John'],
      plot: 'John works at desk',
    };

    const exteriorScene = {
      sceneNumber: 2,
      location: 'forest',
      timeOfDay: 'afternoon',
      interior: false,
      characters: ['Jane'],
      plot: 'Jane walks through forest',
    };

    const interiorPrompt = buildScenePrompt(interiorScene);
    const exteriorPrompt = buildScenePrompt(exteriorScene);

    expect(interiorPrompt).toContain('Interior');
    expect(exteriorPrompt).toContain('Exterior');
  });

  it('buildScenePrompt handles empty characters array', () => {
    const scene = {
      sceneNumber: 1,
      location: 'beach',
      timeOfDay: 'dawn',
      interior: false,
      characters: [],
      plot: 'Empty beach scene',
    };

    const prompt = buildScenePrompt(scene);
    expect(prompt).toContain('unknown character');
    expect(prompt).toContain('Empty beach scene');
  });

  // ── generateStoryboardImage Tests ────────────────────

  it('generateStoryboardImage with no endpoint configured logs warning and returns placeholder', async () => {
    // RUNPOD_API_KEY ve RUNPOD_FLUX_ENDPOINT_ID olmadan cagir
    // Placeholder (1x1 transparent PNG) donmeli
    const result = await generateStoryboardImage('test scene');

    expect(result).toBeDefined();
    expect(result.imageBuffer).toBeInstanceOf(Buffer);
    expect(result.imageBuffer.length).toBeGreaterThan(0);
    // Placeholder 1x1
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it('generateStoryboardImage returns buffer even when called with artStyle', async () => {
    const result = await generateStoryboardImage('test scene', 'watercolor');

    expect(result).toBeDefined();
    expect(result.imageBuffer).toBeInstanceOf(Buffer);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  // ── generateFullStoryboard Tests ─────────────────────

  it('generateFullStoryboard returns partial result when no API configured', async () => {
    const result = await generateFullStoryboard({
      scriptId: 9999,
      userId: 9999,
      scenes: [
        {
          sceneNumber: 1,
          location: 'beach',
          timeOfDay: 'sunset',
          interior: false,
          characters: ['A'],
          plot: 'test',
        },
        {
          sceneNumber: 2,
          location: 'mountain',
          timeOfDay: 'dawn',
          interior: false,
          characters: ['B'],
          plot: 'test2',
        },
      ],
    });

    // B2 olmadigi icin tum sceneler fail olmali -> 'failed'
    expect(result.totalScenes).toBe(2);
    expect(result.generatedScenes).toBe(0);
    expect(result.images).toHaveLength(0);
    expect(result.error).toBeDefined();
  });

  it('generateFullStoryboard returns correct structure for empty scenes', async () => {
    const result = await generateFullStoryboard({
      scriptId: 1,
      userId: 1,
      scenes: [],
    });

    expect(result.status).toBe('completed');
    expect(result.totalScenes).toBe(0);
    expect(result.generatedScenes).toBe(0);
    expect(result.images).toHaveLength(0);
  });

  // ── Edge Cases ───────────────────────────────────────

  it('buildScenePrompt handles single character', () => {
    const scene = {
      sceneNumber: 5,
      location: 'cave',
      timeOfDay: 'midnight',
      interior: true,
      characters: ['Hero'],
      plot: 'Hero enters the dark cave',
    };

    const prompt = buildScenePrompt(scene);
    expect(prompt).toContain('Hero');
    expect(prompt).toContain('dark cave');
    expect(prompt).toContain('Interior');
  });

  it('buildScenePrompt sceneNumber is preserved in returned SceneInput', () => {
    const scene = {
      sceneNumber: 42,
      location: 'castle',
      timeOfDay: 'noon',
      interior: true,
      characters: ['Knight'],
      plot: 'Knight guards the gate',
    };

    // sceneNumber prompt'a eklenmemeli (FLUX promptunda sahne numarasi gereksiz)
    const prompt = buildScenePrompt(scene);
    expect(prompt).not.toContain('Scene 42');
    expect(prompt).not.toContain('sceneNumber');
  });

  it('artStyle appended correctly without clobber', () => {
    const scene = {
      sceneNumber: 1,
      location: 'city',
      timeOfDay: 'evening',
      interior: false,
      characters: [],
      plot: 'rainy cityscape',
    };

    const withStyle = buildScenePrompt(scene, 'cyberpunk, neon glow');
    expect(withStyle).toContain('rainy cityscape');
    expect(withStyle).toContain('cyberpunk, neon glow');
    // "Style:" sadece bir kez gecmeli
    const matches = withStyle.match(/Style:/g);
    expect(matches).toHaveLength(1);
  });

  // ── DB Operations (storyboard_images table) ──────────

  it('storyboard_images table exists after initDatabase', async () => {
    // initDatabase zaten beforeAll'da calismis olabilir
    // Tablonun var oldugunu kontrol et
    const tableCheck = await db.get(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'storyboard_images'
      ) as exists`,
    );
    expect(tableCheck).toBeDefined();
    expect(tableCheck.exists).toBe(true);
  });

  it('getStoryboardImages returns empty array for non-existent script', async () => {
    const images = await getStoryboardImages(-1);
    expect(images).toBeInstanceOf(Array);
    expect(images).toHaveLength(0);
  });

  it('deleteStoryboardImages returns false for non-existent script', async () => {
    const deleted = await deleteStoryboardImages(-1);
    expect(deleted).toBe(false);
  });

  it('insert and retrieve storyboard image', async () => {
    // Test script olustur
    const testUser = encryptUsername('storyboard_test_user');
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [testUser]);
    let userId: number;
    if (!existing) {
      const hp = await bcrypt.hash('test123', 10);
      const r = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [testUser, hp]);
      userId = r.lastID!;
    } else {
      userId = existing.id;
    }

    // scripts tablosu show_id -> video_jobs(id) FK'sina bagli, once bir video_jobs olustur
    const jobRes = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, total_scenes) VALUES (?, ?, ?)`,
      [userId, 'test job for storyboard', 1],
    );
    const showId = jobRes.lastID!;

    const scriptRes = await db.run(
      'INSERT INTO scripts (show_id, user_id, title, scene_count) VALUES (?, ?, ?, ?)',
      [showId, userId, 'Test Storyboard Script', 1],
    );
    const scriptId = scriptRes.lastID!;

    // Insert storyboard image
    await db.run(
      `INSERT INTO storyboard_images (script_id, user_id, scene_number, image_url, width, height, prompt_used)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [scriptId, userId, 1, 'https://example.com/test.png', 2048, 2048, 'test prompt'],
    );

    // Retrieve
    const images = await getStoryboardImages(scriptId);
    expect(images).toHaveLength(1);
    expect(images[0]!.sceneNumber).toBe(1);
    expect(images[0]!.imageUrl).toBe('https://example.com/test.png');
    expect(images[0]!.width).toBe(2048);
    expect(images[0]!.height).toBe(2048);

    // Cleanup
    await deleteStoryboardImages(scriptId);
    await db.run('DELETE FROM scripts WHERE id = ?', [scriptId]);
    await db.run('DELETE FROM video_jobs WHERE id = ?', [showId]);
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
  });
});

describe('Storyboard API Routes', () => {
  let app: express.Application;
  let authCookie: string = '';
  let testScriptId: number;
  let testUserId: number;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      }),
    );

    app.use('/api/v1', storyboardRouter);

    await initDatabase();

    // Test user olustur
    const testUser = encryptUsername('storyboard_api_test');
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [testUser]);
    if (!existing) {
      const hp = await bcrypt.hash('test123', 10);
      const r = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [testUser, hp]);
      testUserId = r.lastID!;
    } else {
      testUserId = existing.id;
    }

    // scripts tablosu FK: show_id -> video_jobs(id)
    const jobRes = await db.run(
      'INSERT INTO video_jobs (user_id, master_prompt, total_scenes) VALUES (?, ?, ?)',
      [testUserId, 'API test show', 1],
    );
    const showId = jobRes.lastID!;

    const scriptRes = await db.run(
      'INSERT INTO scripts (show_id, user_id, title, scene_count) VALUES (?, ?, ?, ?)',
      [showId, testUserId, 'API Test Script', 1],
    );
    testScriptId = scriptRes.lastID!;

    // Fake login
    app.post('/test-login', (req, res) => {
      (req.session as any).userId = testUserId;
      res.json({ success: true });
    });

    const loginRes = await request(app).post('/test-login').send();
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    if (cookies && cookies[0]) {
      authCookie = cookies[0].split(';')[0] || '';
    }
  });

  afterAll(async () => {
    await db.run('DELETE FROM storyboard_images WHERE script_id = ?', [testScriptId]);
    const s = await db.get('SELECT show_id FROM scripts WHERE id = ?', [testScriptId]);
    await db.run('DELETE FROM scripts WHERE id = ?', [testScriptId]);
    if (s?.show_id) {
      await db.run('DELETE FROM video_jobs WHERE id = ?', [s.show_id]);
    }
    const testUser = encryptUsername('storyboard_api_test');
    await db.run('DELETE FROM users WHERE username = ?', [testUser]);
  });

  it('POST /storyboard/generate returns 400 when scriptId missing', async () => {
    const res = await request(app)
      .post('/api/v1/storyboard/generate')
      .set('Cookie', authCookie)
      .send({ scenes: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /storyboard/generate returns 400 when scenes empty', async () => {
    const res = await request(app)
      .post('/api/v1/storyboard/generate')
      .set('Cookie', authCookie)
      .send({ scriptId: testScriptId, scenes: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /storyboard/generate runs and returns result (partial/no API)', async () => {
    const res = await request(app)
      .post('/api/v1/storyboard/generate')
      .set('Cookie', authCookie)
      .send({
        scriptId: testScriptId,
        scenes: [
          {
            sceneNumber: 1,
            location: 'beach',
            timeOfDay: 'sunset',
            interior: false,
            characters: ['Surfer'],
            plot: 'Surfer rides wave',
          },
        ],
      });

    // API calisir, ancak RunPod olmadigi icin fail olur
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.scriptId).toBe(testScriptId);
  });

  it('GET /storyboard/:scriptId returns 404 for non-existent script', async () => {
    const res = await request(app)
      .get('/api/v1/storyboard/99999')
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
  });

  it('GET /storyboard/:scriptId returns empty images list', async () => {
    const jobRes2 = await db.run(
      'INSERT INTO video_jobs (user_id, master_prompt, total_scenes) VALUES (?, ?, ?)',
      [testUserId, 'empty storyboard test', 0],
    );
    const showId2 = jobRes2.lastID!;
    const sr = await db.run(
      'INSERT INTO scripts (show_id, user_id, title, scene_count) VALUES (?, ?, ?, ?)',
      [showId2, testUserId, 'Empty Storyboard Script', 0],
    );
    const sid = sr.lastID!;

    const res = await request(app)
      .get(`/api/v1/storyboard/${sid}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.images).toBeInstanceOf(Array);
    expect(res.body.data.images).toHaveLength(0);

    await db.run('DELETE FROM scripts WHERE id = ?', [sid]);
    await db.run('DELETE FROM video_jobs WHERE id = ?', [showId2]);
  });

  it('DELETE /storyboard/:scriptId returns 404 for non-existent script', async () => {
    const res = await request(app)
      .delete('/api/v1/storyboard/99999')
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
  });

  it('DELETE /storyboard/:scriptId returns success for valid script', async () => {
    const res = await request(app)
      .delete(`/api/v1/storyboard/${testScriptId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
