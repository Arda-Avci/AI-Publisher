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
import { TIMEOUT } from './constants.js';

const whisperAvailable = !!(process.env.WHISPER_URL || process.env.GEMINI_API_KEY);

describe('Clipper & Whisper Integration Tests', () => {
  let app: express.Application;
  let testUserId: number;
  let videoWithAudio: string;

  beforeAll(async () => {
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

    videoWithAudio = fx('whisper_test_audio.mp4');
    if (!fs.existsSync(videoWithAudio)) {
      const { execSync } = require('child_process');
      execSync(
        `ffmpeg -y -i ${JSON.stringify(FIXTURES.video)} -f lavfi -i anullsrc=r=44100:cl=mono -c:v copy -c:a aac -shortest ${JSON.stringify(videoWithAudio)}`,
        { timeout: TIMEOUT.EXEC_QUICK },
      );
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    }
    try { fs.unlinkSync(videoWithAudio); } catch {}
  });

  it.runIf(whisperAvailable)('1. Docker Whisper /transcribe endpointi basariyla cagrildiginda segmentleri donmeli', async () => {
    const result = await transcribeVideoAudioWithTimestamps(videoWithAudio);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('segments');
    expect(Array.isArray(result.segments)).toBe(true);
  }, 120000);

  it.runIf(whisperAvailable)('2. Gemini fallback — structured JSON segmentler', async () => {
    const result = await transcribeVideoAudioWithTimestamps(videoWithAudio);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('segments');
    expect(result).toHaveProperty('language');
  }, 120000);

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

    await new Promise((resolve) => setTimeout(resolve, 500));

    const jobRes = await request(app).get(`/api/v1/clipper/${res.body.jobId}`);

    expect(jobRes.status).toBe(200);
    expect(jobRes.body.clip).toBeDefined();
  }, 60000);
});
