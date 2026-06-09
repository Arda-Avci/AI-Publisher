import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { registerDifferentiationRoutes } from './routes/differentiation.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerAuthRoutes } from './routes/auth.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';
import {
  createDifferentiationJob,
  runPhase1Background,
  differentiateVideoPhase2
} from './lib/differentiate.js';

// Mock rate limiters to avoid being blocked in tests
vi.mock('./middleware/rate-limit.js', () => ({
  authLimiter: (req: any, res: any, next: any) => next(),
  mediumLimiter: (req: any, res: any, next: any) => next(),
  heavyLimiter: (req: any, res: any, next: any) => next(),
  sseLimiter: (req: any, res: any, next: any) => next()
}));

// Mock queue.ts to prevent background worker from starting during testing
vi.mock('./queue.ts', () => ({
  checkQueue: vi.fn(),
  broadcast: vi.fn(),
  clients: new Map()
}));

// Mock rabbitmq.ts to avoid connecting to RabbitMQ in tests
vi.mock('./lib/rabbitmq.ts', () => ({
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

// Mock transcript fetcher
vi.mock('./lib/transcript.js', () => ({
  fetchYouTubeTranscript: async (videoId: string) => ({
    plainText: 'This is a sample youtube video transcript about artificial intelligence.'
  })
}));

// Mock translation and Gemini logic
vi.mock('./lib/translation.js', () => ({
  cleanText: async (text: string) => 'Sample youtube video transcript artificial intelligence.',
  translateText: async (text: string, lang: string) => 'Yapay zeka hakkinda ornek youtube videosu transkripti.',
  generateScenePrompts: async (text: string, lang: string) => [
    { sceneNumber: 1, videoPrompt: 'First scene prompt', speechText: 'Speech 1', sfxPrompt: 'SFX 1' },
    { sceneNumber: 2, videoPrompt: 'Second scene prompt', speechText: 'Speech 2', sfxPrompt: 'SFX 2' }
  ],
  isSupportedLang: (lang: string) => lang === 'tr' || lang === 'en',
  LANG_NAMES: { tr: 'Turkish', en: 'English' }
}));

// Mock audit logging
vi.mock('./lib/audit.js', () => ({
  logAudit: () => {}
}));

describe('Video Differentiation System Integration Tests', () => {
  let app: express.Application;
  let authCookie: string = '';

  beforeAll(async () => {
    // Setup Express
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));

    // Setup Lang/Theme fake middleware
    app.use((req: any, res, next) => {
      req.lang = req.session?.lang || 'tr';
      req.theme = req.session?.theme || 'default';
      req.t = { invalidLogin: 'Geçersiz giriş' };
      res.locals.themeStyles = '';
      next();
    });

    // Register routes
    registerAuthRoutes(app);
    registerDifferentiationRoutes(app);
    registerJobRoutes(app);

    // Init SQLite database
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

    expect(res.status).toBe(302);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies[0].split(';')[0];
  });

  describe('Differentiate Endpoints', () => {
    let jobId: number;

    it('should create differentiation job via /differentiate-video', async () => {
      const res = await request(app)
        .post('/differentiate-video')
        .set('Cookie', authCookie)
        .send({
          videoId: 'dQw4w9WgXcQ',
          sourceMeta: {
            videoId: 'dQw4w9WgXcQ',
            title: 'Sample Video',
            channelTitle: 'Sample Channel',
            thumbnail: 'https://example.com/thumb.jpg'
          },
          targetLang: 'tr',
          durationMode: 'same'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBeDefined();
      jobId = res.body.jobId;
    });

    it('should poll status using /differentiate-status/:jobId', async () => {
      const res = await request(app)
        .get(`/differentiate-status/${jobId}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe(jobId);
      expect(['processing_phase1', 'pending']).toContain(res.body.status);
    });

    it('should complete Phase 1 background task successfully', async () => {
      // Manually trigger runPhase1Background
      const adminUser = await db.get('SELECT id FROM users WHERE username = ?', [encryptUsername('admin')]);
      await runPhase1Background(jobId, adminUser.id);

      // Verify DB state
      const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
      expect(job.status).toBe('pending'); // Ready for manual start
      expect(job.transcript_translated).toBe('Yapay zeka hakkinda ornek youtube videosu transkripti.');
    });

    it('should submit translation via /approve-translation/:jobId', async () => {
      // First let's set status back to awaiting_approval for testing Phase 2
      await db.run("UPDATE video_jobs SET status = 'awaiting_approval' WHERE id = ?", [jobId]);

      const res = await request(app)
        .post(`/approve-translation/${jobId}`)
        .set('Cookie', authCookie)
        .send({
          editedTranslation: 'Yapay zeka hakkinda guzel bir ornek video transkripti.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe(jobId);

      const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
      expect(job.status).toBe('pending');
      expect(job.transcript_translated).toBe('Yapay zeka hakkinda guzel bir ornek video transkripti.');
    });

    it('should create new job with differentiation options via /create-job', async () => {
      const res = await request(app)
        .post('/create-job')
        .set('Cookie', authCookie)
        .send({
          master_prompt: 'Test master prompt',
          production_notes: 'Test production notes',
          character_features: 'Test character features',
          platforms: ['youtube', 'tiktok'],
          has_shorts: '1',
          has_subtitles: '1',
          differentiation_layout: '1',
          differentiation_duration_mode: 'shorter'
        });

      expect(res.status).toBe(302); // Redirect to '/'

      const job = await db.get('SELECT * FROM video_jobs ORDER BY id DESC LIMIT 1');
      expect(job.differentiation_layout).toBe(1);
      expect(job.differentiation_duration_mode).toBe('shorter');
    });
  });
});
