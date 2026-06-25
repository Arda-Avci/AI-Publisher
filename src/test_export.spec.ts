import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { initDatabase, db } from './db.js';
import { createExportZip, generateFilmFreewayMetadata } from './services/exportService.js';
import type { Job, Scene } from './types/job.js';

describe('Export Service', () => {
  let testJobId: number;
  let testUserId: number;
  const exportDir = path.join(os.tmpdir(), 'ai-publisher-export-test');

  beforeAll(async () => {
    await initDatabase();
    const userResult = await db.run(
      "INSERT INTO users (username, password) VALUES ('test_export_user', ?)",
      ['dummy_hash'],
    );
    testUserId = userResult?.lastID ?? 0;

    const jobResult = await db.run(
      "INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes, completed_scenes, final_filename) VALUES (?, ?, 'completed', 3, 3, 'test_final.mp4')",
      [testUserId, 'Export test prompt'],
    );
    testJobId = jobResult?.lastID ?? 0;

    await fs.ensureDir(exportDir);
  });

  afterAll(async () => {
    await fs.remove(exportDir);
    await db.run('DELETE FROM video_jobs WHERE id = ?', [testJobId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
  });

  it('generateFilmFreewayMetadata should return correct schema', async () => {
    const job: Job = {
      id: testJobId, user_id: testUserId, master_prompt: 'Test prompt',
      status: 'completed', total_scenes: 3, completed_scenes: 3,
      final_filename: 'test.mp4', estimated_minutes: 2, model_type: 'wan25',
    } as Job;
    const scenes: Scene[] = [
      { id: 1, scene_number: 1, video_path: '/tmp/scene1.mp4', model_type: 'wan25' } as Scene,
      { id: 2, scene_number: 2, video_path: '/tmp/scene2.mp4', model_type: 'ltx-video' } as Scene,
    ];

    const meta = await generateFilmFreewayMetadata(job, scenes);
    expect(meta).toHaveProperty('title');
    expect(meta).toHaveProperty('description');
    expect(meta).toHaveProperty('tags');
    expect(meta).toHaveProperty('runtime');
    expect(meta).toHaveProperty('aspectRatio');
    expect(meta).toHaveProperty('resolution');
    expect(meta).toHaveProperty('fps');
    expect(meta).toHaveProperty('aiModels');
    expect(Array.isArray(meta.aiModels)).toBe(true);
    expect(meta.aiModels.length).toBeGreaterThanOrEqual(1);
    expect(meta).toHaveProperty('techSpecs');
  });

  it('generateFilmFreewayMetadata should include job model info', async () => {
    const job = { id: testJobId, model_type: 'wan25', tts_provider: 'xtts' } as Job;
    const scenes: Scene[] = [
      { scene_number: 1, model_type: 'wan25', tts_provider: 'xtts' } as Scene,
      { scene_number: 2, model_type: 'ltx-video', tts_provider: 'kokoro' } as Scene,
    ];

    const meta = await generateFilmFreewayMetadata(job, scenes);
    expect(meta.aiModels.length).toBeGreaterThanOrEqual(2);
    expect(meta.aiModels).toContain('wan25');
    expect(meta.aiModels).toContain('TTS:xtts');
  });

  it('createExportZip should throw for nonexistent files', async () => {
    const job = { id: testJobId, user_id: testUserId, final_filename: 'nonexistent.mp4' } as Job;
    const scenes: Scene[] = [];
    await expect(createExportZip(job, scenes, exportDir)).rejects.toThrow();
  });

  it('createExportZip should throw for nonexistent scenes', async () => {
    const dummyFile = path.join(exportDir, 'dummy_final.mp4');
    await fs.writeFile(dummyFile, 'dummy content');
    try {
      const job = { id: testJobId, user_id: testUserId, final_filename: dummyFile } as Job;
      const scenes: Scene[] = [
        { id: 1, scene_number: 1, video_path: '/nonexistent/scene.mp4' } as Scene,
      ];
      await expect(createExportZip(job, scenes, exportDir)).rejects.toThrow();
    } finally {
      await fs.remove(dummyFile);
    }
  });
});
