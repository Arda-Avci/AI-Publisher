import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';

describe('Sprint 10 — Production Audit Fixes', () => {
  beforeAll(async () => {
    process.env.COLAB_URL = 'https://mock-colab.ngrok-free.dev';
    await initDatabase();
  });

  describe('1. retry_count column migration', () => {
    it('retry_count column exists on video_jobs table', async () => {
      const col = await db.get(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'video_jobs' AND column_name = 'retry_count'`
      );
      expect(col).toBeTruthy();
    });

    it('INSERT with DEFAULT retry_count yields 0', async () => {
      const encrypted = encryptUsername('retry_test_user');
      await db.run(
        `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [encrypted, await bcrypt.hash('test', 10)]
      );
      const user = await db.get('SELECT id FROM users WHERE username = $1', [encrypted]);
      const result = await db.run(
        `INSERT INTO video_jobs (user_id, master_prompt, status) VALUES ($1, $2, 'pending')`,
        [user.id, 'Retry test']
      );
      const jobId = result.lastID as number;
      const job = await db.get('SELECT retry_count FROM video_jobs WHERE id = $1', [jobId]);
      expect(Number(job.retry_count)).toBe(0);
      await db.run('DELETE FROM video_jobs WHERE id = $1', [jobId]);
      await db.run('DELETE FROM users WHERE id = $1', [user.id]);
    });

    it('retry_count can be updated to track retries', async () => {
      const encrypted = encryptUsername('retry_update_user');
      await db.run(
        `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [encrypted, await bcrypt.hash('test', 10)]
      );
      const user = await db.get('SELECT id FROM users WHERE username = $1', [encrypted]);
      const result = await db.run(
        `INSERT INTO video_jobs (user_id, master_prompt, status) VALUES ($1, $2, 'pending')`,
        [user.id, 'Retry update test']
      );
      const jobId = result.lastID as number;
      await db.run(
        "UPDATE video_jobs SET status = 'pending', retry_count = 2 WHERE id = $1",
        [jobId]
      );
      const job = await db.get('SELECT retry_count FROM video_jobs WHERE id = $1', [jobId]);
      expect(Number(job.retry_count)).toBe(2);
      await db.run('DELETE FROM video_jobs WHERE id = $1', [jobId]);
      await db.run('DELETE FROM users WHERE id = $1', [user.id]);
    });
  });

  describe('2. VideoJob interface includes retry_count', () => {
    it('VideoJob type allows retry_count property', () => {
      const job: Partial<import('./types/job.js').VideoJob> = { retry_count: 3, id: 1, user_id: 1, status: 'pending' };
      expect(job.retry_count).toBe(3);
    });
  });
});
