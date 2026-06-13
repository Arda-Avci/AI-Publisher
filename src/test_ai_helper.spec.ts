import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';
import aiHelperRouter from './routes/aiHelper.js';
import { generateObject } from 'ai';

// Mock rate limiters to avoid being blocked in tests
vi.mock('./middleware/rate-limit.js', () => ({
  authLimiter: (req: any, res: any, next: any) => next(),
  mediumLimiter: (req: any, res: any, next: any) => next(),
  heavyLimiter: (req: any, res: any, next: any) => next(),
  sseLimiter: (req: any, res: any, next: any) => next()
}));

// Mock ai-sdk to avoid real LLM calls
vi.mock('ai', () => ({
  generateObject: vi.fn()
}));

vi.mock('./lib/ai-provider.js', () => ({
  getAIModelChain: vi.fn().mockReturnValue([{ modelId: 'gemini-2.5-flash' }])
}));

describe('AI Helper API Routes Integration Tests', () => {
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

    // Register routes
    app.use('/api/v1/ai-helper', aiHelperRouter);

    // Init SQLite database
    await initDatabase();

    // Ensure we have a test user 'admin' in db for authentication middleware
    const encryptedAdmin = encryptUsername('admin_helper');
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
    if (!existing) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [encryptedAdmin, hashedPassword]);
    }
  });

  it('should fail with 401 when calling enhance-prompt unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/ai-helper/enhance-prompt')
      .send({ prompt: 'hello' });

    expect(res.status).toBe(401);
  });

  it('should authenticate and get access to endpoints', async () => {
    app.post('/test-login', async (req: any, res) => {
      const encryptedAdmin = encryptUsername('admin_helper');
      const user = await db.get('SELECT id FROM users WHERE username = ?', [encryptedAdmin]);
      req.session.userId = user.id;
      res.json({ success: true });
    });

    const loginRes = await request(app).post('/test-login').send();
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies[0].split(';')[0];
  });

  it('should enhance prompt successfully via API', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { enhancedPrompt: 'AI Enhanced Prompt' }
    } as any);

    const res = await request(app)
      .post('/api/v1/ai-helper/enhance-prompt')
      .set('Cookie', authCookie)
      .send({
        prompt: 'test prompt',
        cameraMotion: 'zoom_in',
        templateStyle: 'cinematic',
        characterFeatures: 'young boy'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.enhancedPrompt).toBe('AI Enhanced Prompt');
  });

  it('should generate tutorial prompts successfully via API', async () => {
    const mockTutorial = {
      tutorialTitle: 'Feature Tutorial',
      scenes: [
        {
          sceneNumber: 1,
          videoPrompt: 'Scene Prompt',
          speechText: 'Speech Text',
          sfxPrompt: 'SFX',
          screenAction: 'Action'
        }
      ]
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockTutorial
    } as any);

    const res = await request(app)
      .post('/api/v1/ai-helper/tutorial-prompts')
      .set('Cookie', authCookie)
      .send({
        featureName: 'Clipper'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tutorialTitle).toBe('Feature Tutorial');
  });

  it('should generate landing assets successfully via API', async () => {
    const mockAssets = {
      heroVideo: {
        title: 'Hero Title',
        prompt: 'Hero Prompt',
        description: 'Hero Desc'
      },
      showcaseVideos: []
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockAssets
    } as any);

    const res = await request(app)
      .post('/api/v1/ai-helper/landing-assets')
      .set('Cookie', authCookie)
      .send({
        niche: 'cooking'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.heroVideo.title).toBe('Hero Title');
  });

  it('should generate custom theme successfully via API', async () => {
    const mockTheme = {
      themeName: 'Test Theme',
      isDark: true,
      colors: {
        background: '200 20% 10%',
        foreground: '200 20% 90%',
        primary: '200 80% 50%',
        primaryForeground: '0 0% 100%'
      }
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockTheme
    } as any);

    const res = await request(app)
      .post('/api/v1/ai-helper/custom-theme')
      .set('Cookie', authCookie)
      .send({
        styleDescription: 'ocean breeze dark'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.themeName).toBe('Test Theme');
  });
});
