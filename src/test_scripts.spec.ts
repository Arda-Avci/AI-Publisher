import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';

// ── Module-level mocks (plain factory, no external refs) ──
vi.mock('./middleware/rate-limit.js', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  mediumLimiter: (_req: any, _res: any, next: any) => next(),
  heavyLimiter: (_req: any, _res: any, next: any) => next(),
  sseLimiter: (_req: any, _res: any, next: any) => next(),
}));
vi.mock('./lib/audit.js', () => ({ logAudit: () => {} }));
vi.mock('./lib/redis.js', () => ({ broadcastProgress: () => {}, clients: new Map() }));

const MOCK_SCENES = [
  { scene_type: 'opening' as const, character_name: 'Sunucu', camera_instruction: 'zoom_in', duration_seconds: 5, dialogue_context: 'Program açılışı' },
  { scene_type: 'talk' as const, character_name: 'Ahmet', camera_instruction: 'two_shot', duration_seconds: 6, dialogue_context: 'Konuk sohbeti' },
  { scene_type: 'reaction' as const, character_name: 'Ahmet', camera_instruction: 'closeup', duration_seconds: 4, dialogue_context: 'Tepki' },
  { scene_type: 'wide' as const, character_name: 'Sunucu', camera_instruction: 'pan_left', duration_seconds: 5, dialogue_context: 'Genel plan' },
  { scene_type: 'closing' as const, character_name: 'Sunucu', camera_instruction: 'zoom_out', duration_seconds: 4, dialogue_context: 'Kapanış' },
];

const MOCK_SCRIPT = {
  id: 42, show_id: 1, user_id: 1, title: 'Test Script',
  status: 'completed' as const, scene_count: 5, metadata: {},
  created_at: '2026-06-14T00:00:00.000Z', updated_at: '2026-06-14T00:00:00.000Z',
  segments: MOCK_SCENES.map((s, i) => ({
    id: i + 100, script_id: 42, scene_number: i + 1,
    scene_type: s.scene_type, character_id: null, character_name: s.character_name,
    dialogue_text: `Sahne ${i + 1} diyalogu.`, camera_instruction: s.camera_instruction,
    duration_seconds: s.duration_seconds, order_index: i + 1, metadata: {},
  })),
};

describe('Sprint 4B — ScriptEngine + Script Routes', () => {
  let adminUserId: number;
  let testShowId: number;

  beforeAll(async () => {
    await initDatabase();

    const encryptedAdmin = encryptUsername('admin_script_test');
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
    if (!existing) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [encryptedAdmin, hashedPassword]);
    }
    const user = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
    adminUserId = user.id;

    await db.run('DELETE FROM characters WHERE user_id = ?', [adminUserId]);
    await db.run(
      `INSERT INTO characters (user_id, name, description, slug, role_archetype, tts_voice_id, voice_provider, llm_provider)
       VALUES (?, 'Sunucu', 'Ana sunucu', 'sunucu', 'narrator', 'default', 'edge', 'zen'),
              (?, 'Ahmet', 'Konuk yorumcu', 'ahmet', 'supporting', 'default', 'edge', 'zen')`,
      [adminUserId, adminUserId]
    );

    await db.run('DELETE FROM video_jobs WHERE user_id = ?', [adminUserId]);
    const showRow = await db.get(
      `INSERT INTO video_jobs (user_id, master_prompt, production_notes, target_platforms, total_scenes, current_stage)
       VALUES (?, 'Test talk-show', 'Test notlari', '["youtube"]', 3, 'pending') RETURNING *`,
      [adminUserId]
    );
    testShowId = showRow.id;
  }, 30000);

  afterAll(async () => {
    if (testShowId) {
      await db.run('DELETE FROM script_segments WHERE script_id IN (SELECT id FROM scripts WHERE show_id = ?)', [testShowId]);
      await db.run('DELETE FROM scripts WHERE show_id = ?', [testShowId]);
      await db.run('DELETE FROM video_jobs WHERE id = ?', [testShowId]);
    }
    if (adminUserId) {
      await db.run('DELETE FROM characters WHERE user_id = ?', [adminUserId]);
      await db.run('DELETE FROM users WHERE id = ?', [adminUserId]);
    }
  });

  // ── AI Methods (real class + instance spyOn) ──────────────────

  describe('1. AI methods (real class + spyOn)', () => {
    it('generateOutline returns structured scenes', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const engine = new RealSE();
      vi.spyOn(engine, 'generateOutline').mockResolvedValue(MOCK_SCENES);
      const scenes = await engine.generateOutline('Test', 'Notlar', []);
      expect(scenes).toHaveLength(5);
      expect(scenes[0].scene_type).toBe('opening');
      expect(scenes[4].scene_type).toBe('closing');
    });

    it('generateDialogue returns dialogue text', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const engine = new RealSE();
      vi.spyOn(engine, 'generateDialogue').mockResolvedValue('Merhaba ve hoş geldiniz!');
      const dialogue = await engine.generateDialogue({} as any, 'opening', 'Açılış', '', 'Test');
      expect(dialogue).toBe('Merhaba ve hoş geldiniz!');
    });
  });

  // ── generateFullScript (real class + mocked AI deps) ───────

  describe('2. generateFullScript (real class + mocked AI)', () => {
    it('creates script + segments in DB', async () => {
      await db.run('DELETE FROM script_segments WHERE script_id IN (SELECT id FROM scripts WHERE show_id = ?)', [testShowId]);
      await db.run('DELETE FROM scripts WHERE show_id = ?', [testShowId]);

      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const engine = new RealSE();

      vi.spyOn(engine, 'generateOutline').mockResolvedValue(MOCK_SCENES);
      vi.spyOn(engine, 'generateDialogue')
        .mockResolvedValueOnce('Açılış')
        .mockResolvedValueOnce('Konuk')
        .mockResolvedValueOnce('Tepki')
        .mockResolvedValueOnce('Genel')
        .mockResolvedValueOnce('Kapanış');

      const result = await engine.generateFullScript(testShowId, adminUserId);
      expect(result.status).toBe('completed');
      expect(result.scene_count).toBe(5);
      expect(result.segments).toHaveLength(5);
    }, 15000);

    it('throws for non-existent show', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const engine = new RealSE();
      await expect(engine.generateFullScript(99999, adminUserId)).rejects.toThrow('not found');
    });
  });

  // ── CRUD (real class, direct DB ops) ───────────────────────

  describe('3. CRUD operations (real class, DB)', () => {
    let scriptId: number;
    let segmentId: number;

    beforeAll(async () => {
      await db.run('DELETE FROM script_segments WHERE script_id IN (SELECT id FROM scripts WHERE show_id = ?)', [testShowId]);
      await db.run('DELETE FROM scripts WHERE show_id = ?', [testShowId]);

      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const engine = new RealSE();
      vi.spyOn(engine, 'generateOutline').mockResolvedValue(MOCK_SCENES);
      vi.spyOn(engine, 'generateDialogue')
        .mockResolvedValueOnce('S1').mockResolvedValueOnce('S2')
        .mockResolvedValueOnce('S3').mockResolvedValueOnce('S4')
        .mockResolvedValueOnce('S5');

      const script = await engine.generateFullScript(testShowId, adminUserId);
      scriptId = script.id;
      segmentId = script.segments[0].id;
    }, 15000);

    it('listScripts returns scripts', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      const list = await e.listScripts(testShowId);
      expect(list.length).toBeGreaterThanOrEqual(1);
    });

    it('getScript returns script with segments', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      const s = await e.getScript(scriptId);
      expect(s).not.toBeNull();
      expect(s!.id).toBe(scriptId);
      expect(s!.segments).toHaveLength(5);
    });

    it('getScript returns null for missing', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      expect(await e.getScript(99999)).toBeNull();
    });

    it('updateScript updates title/metadata', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      const u = await e.updateScript(scriptId, { title: 'Güncellenmiş', metadata: { k: 'v' } });
      expect(u!.title).toBe('Güncellenmiş');
      expect(u!.metadata).toEqual({ k: 'v' });
    });

    it('updateScript returns null for missing', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      expect(await e.updateScript(99999, { title: 'x' })).toBeNull();
    });

    it('updateSegment updates all fields', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      const u = await e.updateSegment(segmentId, {
        dialogue_text: 'Yeni diyalog', camera_instruction: 'closeup',
        duration_seconds: 7, scene_type: 'reaction',
      });
      expect(u!.dialogue_text).toBe('Yeni diyalog');
      expect(u!.camera_instruction).toBe('closeup');
    });

    it('updateSegment returns null for missing', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      expect(await e.updateSegment(99999, { dialogue_text: 'x' })).toBeNull();
    });

    it('deleteScript deletes from DB', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      const temp = await db.get(
        `INSERT INTO scripts (show_id, user_id, title, status) VALUES (?, ?, 'temp', 'draft') RETURNING *`,
        [testShowId, adminUserId]
      );
      expect(await e.deleteScript(temp.id)).toBe(true);
      expect(await db.get('SELECT * FROM scripts WHERE id = ?', [temp.id])).toBeUndefined();
    });

    it('deleteScript returns false for missing', async () => {
      const { ScriptEngine: RealSE } = await vi.importActual<typeof import('./services/talkShow/scriptEngine.js')>('./services/talkShow/scriptEngine.js');
      const e = new RealSE();
      expect(await e.deleteScript(99999)).toBe(false);
    });
  });

  // ── REST API routes (spy on exported singleton scriptEngine) ──

  describe('4. REST API (spy on exports)', () => {
    let app: express.Application;
    let authCookie = '';
    let spies: Record<string, ReturnType<typeof vi.spyOn>> = {};

    beforeAll(async () => {
      const { scriptsRouter, scriptEngine } = await import('./routes/scripts.js');

      // Spy on the SAME singleton instance the route handlers use
      spies = {
        generateFullScript: vi.spyOn(scriptEngine, 'generateFullScript'),
        listScripts: vi.spyOn(scriptEngine, 'listScripts'),
        getScript: vi.spyOn(scriptEngine, 'getScript'),
        updateScript: vi.spyOn(scriptEngine, 'updateScript'),
        deleteScript: vi.spyOn(scriptEngine, 'deleteScript'),
        updateSegment: vi.spyOn(scriptEngine, 'updateSegment'),
        regenerateSegment: vi.spyOn(scriptEngine, 'regenerateSegment'),
      };

      app = express();
      app.use(express.json());
      app.use(session({ secret: 'test-secret-scripts', resave: false, saveUninitialized: false }));
      app.use('/api/v1/talkshow', scriptsRouter);

      app.post('/test-login', async (req: any, res) => {
        const encrypted = encryptUsername('admin_script_test');
        const u = await db.get('SELECT id FROM users WHERE username = ?', [encrypted]);
        req.session.userId = u.id;
        res.json({ success: true });
      });

      const loginRes = await request(app).post('/test-login').send();
      authCookie = loginRes.headers['set-cookie'][0].split(';')[0];
    }, 30000);

    beforeEach(() => {
      // Reset all spies: after mockReset, returns undefined (falsy → 404)
      Object.values(spies).forEach(s => s.mockReset());
    });

    afterAll(() => {
      vi.restoreAllMocks();
    });

    it('POST /scripts/generate — rejects missing show_id', async () => {
      spies.generateFullScript.mockResolvedValue(MOCK_SCRIPT);
      const res = await request(app)
        .post('/api/v1/talkshow/scripts/generate')
        .set('Cookie', authCookie)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('show_id');
    });

    it('POST /scripts/generate — returns script', async () => {
      spies.generateFullScript.mockResolvedValue(MOCK_SCRIPT);

      const res = await request(app)
        .post('/api/v1/talkshow/scripts/generate')
        .set('Cookie', authCookie)
        .send({ show_id: 1 });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.segments).toHaveLength(5);
    });

    it('GET /:showId/scripts — lists scripts', async () => {
      spies.listScripts.mockResolvedValue([MOCK_SCRIPT]);

      const res = await request(app)
        .get('/api/v1/talkshow/1/scripts')
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /scripts/:scriptId — returns script', async () => {
      spies.getScript.mockResolvedValue(MOCK_SCRIPT);

      const res = await request(app)
        .get('/api/v1/talkshow/scripts/42')
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(42);
      expect(res.body.data.segments).toHaveLength(5);
    });

    it('GET /scripts/:scriptId — 404 for missing', async () => {
      const res = await request(app)
        .get('/api/v1/talkshow/scripts/99999')
        .set('Cookie', authCookie);
      expect(res.status).toBe(404);
    });

    it('PUT /scripts/:scriptId — updates title', async () => {
      spies.updateScript.mockResolvedValue({ ...MOCK_SCRIPT, title: 'Güncellenmiş Başlık' });

      const res = await request(app)
        .put('/api/v1/talkshow/scripts/42')
        .set('Cookie', authCookie)
        .send({ title: 'Güncellenmiş Başlık' });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Güncellenmiş Başlık');
    });

    it('PUT /scripts/:scriptId — 404 for missing', async () => {
      const res = await request(app)
        .put('/api/v1/talkshow/scripts/99999')
        .set('Cookie', authCookie)
        .send({ title: 'x' });
      expect(res.status).toBe(404);
    });

    it('PUT /scripts/:scriptId/segments/:segmentId — updates segment', async () => {
      spies.updateSegment.mockResolvedValue({
        ...MOCK_SCRIPT.segments[0], script_id: 42,
        dialogue_text: 'API segment', camera_instruction: 'pan_left',
        duration_seconds: 5, scene_type: 'wide',
      });

      const res = await request(app)
        .put('/api/v1/talkshow/scripts/42/segments/100')
        .set('Cookie', authCookie)
        .send({ dialogue_text: 'API segment', camera_instruction: 'pan_left' });
      expect(res.status).toBe(200);
      expect(res.body.data.dialogue_text).toBe('API segment');
    });

    it('PUT /scripts/:scriptId/segments/:segmentId — 404 for missing', async () => {
      const res = await request(app)
        .put('/api/v1/talkshow/scripts/42/segments/99999')
        .set('Cookie', authCookie)
        .send({ dialogue_text: 'x' });
      expect(res.status).toBe(404);
    });

    it('POST /scripts/:scriptId/regenerate/:segmentId — regenerates', async () => {
      spies.regenerateSegment.mockResolvedValue({ ...MOCK_SCRIPT.segments[0], dialogue_text: 'YENI diyalog.' });

      const res = await request(app)
        .post('/api/v1/talkshow/scripts/42/regenerate/100')
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      expect(res.body.data.dialogue_text).toBe('YENI diyalog.');
    });

    it('POST /scripts/:scriptId/regenerate/:segmentId — 400 for error', async () => {
      spies.regenerateSegment.mockRejectedValue(new Error('not found'));

      const res = await request(app)
        .post('/api/v1/talkshow/scripts/42/regenerate/99999')
        .set('Cookie', authCookie);
      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated with 401', async () => {
      const res = await request(app)
        .post('/api/v1/talkshow/scripts/generate')
        .send({ show_id: 1 });
      expect(res.status).toBe(401);
    });

    it('DELETE /scripts/:scriptId — deletes', async () => {
      spies.deleteScript.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/v1/talkshow/scripts/42')
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('DELETE /scripts/:scriptId — 404 for missing', async () => {
      const res = await request(app)
        .delete('/api/v1/talkshow/scripts/99999')
        .set('Cookie', authCookie);
      expect(res.status).toBe(404);
    });
  });
});
