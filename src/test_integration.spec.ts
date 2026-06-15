import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import http from 'http';
import { initDatabase, db } from '../src/db.js';
import { registerAuthRoutes } from '../src/routes/auth.js';
import { registerColabRoutes } from '../src/routes/colab.js';
import { registerSettingsRoutes } from '../src/routes/settings.js';
import { registerJobRoutes } from '../src/routes/jobs.js';
import { registerOpportunityRoutes } from '../src/routes/opportunity.js';
import { colab } from '../src/lib/colab-manager.js';
import { encryptUsername } from '../src/lib/crypto.js';
import bcrypt from 'bcrypt';

// Mock axios to return success responses
vi.mock('axios', () => {
  return {
    default: {
      get: async (url: string) => {
        if (url.endsWith('/health')) {
          return { data: { memory: { gpu_total_gb: 15 } } };
        }
        if (url.endsWith('/verify-libs')) {
          return { data: { success: true, report: { torch: { status: 'ok' } } } };
        }
        if (url.includes('/status/')) {
          return { data: { status: 'success', has_subtitle: true } };
        }
        return { data: {} };
      },
      post: async (url: string) => {
        if (url.endsWith('/generate-media')) {
          return { data: { status: 'accepted', task_id: 'mock-task-id' } };
        }
        return { data: {} };
      }
    }
  };
});

// Mock rate limiters to avoid being blocked in tests
vi.mock('../src/middleware/rate-limit.js', () => ({
  authLimiter: (req: any, res: any, next: any) => next(),
  mediumLimiter: (req: any, res: any, next: any) => next(),
  heavyLimiter: (req: any, res: any, next: any) => next(),
  sseLimiter: (req: any, res: any, next: any) => next()
}));

// Mock queue.ts to prevent background worker from starting during testing
vi.mock('../src/queue.ts', () => ({
  checkQueue: vi.fn(),
  broadcast: vi.fn(),
  clients: new Map()
}));

// Mock rabbitmq.ts to avoid connecting to RabbitMQ in tests
vi.mock('../src/lib/rabbitmq.ts', () => ({
  initRabbitMQ: vi.fn(),
  getRabbitChannel: () => ({
    sendToQueue: vi.fn(),
    prefetch: vi.fn(),
    consume: vi.fn(),
    ack: vi.fn()
  }),
  sendToQueue: vi.fn().mockResolvedValue(true),
  VIDEO_JOBS_QUEUE: 'video_jobs_queue',
  PUBLISH_JOBS_QUEUE: 'publish_jobs_queue'
}));

// Mock yt-search to keep search offline and fast
vi.mock('yt-search', () => ({
  default: async (query: string) => ({
    videos: [
      {
        videoId: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        thumbnail: 'https://example.com/thumb.jpg',
        author: { url: 'https://example.com/channel', name: 'RickAstleyVEVO' },
        views: 1000000000,
        description: 'Legendary track',
        ago: '13 years ago'
      }
    ]
  })
}));

// Mock AI SDK generateObject
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    generateObject: async () => ({
      object: {
        scenes: [
          { sceneNumber: 1, videoPrompt: 'scene 1', speechText: 'speech 1', sfxPrompt: 'sfx 1' }
        ],
        marketing: {
          ytTitle: 'title',
          ytDesc: 'desc',
          ytTags: 'tags',
          ttDesc: 'desc',
          ttTags: 'tags',
          xDesc: 'desc',
          xTags: 'tags',
          metaDesc: 'desc',
          metaTags: 'tags'
        }
      }
    })
  };
});

// Mock audit logging
vi.mock('../src/lib/audit.js', () => ({
  logAudit: () => {}
}));

// Mock colab-manager subprocess actions
vi.spyOn(colab, 'start').mockImplementation(async () => {
  (colab as any).state = {
    status: 'running',
    ngrokUrl: 'https://mocked-ngrok-url.ngrok-free.app',
    gpuMemoryGB: 15,
    lastHealthCheck: new Date().toISOString(),
    lastError: null,
    startedAt: new Date().toISOString(),
    uptimeSeconds: 10
  };
  (colab as any).emit('state-change', colab.getState());
  return { ngrokUrl: 'https://mocked-ngrok-url.ngrok-free.app' };
});

vi.spyOn(colab, 'stop').mockImplementation(async () => {
  (colab as any).state = {
    status: 'stopped',
    ngrokUrl: null,
    gpuMemoryGB: null,
    lastHealthCheck: null,
    lastError: null,
    startedAt: null,
    uptimeSeconds: null
  };
  (colab as any).emit('state-change', colab.getState());
});

describe('AI-Publisher System Integration Tests', () => {
  let app: express.Application;
  let server: http.Server;
  let authCookie: string = '';

  beforeAll(async () => {
    process.env.COLAB_URL = 'http://mocked-colab-url.com';

    // Setup Express
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));

    // Setup Lang/Theme fake middleware (as in server.ts)
    app.use((req: any, res, next) => {
      req.lang = req.session?.lang || 'tr';
      req.theme = req.session?.theme || 'default';
      req.t = { invalidLogin: 'Geçersiz giriş' };
      res.locals.themeStyles = '';
      next();
    });

    // Register routes
    registerAuthRoutes(app);
    registerColabRoutes(app);
    registerSettingsRoutes(app);
    registerJobRoutes(app);
    registerOpportunityRoutes(app);

    // Init SQLite in-memory or temporary database
    await initDatabase();

    // Ensure we have a test user 'admin' in db
    const encryptedAdmin = encryptUsername('admin');
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
    if (!existing) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [encryptedAdmin, hashedPassword]);
    }
  });

  it('should authenticate user and return session cookie', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies[0].split(';')[0];
  });

  describe('Authenticated Endpoints', () => {
    it('should start colab', async () => {
      const res = await request(app)
        .post('/colab-start')
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ngrokUrl).toBe('https://mocked-ngrok-url.ngrok-free.app');
      expect(colab.getState().status).toBe('running');
    });

    it('should stop colab', async () => {
      const res = await request(app)
        .post('/colab-stop')
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(colab.getState().status).toBe('stopped');
    });

    it('should verify colab libraries via colab manager', async () => {
      const result = await colab.verifyLibraries();
      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
    });

    it('should save settings in db', async () => {
      const settingsPayload = {
        youtube_api_key: 'AIzaSyTestApiKey123',
        selected_theme: 'neon-cyan',
        preferred_language: 'tr',
        apply_lipsync: 1,
        apply_end_screen: 0
      };

      const saveRes = await request(app)
        .post('/save-settings')
        .set('Cookie', authCookie)
        .send(settingsPayload);

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.success).toBe(true);

      const user = await db.get('SELECT * FROM users WHERE username = ?', [encryptUsername('admin')]);
      expect(user.youtube_api_key).toBe('AIzaSyTestApiKey123');
      expect(user.selected_theme).toBe('neon-cyan');
      expect(user.preferred_language).toBe('tr');
      expect(user.apply_lipsync).toBe(1);
      expect(user.apply_end_screen).toBe(0);
    });

    it('should handle video job lifecycle (create, cancel, retry, delete)', async () => {
      // 1. Create Job (using redirect style of form submit)
      const createRes = await request(app)
        .post('/create-job')
        .set('Cookie', authCookie)
        .send({
          master_prompt: 'Test master prompt',
          production_notes: 'Test production notes',
          character_features: 'Test character features',
          platforms: ['youtube', 'tiktok'],
          has_shorts: '1',
          has_subtitles: '1'
        });
      
      expect(createRes.status).toBe(302); // Redirects to /

      // Get created job
      const job = await db.get('SELECT * FROM video_jobs ORDER BY id DESC LIMIT 1');
      expect(job).toBeDefined();
      expect(job.master_prompt).toBe('Test master prompt');
      expect(job.status).toBe('pending');

      // 2. Cancel Job
      const cancelRes = await request(app)
        .post(`/cancel-job/${job.id}`)
        .set('Cookie', authCookie);
      
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);

      const cancelledJob = await db.get('SELECT * FROM video_jobs WHERE id = ?', [job.id]);
      expect(cancelledJob.status).toBe('cancelled');

      // 3. Retry Job
      const retryRes = await request(app)
        .post(`/retry-job/${job.id}`)
        .set('Cookie', authCookie);

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.success).toBe(true);

      const retriedJob = await db.get('SELECT * FROM video_jobs WHERE id = ?', [job.id]);
      expect(retriedJob.status).toBe('pending');

      // 4. Delete Job
      const deleteRes = await request(app)
        .post(`/delete-job/${job.id}`)
        .set('Cookie', authCookie);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const deletedJob = await db.get('SELECT * FROM video_jobs WHERE id = ?', [job.id]);
      expect(deletedJob).toBeUndefined();
    });

    describe('YouTube Scraper / Opportunity Funnel', () => {
      it('should search with API Key using YouTube API (mocked or fallback)', async () => {
        // Mock global fetch for YouTube API
        const originFetch = global.fetch;
        global.fetch = vi.fn().mockImplementation((url) => {
          if (url.includes('googleapis.com')) {
            return Promise.resolve({
              json: () => Promise.resolve({
                items: [
                  {
                    id: { videoId: 'dQw4w9WgXcQ' },
                    snippet: {
                      title: 'Rick Astley - Never Gonna Give You Up',
                      channelId: 'UCuAXFUrgNH0NxgOxNTDp_LQ',
                      channelTitle: 'RickAstleyVEVO',
                      thumbnails: { high: { url: 'https://example.com/thumb.jpg' } }
                    }
                  }
                ]
              })
            });
          }
          return Promise.resolve({ ok: false });
        });

        const res = await request(app)
          .get('/opportunity-videos?q=rick&lang=tr')
          .set('Cookie', authCookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.source).toBe('youtube_api');
        expect(res.body.videos.length).toBeGreaterThan(0);
        expect(res.body.videos[0].videoId).toBe('dQw4w9WgXcQ');

        global.fetch = originFetch;
      });

      it('should fallback to Invidious/Piped when API Key is empty or YouTube API fails', async () => {
        // Temporarily clear API Key in settings
        await db.run('UPDATE users SET youtube_api_key = NULL WHERE username = ?', ['admin']);

        // Mock global fetch to fail on YouTube API, but succeed on fallback Invidious instance
        const originFetch = global.fetch;
        global.fetch = vi.fn().mockImplementation((url) => {
          if (url.includes('inv.nadeko.net') || url.includes('invidious')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve([
                {
                  videoId: 'dQw4w9WgXcQ',
                  title: 'Rick Astley - Never Gonna Give You Up',
                  author: 'RickAstleyVEVO',
                  authorId: 'UCuAXFUrgNH0NxgOxNTDp_LQ',
                  viewCount: 1000000000,
                  likeCount: 15000000,
                  publishedText: '13 years ago',
                  description: 'Legendary track'
                }
              ])
            });
          }
          return Promise.resolve({ ok: false });
        });

        const res = await request(app)
          .get('/opportunity-videos?q=rick&lang=tr')
          .set('Cookie', authCookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.source).toContain('yt-search');
        expect(res.body.videos.length).toBeGreaterThan(0);
        expect(res.body.videos[0].videoId).toBe('dQw4w9WgXcQ');

        global.fetch = originFetch;
      });
    });
  });
});
