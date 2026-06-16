import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { redisPub, redisSub } from './lib/redis.js';
import { sendToQueue, getRabbitChannel, VIDEO_JOBS_QUEUE } from './lib/rabbitmq.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';
import http from 'http';
import { vi } from 'vitest';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(async (url) => {
      if (url.includes('/health')) {
        return { data: { success: true, status: 'healthy', gpu_model: 'Tesla T4' } };
      }
      return { data: {} };
    }),
    post: vi.fn(async () => ({ data: {} })),
  }
}));

// ── Minimal app for integration tests ─────────────────────────────────────────

async function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(session({ secret: 'test-integration-secret', resave: false, saveUninitialized: false }));

  // I18n + theme middleware stubs
  app.use((req: any, _res, next) => {
    req.lang = req.session?.lang || 'tr';
    req.theme = req.session?.theme || 'default';
    req.t = { invalidLogin: 'Geçersiz giriş' };
    next();
  });

  const { registerAuthRoutes } = await import('./routes/auth.js');
  const { registerJobRoutes } = await import('./routes/jobs.js');
  const { registerProgressRoutes } = await import('./routes/progress.js');
  const { registerColabRoutes } = await import('./routes/colab.js');

  registerAuthRoutes(app);
  registerJobRoutes(app);
  registerProgressRoutes(app);
  registerColabRoutes(app);

  return app;
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

let app: express.Application;
let authCookie = '';
let adminUserId: number;

beforeAll(async () => {
  await initDatabase();

  const encryptedAdmin = encryptUsername('admin');
  const hashedPassword = await bcrypt.hash('admin1234!!', 10);
  const existing = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
  if (!existing) {
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [encryptedAdmin, hashedPassword]);
  } else {
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, existing.id]);
  }

  const user: any = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
  adminUserId = user.id;

  app = await createTestApp();

  // Establish authenticated session
  const loginRes = await request(app).post('/login').send({ username: 'admin', password: 'admin1234!!' });
  console.log('LOGIN RESPONSE STATUS:', loginRes.status);
  console.log('LOGIN RESPONSE BODY:', loginRes.body);
  if (loginRes.status === 200) {
    const cookies = loginRes.headers['set-cookie'];
    if (cookies?.[0]) authCookie = cookies[0].split(';')[0];
  } else {
    console.log('LOGIN FAILED TEXT:', loginRes.text);
  }
});

afterAll(async () => {
  // Clean up test jobs
  await db.run(`DELETE FROM video_jobs WHERE master_prompt LIKE 'Integration test%'`);
});

// ── 1. DB Job CRUD ─────────────────────────────────────────────────────────────

describe('1. DB Job CRUD', () => {
  let jobId: number;

  it('creates a job and returns the id', async () => {
    const result: any = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status) VALUES (?, ?, ?)`,
      [adminUserId, 'Integration test prompt', 'pending']
    );
    jobId = Number(result.lastID);
    expect(jobId).toBeGreaterThan(0);
  });

  it('selects the created job by id', async () => {
    const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
    expect(job).not.toBeNull();
    expect(job.master_prompt).toBe('Integration test prompt');
    expect(job.status).toBe('pending');
  });

  it('updates job status and stage', async () => {
    await db.run(
      'UPDATE video_jobs SET status = ?, current_stage = ?, progress_percent = ? WHERE id = ?',
      ['processing', 'Aşama 1', 25, jobId]
    );
    const job: any = await db.get('SELECT status, current_stage, progress_percent FROM video_jobs WHERE id = ?', [jobId]);
    expect(job.status).toBe('processing');
    expect(job.current_stage).toBe('Aşama 1');
    expect(job.progress_percent).toBe(25);
  });

  it('deletes the job', async () => {
    await db.run('DELETE FROM video_jobs WHERE id = ?', [jobId]);
    const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
    expect(job).toBeUndefined();
  });
});

// ── 2. Redis broadcast ─────────────────────────────────────────────────────────

describe('2. Redis broadcast', () => {
  it('publishes and receives a message on a channel', async () => {
    const channel = `test_channel_${Date.now()}`;
    const testPayload = JSON.stringify({ jobId: 999, stage: 'test-stage', percent: 50 });

    const received: string[] = [];
    const sub = redisSub.duplicate();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        sub.quit();
        reject(new Error('Redis subscribe timeout'));
      }, 5000);

      (sub as any).subscribe(channel, (err: Error | null, _result: string) => {
        if (err) {
          clearTimeout(timeout);
          sub.quit();
          reject(err);
          return;
        }
        sub.on('message', (ch, msg) => {
          if (ch === channel) {
            received.push(msg);
            clearTimeout(timeout);
            sub.unsubscribe(channel).catch(() => {});
            sub.quit();
            resolve();
          }
        });

        // Publish after subscribe is confirmed
        redisPub.publish(channel, testPayload);
      });
    });

    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0])).toEqual({ jobId: 999, stage: 'test-stage', percent: 50 });
  });
});

// ── 3. SSE endpoint ────────────────────────────────────────────────────────────

describe('3. SSE endpoint', () => {
  it('GET /progress/:jobId returns text/event-stream with auth', async () => {
    // Create a job first
    const result: any = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, current_stage) VALUES (?, ?, ?, ?)`,
      [adminUserId, 'Integration test SSE', 'pending', 'Beklemede']
    );
    const jobId = Number(result.lastID);

    const server = app.listen(0);
    const port = (server.address() as any).port;

    await new Promise<void>((resolve, reject) => {
      const httpReq = http.get(`http://127.0.0.1:${port}/progress/${jobId}`, {
        headers: { 'Cookie': authCookie }
      }, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        res.destroy();
        httpReq.destroy();
        server.close();
        resolve();
      });
      httpReq.on('error', (err) => {
        server.close();
        reject(err);
      });
    });

    await db.run('DELETE FROM video_jobs WHERE id = ?', [jobId]);
  });

  it('GET /progress/:jobId without auth returns 401', async () => {
    // Create a job
    const result: any = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status) VALUES (?, ?, ?)`,
      [adminUserId, 'Integration test SSE no-auth', 'pending']
    );
    const jobId = Number(result.lastID);

    const res = await request(app).get(`/progress/${jobId}`);
    expect(res.status).toBe(401);

    await db.run('DELETE FROM video_jobs WHERE id = ?', [jobId]);
  });
});

// ── 4. API auth ────────────────────────────────────────────────────────────────

describe('4. API auth', () => {
  // /api/v1/jobs/:jobId/scenes exists and requires auth
  it('GET /api/v1/jobs/:jobId/scenes without session returns 401', async () => {
    // Use an arbitrary valid job id — requireAuth should block first
    const res = await request(app).get('/api/v1/jobs/99999/scenes');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/jobs/:jobId/scenes with valid session does not 401 on auth', async () => {
    // Create a real job so the ownership check passes
    const result: any = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status) VALUES (?, ?, ?)`,
      [adminUserId, 'Integration test auth', 'pending']
    );
    const jobId = Number(result.lastID);

    const res = await request(app)
      .get(`/api/v1/jobs/${jobId}/scenes`)
      .set('Cookie', authCookie);

    // Returns 200 (empty scenes array) — not 401
    expect(res.status).toBe(200);
    const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    expect(body.success).toBe(true);

    await db.run('DELETE FROM video_jobs WHERE id = ?', [jobId]);
  });
});

// ── 5. Colab health ────────────────────────────────────────────────────────────

describe('5. Colab health', () => {
  const COLAB_URL = process.env.COLAB_URL;

  if (!COLAB_URL) {
    it.skip('COLAB_URL not set — skipping Colab health check', () => {});
  } else {
    it('GET /health returns 200 when Colab is available', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  }
});

// ── 6. RabbitMQ publish ────────────────────────────────────────────────────────

describe('6. RabbitMQ publish', () => {
  it('sendToQueue delivers message to video_jobs_queue', async () => {
    let channel: any;
    try {
      channel = getRabbitChannel();
    } catch {
      // Channel not available — skip
      return;
    }

    const testJobId = Date.now() % 100000;
    const payload = { jobId: testJobId };

    const received: Buffer[] = [];
    const consumeOk = await new Promise<boolean>((resolve) => {
      try {
        channel.consume(
          VIDEO_JOBS_QUEUE,
          (msg: any) => {
            if (msg) {
              received.push(msg.content);
              channel.ack(msg);
              resolve(true);
            }
          },
          { noAck: false }
        );
      } catch {
        resolve(false);
      }
    });

    if (!consumeOk) return;

    await sendToQueue(VIDEO_JOBS_QUEUE, payload);

    const got = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 5000);
      const interval = setInterval(() => {
        if (received.length > 0) {
          clearInterval(interval);
          clearTimeout(timer);
          resolve(true);
        }
      }, 100);
    });

    expect(got).toBe(true);
    if (received.length > 0) {
      expect(JSON.parse(received[0].toString()).jobId).toBe(testJobId);
    }
  });
});