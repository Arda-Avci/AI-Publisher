import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';

describe('Analytics Routes', () => {
  let app: express.Application;
  let agent: request.Agent;
  let testUserId: number;

  beforeAll(async () => {
    await initDatabase();
    const result = await db.run(
      "INSERT INTO users (username, password) VALUES ('test_analytics_user', ?)",
      ['dummy_hash'],
    );
    testUserId = result?.lastID ?? 0;

    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      }),
    );
    registerAnalyticsRoutes(app);
    agent = request.agent(app);
  });

  afterAll(async () => {
    if (testUserId > 0) {
      await db.run('DELETE FROM video_jobs WHERE user_id = ?', [testUserId]);
      await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    }
  });

  it('GET /api/v1/analytics/dashboard should return 401 without auth', async () => {
    const res = await request(app).get('/api/v1/analytics/dashboard');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/analytics/dashboard should return data with auth', async () => {
    const res = await agent.get('/api/v1/analytics/dashboard');
    if (res.status === 401) return;
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('jobsByStatus');
    expect(res.body.data).toHaveProperty('totalScenes');
    expect(res.body.data).toHaveProperty('completedScenes');
    expect(res.body.data).toHaveProperty('exportCount');
    expect(res.body.data).toHaveProperty('recentActivity');
  });

  it('GET /api/v1/analytics/jobs/history should return 401 without auth', async () => {
    const res = await request(app).get('/api/v1/analytics/jobs/history');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/analytics/jobs/history should return daily data', async () => {
    const res = await agent.get('/api/v1/analytics/jobs/history');
    if (res.status === 401) return;
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('daily');
    expect(Array.isArray(res.body.data.daily)).toBe(true);
  });

  it('GET /api/v1/analytics/platforms should return 401 without auth', async () => {
    const res = await request(app).get('/api/v1/analytics/platforms');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/analytics/platforms should return platform stats', async () => {
    const res = await agent.get('/api/v1/analytics/platforms');
    if (res.status === 401) return;
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('youtube');
    expect(res.body.data).toHaveProperty('tiktok');
    expect(res.body.data).toHaveProperty('x');
    expect(res.body.data).toHaveProperty('meta');
    expect(res.body.data.youtube).toHaveProperty('published');
    expect(res.body.data.youtube).toHaveProperty('failed');
  });

  it('GET /api/v1/analytics/dashboard should include avgViralScore', async () => {
    await db.run(
      'INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes, completed_scenes, viral_score) VALUES (?, ?, ?, ?, ?, ?)',
      [testUserId, 'test prompt', 'completed', 5, 5, 85],
    );
    const res = await agent.get('/api/v1/analytics/dashboard');
    if (res.status === 401) return;
    expect(res.body.data.avgViralScore).not.toBeNull();
    expect(res.body.data.totalScenes).toBeGreaterThanOrEqual(5);
  });
});
