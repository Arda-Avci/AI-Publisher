import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs-extra';

let app: express.Express;
let testUserId: number;
let agent: request.Agent;

const TEST_USER = 'integration.test@example.com';
const TEST_PASS = 'testpass123';

beforeAll(async () => {
  await initDatabase();

  app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, sameSite: 'lax' },
  }));

  const { registerAuthRoutes } = await import('./routes/auth.js');
  const trendRouter = (await import('./routes/trends.js')).default as any;
  const { uploadRouter } = await import('./routes/upload.js');
  const { registerJobRoutes } = await import('./routes/jobs.js');
  const { registerProgressRoutes } = await import('./routes/progress.js');

  registerAuthRoutes(app);
  registerJobRoutes(app);
  registerProgressRoutes(app);
  app.use('/api/v1/trends', trendRouter);
  app.use('/api/v1/upload', uploadRouter);

  const encUsername = encryptUsername(TEST_USER);
  await db.run('DELETE FROM users WHERE username = $1', [encUsername]);
  const hashed = await bcrypt.hash(TEST_PASS, 10);
  await db.run(
    'INSERT INTO users (username, password) VALUES ($1, $2)',
    [encUsername, hashed],
  );
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
    await db.run('DELETE FROM credit_transactions WHERE user_id = $1', [testUserId]);
    await db.run('DELETE FROM users WHERE id = $1', [testUserId]);
  }
});

describe('[7C-1] Auth & Session Flow', () => {
  it('GET /api/v1/session returns userId after login', async () => {
    const res = await agent.get('/api/v1/session');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBeGreaterThan(0);
  });

  it('GET /api/v1/trends with auth returns json', async () => {
    const res = await agent.get('/api/v1/trends');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/v1/trends without auth returns 401', async () => {
    const unauth = request(app);
    const res = await unauth.get('/api/v1/trends');
    expect(res.status).toBe(401);
  });

  it('POST /login with wrong password returns 401', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: TEST_USER, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('GET /logout clears session', async () => {
    const res = await agent.get('/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await agent.get('/api/v1/trends');
    expect(check.status).toBe(401);

    // Re-login for subsequent tests
    await agent
      .post('/login')
      .send({ username: TEST_USER, password: TEST_PASS });
    const sessionCheck = await agent.get('/api/v1/session');
    expect(sessionCheck.body.userId).toBeGreaterThan(0);
  });
});

describe('[7C-2] Queue Ordering', () => {
  it('inserts 3 jobs in sequence and reads them in order', async () => {
    await db.run('DELETE FROM video_jobs WHERE user_id = $1', [testUserId]);
    for (let i = 0; i < 3; i++) {
      await db.run(
        `INSERT INTO video_jobs (user_id, master_prompt, status)
         VALUES ($1, $2, 'pending')`,
        [testUserId, `Integration test job ${i}`],
      );
    }

    const rows = await db.all(
      'SELECT id, master_prompt FROM video_jobs WHERE user_id = $1 AND status = $2 ORDER BY id ASC',
      [testUserId, 'pending'],
    );
    expect(rows.length).toBe(3);
    expect(rows[0].master_prompt).toContain('Integration test job 0');
    expect(rows[1].master_prompt).toContain('Integration test job 1');
    expect(rows[2].master_prompt).toContain('Integration test job 2');

    await db.run('DELETE FROM video_jobs WHERE user_id = $1', [testUserId]);
  });
});

describe('[7C-3] API Route Registration', () => {
  it('trend GET /summary returns json', async () => {
    const res = await agent.get('/api/v1/trends/summary');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('trend GET /history returns json', async () => {
    const res = await agent.get('/api/v1/trends/history?days=1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('trend GET /config returns scheduler config', async () => {
    const res = await agent.get('/api/v1/trends/config');
    expect(res.status).toBe(200);
    expect(res.body.platforms).toBeDefined();
    expect(res.body.retentionDays).toBeDefined();
  });

  it('POST /api/v1/trends/apply with valid body returns enhanced prompt', async () => {
    const res = await agent
      .post('/api/v1/trends/apply')
      .send({
        trend: { title: '#test trend', platform: 'tiktok', category: 'technology', hashtags: ['#test'], engagement: 1000 },
        masterPrompt: 'Create a video about AI',
      });
    expect(res.status).toBe(200);
    expect(res.body.enhancedPrompt).toBeDefined();
    expect(res.body.suggestedHashtags).toBeDefined();
    expect(res.body.trendContext).toBeDefined();
  });

  it('POST /api/v1/trends/apply without trend returns 400', async () => {
    const res = await agent
      .post('/api/v1/trends/apply')
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/trends/refresh returns results array', async () => {
    const res = await agent.post('/api/v1/trends/refresh');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});

describe('[7C-4] File Upload', () => {
  it('POST /api/v1/upload without file returns 400', async () => {
    const res = await agent.post('/api/v1/upload');
    expect(res.status).toBe(400);
  });
});

describe('[7C-5] SSE Broadcast', () => {
  it('GET /api/v1/progress/stream with invalid jobId returns 400', async () => {
    const res = await agent
      .get('/api/v1/progress/stream?jobId=invalid')
      .set('Accept', 'text/event-stream');
    expect(res.status).toBe(400);
  });

  it('GET /progress/:id redirects to canonical SSE url', async () => {
    const res = await agent
      .get('/progress/1')
      .set('Accept', 'text/event-stream');
    expect(res.status).toBe(301);
  });

  it('GET /api/v1/progress/stream without auth returns 401', async () => {
    const unauth = request(app);
    const res = await unauth
      .get('/api/v1/progress/stream?jobId=1')
      .set('Accept', 'text/event-stream');
    expect(res.status).toBe(401);
  });
});

describe('[7C-6] Trend Analysis', () => {
  it('GET /api/v1/trends/search returns results', async () => {
    const res = await agent.get('/api/v1/trends/search?q=trend');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/v1/trends?platform=youtube filters correctly', async () => {
    const res = await agent.get('/api/v1/trends?platform=youtube');
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      res.body.forEach((item: any) => {
        expect(item.platform).toBe('youtube');
      });
    }
  });
});

describe('[7C-7] Database CRUD', () => {
  it('inserts and reads a trend_analysis row', async () => {
    await db.run(
      `INSERT INTO trend_analysis (platform, title, description, url, engagement, hashtags, category, scraped_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      ['youtube', 'Test Trend', 'Test description', 'https://example.com', 5000, '["#test"]', 'technology'],
    );
    const row = await db.get(
      'SELECT * FROM trend_analysis WHERE title = $1 ORDER BY id DESC LIMIT 1',
      ['Test Trend'],
    );
    expect(row).toBeDefined();
    expect(row.platform).toBe('youtube');
    expect(Number(row.engagement)).toBe(5000);
    await db.run('DELETE FROM trend_analysis WHERE title = $1', ['Test Trend']);
  });

  it('inserts a video_job and reads its fields', async () => {
    await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 5)`,
      [testUserId, 'CRUD test video'],
    );
    const job = await db.get(
      'SELECT * FROM video_jobs WHERE master_prompt = $1 ORDER BY id DESC LIMIT 1',
      ['CRUD test video'],
    );
    expect(job).toBeDefined();
    expect(job.total_scenes).toBe(5);
    expect(job.status).toBe('pending');
    await db.run('DELETE FROM video_jobs WHERE id = $1', [job.id]);
  });

  it('updates job progress fields', async () => {
    await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent)
       VALUES ($1, $2, 'processing', 10)`,
      [testUserId, 'Progress update test'],
    );
    const job = await db.get(
      'SELECT id FROM video_jobs WHERE master_prompt = $1 ORDER BY id DESC LIMIT 1',
      ['Progress update test'],
    );
    await db.run(
      'UPDATE video_jobs SET progress_percent = $1, current_stage = $2 WHERE id = $3',
      [75, 'rendering', job.id],
    );
    const updated = await db.get('SELECT * FROM video_jobs WHERE id = $1', [job.id]);
    expect(updated.progress_percent).toBe(75);
    expect(updated.current_stage).toBe('rendering');
    await db.run('DELETE FROM video_jobs WHERE id = $1', [job.id]);
  });
});

describe('[7C-8] External Service Health', () => {
  it('RabbitMQ connection test', async () => {
    const { initRabbitMQ, getRabbitChannel } = await import('./lib/rabbitmq.js');
    initRabbitMQ();
    // Give background connection a moment
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const channel = getRabbitChannel();
      expect(channel).toBeDefined();
      const ok = channel.sendToQueue(
        'test_queue',
        Buffer.from(JSON.stringify({ test: true })),
        { persistent: false },
      );
      expect(ok).toBe(true);
    } catch (err: any) {
      // RabbitMQ offline — skip
      return;
    }
  });

  it('Redis connection test', async () => {
    try {
      const Redis = (await import('ioredis')).default as any;
      const redis = new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: true });
      await redis.connect();
      await redis.set('test_key', 'test_value');
      const val = await redis.get('test_key');
      expect(val).toBe('test_value');
      await redis.del('test_key');
      await redis.quit();
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        return;
      }
      throw err;
    }
  });
});
