import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import fs from 'fs-extra';
import path from 'path';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import { transcribeVideoAudioWithTimestamps } from './lib/audio-transcriber.js';
import clipperRouter from './routes/clipper.js';
import { FIXTURES, fx } from './__fixtures__/index.js';

describe('Clipper & Whisper Integration Tests', () => {
  let app: express.Application;
  let testUserId: number;
  let videoWithAudio: string;

  beforeAll(async () => {
    // Setup Express for router testing
    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      }),
    );

    app.use((req: any, res, next) => {
      req.session.userId = testUserId;
      next();
    });

    app.use('/api/v1/clipper', clipperRouter);

    // Init DB and create test user
    await initDatabase();
    const testUsername = encryptUsername('clipper.whisper@test.com');
    await db.run('DELETE FROM users WHERE username = ?', [testUsername]);
    await db.run('INSERT INTO users (username, password, credits) VALUES (?, ?, ?)', [
      testUsername,
      'pass',
      1000,
    ]);
    const user = await db.get('SELECT id FROM users WHERE username = ?', [testUsername]);
    testUserId = user.id;

    // Create a test video with audio track for whisper tests
    videoWithAudio = fx('whisper_test_audio.mp4');
    if (!require('fs').existsSync(videoWithAudio)) {
      const { execSync } = require('child_process');
      execSync(
        `ffmpeg -y -i ${JSON.stringify(FIXTURES.video)} -f lavfi -i anullsrc=r=44100:cl=mono -c:v copy -c:a aac -shortest ${JSON.stringify(videoWithAudio)}`,
        { timeout: 10000 },
      );
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    }
    // Clean up generated audio fixture
    try { require('fs').unlinkSync(videoWithAudio); } catch {}
  });

  it('1. Docker Whisper /transcribe endpointi basariyla cagrildiginda segmentleri donmeli', async () => {
    // Use video with audio track for whisper
    const result = await transcribeVideoAudioWithTimestamps(videoWithAudio);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('segments');
    expect(Array.isArray(result.segments)).toBe(true);
  }, 60000);

  it('2. Docker Whisper hata verdiginde Gemini fallback mekanizmasi structured JSON olarak segmentleri cikarmali', async () => {
    // Use video with audio track
    const result = await transcribeVideoAudioWithTimestamps(videoWithAudio);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('segments');
    expect(result).toHaveProperty('language');
  }, 60000);

  it('3. /api/v1/clipper/extract rotasi asenkron deşifre akışını basariyla tetiklemeli', async () => {
    const res = await request(app).post('/api/v1/clipper/extract').send({
      videoPath: videoWithAudio,
      videoId: 123,
      minDuration: 10,
      maxDuration: 60,
    });

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.status).toBe('pending');

    // Asenkron akışın tamamlanması için kısa bir süre bekleyelim
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Job detaylarını çekip durumunu doğrula
    const jobRes = await request(app).get(`/api/v1/clipper/${res.body.jobId}`);

    expect(jobRes.status).toBe(200);
    expect(jobRes.body.clip).toBeDefined();
  }, 60000);
});
