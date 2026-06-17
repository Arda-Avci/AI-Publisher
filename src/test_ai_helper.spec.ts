import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';
import aiHelperRouter from './routes/aiHelper.js';

describe('AI Helper API Routes Integration Tests', () => {
  let app: express.Application;
  let authCookie: string = '';

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

    app.use('/api/v1/ai-helper', aiHelperRouter);

    await initDatabase();

    const encryptedAdmin = encryptUsername('admin_helper');
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
    if (!existing) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [
        encryptedAdmin,
        hashedPassword,
      ]);
    }

    // Fake login to get session cookie
    app.post('/test-login', async (req, res) => {
      (req.session as any).userId = 1;
      (req.session as any).username = 'admin_helper';
      res.json({ success: true });
    });

    const loginRes = await request(app).post('/test-login').send();
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies[0].split(';')[0];
  });

  afterAll(async () => {
    const encryptedAdmin = encryptUsername('admin_helper');
    await db.run('DELETE FROM users WHERE username = ?', [encryptedAdmin]);
  });

  it('should enhance prompt successfully via API', { timeout: 60000 }, async () => {
    const res = await request(app)
      .post('/api/v1/ai-helper/enhance-prompt')
      .set('Cookie', authCookie)
      .send({
        prompt: 'test prompt',
        cameraMotion: 'zoom_in',
        templateStyle: 'cinematic',
        characterFeatures: 'young boy',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('enhancedPrompt');
  });

  it('should generate tutorial prompts successfully via API', { timeout: 60000 }, async () => {
    const res = await request(app)
      .post('/api/v1/ai-helper/tutorial-prompts')
      .set('Cookie', authCookie)
      .send({ featureName: 'Clipper' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('tutorialTitle');
  });

  it('should generate landing assets successfully via API', { timeout: 60000 }, async () => {
    const res = await request(app)
      .post('/api/v1/ai-helper/landing-assets')
      .set('Cookie', authCookie)
      .send({ niche: 'cooking' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('heroVideo');
  });

  it('should generate custom theme successfully via API', { timeout: 60000 }, async () => {
    const res = await request(app)
      .post('/api/v1/ai-helper/custom-theme')
      .set('Cookie', authCookie)
      .send({ styleDescription: 'ocean breeze dark' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('themeName');
  });
});
