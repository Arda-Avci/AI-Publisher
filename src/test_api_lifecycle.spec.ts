import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs-extra';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';

vi.mock('./lib/redis.js', () => ({
  redisPub: { publish: vi.fn().mockResolvedValue(true), on: vi.fn() },
  redisSub: { duplicate: vi.fn().mockReturnValue({ on: vi.fn(), subscribe: vi.fn(), quit: vi.fn() }), on: vi.fn() },
  broadcastProgress: vi.fn().mockResolvedValue(true),
}));

vi.mock('./lib/rabbitmq.js', () => ({
  getRabbitChannel: vi.fn().mockReturnValue({ sendToQueue: vi.fn() }),
  VIDEO_JOBS_QUEUE: 'video_jobs',
  initRabbitMQ: vi.fn(),
  registerReconnectCallback: vi.fn(),
  sendToQueue: vi.fn(),
}));

vi.mock('./lib/redis-mutex.js', () => ({
  RedisMutex: class {
    lock = vi.fn().mockResolvedValue(undefined);
    unlock = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('./lib/b2.js', () => ({
  uploadFile: vi.fn().mockResolvedValue(true),
  downloadFile: vi.fn().mockResolvedValue('/tmp/mock_download.mp4'),
  getSignedUrl: vi.fn().mockResolvedValue('https://mock-b2-url.com/file'),
  isConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../services/creditService.js', () => ({
  CreditService: {
    getUserCredits: vi.fn().mockResolvedValue({ credits: 9999 }),
    deductCredits: vi.fn().mockResolvedValue(true),
    isAdmin: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('./lib/audit.js', () => ({
  logAudit: vi.fn(),
}));

let app: express.Express;
let testUserId: number;
let agent: request.Agent;
const TEST_USER = 'api.lifecycle@test.com';
const TEST_PASS = 'apilife123';

beforeAll(async () => {
  await fs.ensureDir(path.join(process.cwd(), 'uploads'));
  await initDatabase();

  app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: 'api-lifecycle-test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, secure: false, sameSite: 'lax' },
    }),
  );

  const { registerAuthRoutes } = await import('./routes/auth.js');
  const { registerJobRoutes } = await import('./routes/jobs.js');
  const { registerProgressRoutes } = await import('./routes/progress.js');
  const { registerPublishRoutes } = await import('./routes/publish.js');

  registerAuthRoutes(app);
  registerJobRoutes(app);
  registerProgressRoutes(app);
  registerPublishRoutes(app);

  const encUsername = encryptUsername(TEST_USER);
  await db.run('DELETE FROM users WHERE username = $1', [encUsername]);
  const hashed = await bcrypt.hash(TEST_PASS, 10);
  await db.run('INSERT INTO users (username, password) VALUES ($1, $2)', [encUsername, hashed]);
  const user = await db.get('SELECT id FROM users WHERE username = $1', [encUsername]);
  testUserId = user.id;

  agent = request.agent(app);
  const loginRes = await agent
    .post('/login')
    .send({ username: TEST_USER, password: TEST_PASS });
  expect(loginRes.status).toBe(200);
});

afterAll(async () => {
  if (testUserId) {
    await db.run('DELETE FROM video_scenes WHERE job_id IN (SELECT id FROM video_jobs WHERE user_id = $1)', [testUserId]);
    await db.run('DELETE FROM video_jobs WHERE user_id = $1', [testUserId]);
    await db.run('DELETE FROM users WHERE id = $1', [testUserId]);
  }
});

beforeEach(async () => {
  if (testUserId) {
    await db.run('DELETE FROM video_scenes WHERE job_id IN (SELECT id FROM video_jobs WHERE user_id = $1)', [testUserId]);
    await db.run('DELETE FROM video_jobs WHERE user_id = $1', [testUserId]);
  }
});

describe('[K-5] Full Job Lifecycle — CRUD via API', () => {
  it('POST /create-job creates a new job and redirects', async () => {
    try {
      const res = await agent
        .post('/create-job')
        .type('form')
        .field('master_prompt', 'API lifecycle test prompt')
        .field('production_notes', 'Test notes')
        .field('platforms[]', 'youtube')
        .field('platforms[]', 'tiktok');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/');
    } catch (err: any) {
      if (err.code !== 'ECONNRESET') throw err;
    }

    const jobs = await db.all('SELECT * FROM video_jobs WHERE user_id = $1 ORDER BY id DESC', [testUserId]);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].master_prompt).toBe('API lifecycle test prompt');
    expect(jobs[0].production_notes).toBe('Test notes');
  });

  it('GET /api/v1/jobs lists all user jobs', async () => {
    await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent, total_scenes, completed_scenes)
       VALUES ($1, $2, 'pending', 0, 3, 0)`,
      [testUserId, 'List test job 1'],
    );
    await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent, total_scenes, completed_scenes)
       VALUES ($1, $2, 'completed', 100, 3, 3)`,
      [testUserId, 'List test job 2'],
    );

    const res = await agent.get('/api/v1/jobs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.jobs)).toBe(true);
    expect(res.body.jobs.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/v1/jobs/:id returns single job details', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 5)`,
      [testUserId, 'Detail test job'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.get(`/api/v1/jobs/${jobId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.job.master_prompt).toBe('Detail test job');
    expect(res.body.job.total_scenes).toBe(5);
  });

  it('POST /save-meta/:id updates platform metadata', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status)
       VALUES ($1, $2, 'pending')`,
      [testUserId, 'Meta save test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent
      .post(`/save-meta/${jobId}`)
      .send({
        yt_title: 'YouTube Title',
        yt_desc: 'YouTube Description',
        yt_tags: 'tag1, tag2',
        tt_desc: 'TikTok Description',
        tt_tags: 'ttag1, ttag2',
        x_desc: 'X Description',
        x_tags: 'xtag1',
        meta_desc: 'Meta Description',
        meta_tags: 'mtag1',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await db.get('SELECT yt_title, yt_desc, x_desc FROM video_jobs WHERE id = $1', [jobId]);
    expect(updated.yt_title).toBe('YouTube Title');
    expect(updated.yt_desc).toBe('YouTube Description');
    expect(updated.x_desc).toBe('X Description');
  });

  it('POST /delete-job/:id removes job from database', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status)
       VALUES ($1, $2, 'pending')`,
      [testUserId, 'Delete test job'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.post(`/delete-job/${jobId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await db.get('SELECT id FROM video_jobs WHERE id = $1', [jobId]);
    expect(deleted).toBeUndefined();
  });

  it('POST /retry-job/:id resets failed job to pending', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent, completed_scenes)
       VALUES ($1, $2, 'failed', 45, 2)`,
      [testUserId, 'Retry test job'],
    );
    const jobId = Number(result.lastID);

    try {
      const res = await agent.post(`/retry-job/${jobId}`).type('form').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await db.get('SELECT status, progress_percent, completed_scenes FROM video_jobs WHERE id = $1', [jobId]);
      expect(updated.status).toBe('pending');
      expect(updated.progress_percent).toBe(0);
      expect(updated.completed_scenes).toBe(0);
    } catch (err: any) {
      if (err.code === 'ECONNRESET') {
        const updated = await db.get('SELECT status, progress_percent, completed_scenes FROM video_jobs WHERE id = $1', [jobId]);
        expect(updated.status).toBe('pending');
        expect(updated.progress_percent).toBe(0);
        expect(updated.completed_scenes).toBe(0);
        return;
      }
      throw err;
    }
  });
});

describe('[K-6] Scene API — CRUD via REST endpoints', () => {
  it('POST /api/v1/jobs/:jobId/scenes saves scenes', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 2)`,
      [testUserId, 'API Scene save test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent
      .post(`/api/v1/jobs/${jobId}/scenes`)
      .send({
        scenes: [
          { scene_number: 1, video_prompt: 'Intro scene', speech_text: 'Hello', sfx_prompt: '', camera_motion: 'static', sort_order: 1, music_volume: 0.2, speaker: 'Narrator', transition_type: 'fade' },
          { scene_number: 2, video_prompt: 'Main scene', speech_text: 'World', sfx_prompt: '', camera_motion: 'pan', sort_order: 2, music_volume: 0.3, speaker: 'Narrator', transition_type: 'fade' },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const scenes = await db.all('SELECT * FROM video_scenes WHERE job_id = $1 ORDER BY sort_order ASC', [jobId]);
    expect(scenes.length).toBe(2);
    expect(scenes[0].video_prompt).toBe('Intro scene');
    expect(scenes[1].camera_motion).toBe('pan');
  });

  it('GET /api/v1/jobs/:jobId/scenes returns scenes in order', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 3)`,
      [testUserId, 'API Scene list test'],
    );
    const jobId = Number(result.lastID);

    for (let i = 1; i <= 3; i++) {
      await db.run(
        `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $2)`,
        [jobId, i, `Scene ${i}`, `Speech ${i}`, `SFX ${i}`, 'static'],
      );
    }

    const res = await agent.get(`/api/v1/jobs/${jobId}/scenes`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.scenes.length).toBe(3);
    expect(res.body.scenes[0].video_prompt).toBe('Scene 1');
    expect(res.body.scenes[2].video_prompt).toBe('Scene 3');
  });

  it('POST /api/v1/jobs/:jobId/scenes/add creates new scene', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 0)`,
      [testUserId, 'API Scene add test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.post(`/api/v1/jobs/${jobId}/scenes/add`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.sceneNumber)).toBe(1);

    const scenes = await db.all('SELECT * FROM video_scenes WHERE job_id = $1', [jobId]);
    expect(scenes.length).toBe(1);
  });

  it('POST /api/v1/jobs/:jobId/scenes/:sceneId/delete removes scene', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 2)`,
      [testUserId, 'API Scene delete test'],
    );
    const jobId = Number(result.lastID);

    const insertResult = await db.run(
      `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $2)`,
      [jobId, 1, 'Delete scene', '', '', 'static'],
    );
    const sceneId = Number(insertResult.lastID);

    const res = await agent.post(`/api/v1/jobs/${jobId}/scenes/${sceneId}/delete`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const scenes = await db.all('SELECT * FROM video_scenes WHERE job_id = $1', [jobId]);
    expect(scenes.length).toBe(0);
  });
});

describe('[K-7] API Security — auth guards and validation', () => {
  it('GET /api/v1/jobs without auth returns 401', async () => {
    const unauth = request(app);
    const res = await unauth.get('/api/v1/jobs');
    expect(res.status).toBe(401);
  });

  it('POST /create-job without auth redirects to login', async () => {
    const unauth = request(app);
    const res = await unauth.post('/create-job').type('form').field('master_prompt', 'test');
    expect(res.status).toBe(302);
  });

  it('POST /delete-job/:id without auth redirects to login', async () => {
    const unauth = request(app);
    const res = await unauth.post('/delete-job/1');
    expect(res.status).toBe(302);
  });

  it('POST /save-meta/:id with non-string field returns 400', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status)
       VALUES ($1, $2, 'pending')`,
      [testUserId, 'Save meta validation test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.post(`/save-meta/${jobId}`).send({ yt_title: 12345 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('GET /api/v1/jobs/:id for non-existent job returns 404', async () => {
    const res = await agent.get('/api/v1/jobs/999999');
    expect(res.status).toBe(404);
  });

  it('POST /api/v1/jobs/:jobId/scenes with non-array scenes returns 400', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status)
       VALUES ($1, $2, 'pending')`,
      [testUserId, 'Validation test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent
      .post(`/api/v1/jobs/${jobId}/scenes`)
      .send({ scenes: 'not_an_array' });
    expect(res.status).toBe(400);
  });
});

describe('[K-8] Publish Route — pre-checks and validation', () => {
  it('POST /publish/:id/:platform with invalid platform returns error', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, final_filename)
       VALUES ($1, $2, 'completed', 'test_video.mp4')`,
      [testUserId, 'Publish test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.post(`/publish/${jobId}/invalid_platform`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Gecersiz platform.');
  });

  it('POST /publish/:id/:platform without auth file returns AUTH_MISSING', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, final_filename)
       VALUES ($1, $2, 'completed', $3)`,
      [testUserId, 'Publish no file test', 'nonexistent_video.mp4'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.post(`/publish/${jobId}/youtube`);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('AUTH_MISSING');
  });

  it('POST /cancel-publish/:id/:platform returns error for non-publishing status', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, final_filename, yt_status)
       VALUES ($1, $2, 'completed', 'test.mp4', 'published')`,
      [testUserId, 'Cancel publish test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.post(`/cancel-publish/${jobId}/youtube`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('aktif olarak calismiyor');
  });

  it('POST /publish-all/:id for non-completed job returns error', async () => {
    await db.run('DELETE FROM video_jobs WHERE user_id = $1', [testUserId]);
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status)
       VALUES ($1, $2, 'pending')`,
      [testUserId, 'Publish all test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.post(`/publish-all/${jobId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('henuz tamamlanmamis');
  });
});
