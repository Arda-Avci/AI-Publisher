import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import { initDatabase, db } from './db.js';

vi.mock('./lib/redis.js', () => ({
  redisPub: { publish: vi.fn().mockResolvedValue(true), on: vi.fn() },
  redisSub: { duplicate: vi.fn(), on: vi.fn() },
  broadcastProgress: vi.fn().mockResolvedValue(true),
}));

vi.mock('./lib/rabbitmq.js', () => ({
  getRabbitChannel: vi.fn().mockReturnValue({ sendToQueue: vi.fn() }),
  VIDEO_JOBS_QUEUE: 'video_jobs',
  initRabbitMQ: vi.fn(),
  registerReconnectCallback: vi.fn(),
}));

vi.mock('./services/modalClient.js', () => ({
  ModalClient: {
    runJob: vi.fn().mockResolvedValue({ id: 'mock-modal-id', status: 'queued' }),
  },
}));

let app: express.Express;
let testSceneId: number;
let testJobId: number;
const RUNPOD_JOB_ID = `webhook-test-${Date.now()}`;

async function cleanup() {
  if (testSceneId) {
    await db.run('DELETE FROM video_scenes WHERE id = ?', [testSceneId]);
  }
  if (testJobId) {
    await db.run('DELETE FROM video_jobs WHERE id = ?', [testJobId]);
  }
}

beforeAll(async () => {
  await fs.ensureDir(path.join(process.cwd(), 'uploads'));
  await initDatabase();

  app = express();
  app.use(express.json({ limit: '10mb' }));

  const { registerWebhookRoutes } = await import('./routes/webhook.js');
  registerWebhookRoutes(app);

  const jobResult = await db.run(
    `INSERT INTO video_jobs (user_id, master_prompt, status) VALUES (?, ?, 'processing')`,
    [1, 'Test prompt'],
  );
  testJobId = jobResult.lastID || 0;

  const sceneResult = await db.run(
    `INSERT INTO video_scenes (job_id, scene_number, status, runpod_job_id, video_prompt, sort_order) VALUES (?, ?, 'processing', ?, 'Test scene prompt', 1)`,
    [testJobId, 1, RUNPOD_JOB_ID],
  );
  testSceneId = sceneResult.lastID || 0;
});

afterAll(async () => {
  await cleanup();
});

describe('Webhook E2E — RunPod callback', () => {
  it('should reject webhook without auth token', async () => {
    const res = await request(app)
      .post('/api/webhook/runpod')
      .send({ id: RUNPOD_JOB_ID, status: 'COMPLETED', output: { video_url: 'https://b2.example.com/v.mp4' } });
    expect(res.status).toBe(401);
  });

  it('should reject webhook with invalid token', async () => {
    const res = await request(app)
      .post('/api/webhook/runpod?token=invalid_token')
      .send({ id: RUNPOD_JOB_ID, status: 'COMPLETED', output: { video_url: 'https://b2.example.com/v.mp4' } });
    expect(res.status).toBe(401);
  });

  it('should return 400 when job id missing', async () => {
    const res = await request(app)
      .post('/api/webhook/runpod?token=local_callback_secure_token_2026')
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(400);
  });

  it('should update scene on COMPLETED webhook', async () => {
    const CALLBACK_TOKEN = process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026';

    const payload = {
      id: RUNPOD_JOB_ID,
      status: 'COMPLETED',
      output: {
        video_url: 'https://b2.example.com/scene_video.mp4',
        speech_url: 'https://b2.example.com/speech.wav',
        sfx_url: 'https://b2.example.com/sfx.wav',
        subtitle_url: 'https://b2.example.com/subtitle.srt',
      },
    };

    const res = await request(app)
      .post(`/api/webhook/runpod?token=${CALLBACK_TOKEN}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const scene = await db.get('SELECT * FROM video_scenes WHERE id = ?', [testSceneId]);

    expect(scene.status).toBe('completed');
    expect(scene.video_path).toBe('https://b2.example.com/scene_video.mp4');
    expect(scene.audio_path).toBe('https://b2.example.com/speech.wav');
    expect(scene.sfx_path).toBe('https://b2.example.com/sfx.wav');
    expect(scene.subtitle_path).toBe('https://b2.example.com/subtitle.srt');
  });

  it('should handle FAILED webhook correctly', async () => {
    const failJobId = `webhook-fail-${Date.now()}`;

    const failScene = await db.run(
      `INSERT INTO video_scenes (job_id, scene_number, status, runpod_job_id, video_prompt, sort_order) VALUES (?, ?, 'processing', ?, 'Test fail prompt', 2)`,
      [testJobId, 2, failJobId],
    );
    const failSceneId = failScene.lastID || 0;

    try {
      const CALLBACK_TOKEN = process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026';

      const payload = {
        id: failJobId,
        status: 'FAILED',
        error: 'GPU out of memory',
      };

      const res = await request(app)
        .post(`/api/webhook/runpod?token=${CALLBACK_TOKEN}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const scene = await db.get('SELECT * FROM video_scenes WHERE id = ?', [failSceneId]);
      expect(scene.status).toBe('failed');
    } finally {
      await db.run('DELETE FROM video_scenes WHERE id = ?', [failSceneId]);
    }
  });
});
