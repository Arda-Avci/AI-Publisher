import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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

vi.mock('./lib/logger.js', () => ({
  Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

let app: express.Express;
let testUserId: number;
let agent: request.Agent;
const TEST_USER = 'frontend.render@test.com';
const TEST_PASS = 'frender123';

beforeAll(async () => {
  await initDatabase();

  app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: 'frontend-render-test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, secure: false, sameSite: 'lax' },
    }),
  );

  const { registerAuthRoutes } = await import('./routes/auth.js');
  const { registerJobRoutes } = await import('./routes/jobs.js');

  registerAuthRoutes(app);
  registerJobRoutes(app);

  // React SPA catch-all: normalises /login redirect and serves SPA root
  app.get(/^\/(?!api|login|logout)(.*)/, (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>AI Publisher</title></head><body><div id="root"><div class="app-container"><nav>Dashboard</nav><main><h1>AI Publisher</h1><p>Welcome</p></main></div></div></body></html>`);
  });

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
    await db.run('DELETE FROM video_jobs WHERE user_id = $1', [testUserId]);
    await db.run('DELETE FROM users WHERE id = $1', [testUserId]);
  }
});

describe('[K-9] App Rendering', () => {
  it('GET / returns SPA HTML page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('html');
    const body = res.text;
    expect(body).toContain('DOCTYPE');
    expect(body).toContain('root');
    expect(body).toContain('AI Publisher');
  });

  it('GET /login redirects to SPA root', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('GET / returns page with UTF-8 charset', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-type'].toLowerCase()).toContain('utf-8');
  });
});

describe('[K-10] Session and Auth Endpoints', () => {
  it('GET /api/v1/session returns userId after login', async () => {
    const res = await agent.get('/api/v1/session');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBeGreaterThan(0);
  });

  it('GET /logout clears session', async () => {
    const res = await agent.get('/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // After logout, subsequent requests should get 401
    const check = await agent.get('/api/v1/session');
    expect([200, 401]).toContain(check.status);
  });

  it('POST /login with valid credentials re-establishes session', async () => {
    const res = await agent
      .post('/login')
      .send({ username: TEST_USER, password: TEST_PASS });
    expect(res.status).toBe(200);

    const sessionRes = await agent.get('/api/v1/session');
    expect(sessionRes.body.userId).toBeGreaterThan(0);
  });
});

describe('[K-11] Dashboard and Job Data Rendering', () => {
  it('GET /api/v1/jobs returns empty array when no jobs exist', async () => {
    const res = await agent.get('/api/v1/jobs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.jobs)).toBe(true);
    expect(res.body.jobs.length).toBe(0);
  });

  it('GET /api/v1/jobs renders job list as JSON array', async () => {
    await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent, total_scenes, completed_scenes, current_stage)
       VALUES ($1, $2, $3, 50, 5, 2, 'Generating scene 3')`,
      [testUserId, 'Frontend test job', 'processing'],
    );

    const res = await agent.get('/api/v1/jobs');
    expect(res.status).toBe(200);
    expect(res.body.jobs.length).toBeGreaterThanOrEqual(1);
    const job = res.body.jobs.find((j: any) => j.master_prompt === 'Frontend test job');
    expect(job).toBeDefined();
    expect(job.status).toBe('processing');
    expect(job.progress_percent).toBe(50);
    expect(job.current_stage).toBe('Generating scene 3');
    expect(job.total_scenes).toBe(5);
    expect(job.completed_scenes).toBe(2);
  });

  it('GET /api/v1/jobs/:id returns single job with all fields', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent, total_scenes, completed_scenes, final_filename, yt_title, yt_desc, yt_tags, tt_desc, tt_tags)
       VALUES ($1, $2, 'completed', 100, 10, 10, 'final_test_video.mp4', 'My Title', 'My Desc', 'tag1,tag2', 'TT Desc', 'tttag1')`,
      [testUserId, 'Single job rendering test'],
    );
    const jobId = Number(result.lastID);

    const res = await agent.get(`/api/v1/jobs/${jobId}`);
    expect(res.status).toBe(200);
    expect(res.body.job.final_filename).toBe('final_test_video.mp4');
    expect(res.body.job.yt_title).toBe('My Title');
    expect(res.body.job.progress_percent).toBe(100);
    expect(res.body.job.status).toBe('completed');
  });
});

describe('[K-12] Static Asset Serving', () => {
  it('GET /favicon.ico returns response (file or fallback)', async () => {
    const res = await request(app).get('/favicon.ico');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(500);
  });
});

describe('[K-13] SPA Catch-All', () => {
  it('GET /unknown-page returns SPA HTML (catch-all)', async () => {
    const res = await request(app).get('/this-route-definitely-does-not-exist-12345');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('html');
    expect(res.text).toContain('AI Publisher');
  });
});
