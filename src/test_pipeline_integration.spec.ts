import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';

vi.mock('./lib/redis.js', () => ({
  redisPub: { publish: vi.fn().mockResolvedValue(true), on: vi.fn() },
  redisSub: { duplicate: vi.fn().mockReturnValue({ on: vi.fn(), subscribe: vi.fn(), quit: vi.fn() }), on: vi.fn() },
  broadcastProgress: vi.fn().mockResolvedValue(true),
}));

vi.mock('./lib/rabbitmq.js', () => ({
  getRabbitChannel: vi.fn().mockReturnValue({ sendToQueue: vi.fn() }),
  VIDEO_JOBS_QUEUE: 'video_jobs',
  initRabbitMQ: vi.fn(),
  registerReconnectCallback: vi.fn(),
  sendToQueue: vi.fn(),
}));

vi.mock('./lib/redis-mutex.js', () => ({
  RedisMutex: class {
    lock = vi.fn().mockResolvedValue(undefined);
    unlock = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('./lib/b2.js', () => ({
  uploadFile: vi.fn().mockResolvedValue(true),
  downloadFile: vi.fn().mockResolvedValue('/tmp/mock_download.mp4'),
  getSignedUrl: vi.fn().mockResolvedValue('https://mock-b2-url.com/file'),
  isConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('./lib/logger.js', () => ({
  Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const TEST_USER = 'pipeline.integration@test.com';
const TEST_PASS = 'pipeline123';
let testUserId: number;
let testJobId: number;

beforeAll(async () => {
  await fs.ensureDir(path.join(process.cwd(), 'uploads'));
  await fs.ensureDir(path.join(process.cwd(), 'videolar'));
  await initDatabase();

  const encUsername = encryptUsername(TEST_USER);
  await db.run('DELETE FROM users WHERE username = $1', [encUsername]);
  const hashed = await bcrypt.hash(TEST_PASS, 10);
  await db.run('INSERT INTO users (username, password) VALUES ($1, $2)', [encUsername, hashed]);
  const user = await db.get('SELECT id FROM users WHERE username = $1', [encUsername]);
  testUserId = user.id;
});

afterAll(async () => {
  if (testUserId) {
    await db.run('DELETE FROM video_scenes WHERE job_id = $1', [testJobId]);
    await db.run('DELETE FROM video_jobs WHERE user_id = $1', [testUserId]);
    await db.run('DELETE FROM users WHERE id = $1', [testUserId]);
  }
});

beforeEach(async () => {
  if (testJobId) {
    await db.run('DELETE FROM video_scenes WHERE job_id = $1', [testJobId]);
    await db.run('DELETE FROM video_jobs WHERE id = $1', [testJobId]);
    testJobId = 0;
  }
});

describe('[K-1] Job Queue — enqueue, dequeue, broadcast', () => {
  it('should insert a pending job and broadcast progress update', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, current_stage, progress_percent, total_scenes, completed_scenes)
       VALUES ($1, $2, 'pending', 'Kuyrukta', 0, 3, 0)`,
      [testUserId, 'Queue integration test prompt'],
    );
    testJobId = Number(result.lastID);
    expect(testJobId).toBeGreaterThan(0);

    const job = await db.get('SELECT * FROM video_jobs WHERE id = $1', [testJobId]);
    expect(job).toBeDefined();
    expect(job.status).toBe('pending');
    expect(job.progress_percent).toBe(0);
    expect(job.total_scenes).toBe(3);

    const { broadcast } = await import('./queue.js');
    broadcast(testJobId, { stage: 'processing_scene_1', percent: 10 });

    const updated = await db.run(
      'UPDATE video_jobs SET status = $1, progress_percent = $2, current_stage = $3 WHERE id = $4',
      ['processing', 10, 'processing_scene_1', testJobId],
    );
    expect(updated.changes).toBe(1);

    const verify = await db.get('SELECT status, progress_percent, current_stage FROM video_jobs WHERE id = $1', [testJobId]);
    expect(verify.status).toBe('processing');
    expect(verify.progress_percent).toBe(10);
    expect(verify.current_stage).toBe('processing_scene_1');
  });

  it('should simulate scene-level progress: 0% → 33% → 66% → 100%', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent, total_scenes, completed_scenes)
       VALUES ($1, $2, 'processing', 10, 3, 0)`,
      [testUserId, 'Scene progress test'],
    );
    const jobId = Number(result.lastID);
    testJobId = jobId;

    const stages = [
      { stage: 'generating_scene_1', percent: 33, completed: 1 },
      { stage: 'generating_scene_2', percent: 66, completed: 2 },
      { stage: 'generating_scene_3', percent: 100, completed: 3 },
    ];

    for (const s of stages) {
      await db.run(
        'UPDATE video_jobs SET progress_percent = $1, current_stage = $2, completed_scenes = $3 WHERE id = $4',
        [s.percent, s.stage, s.completed, jobId],
      );
    }

    const final = await db.get('SELECT progress_percent, completed_scenes, current_stage FROM video_jobs WHERE id = $1', [jobId]);
    expect(final.progress_percent).toBe(100);
    expect(final.completed_scenes).toBe(3);
    expect(final.current_stage).toBe('generating_scene_3');
  });
});

describe('[K-2] FFmpeg Pipeline — video service operations', () => {
  it('should create a test video with ffmpeg and get its duration', async () => {
    const { runFFmpeg, getVideoDuration } = await import('./services/videoService.js');
    const testOutput = path.join(process.cwd(), 'uploads', `pipeline_test_dur_${Date.now()}.mp4`);
    await runFFmpeg('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=red:s=160x90:d=2',
      '-c:v', 'libx264', '-preset', 'ultrafast',
      testOutput,
    ], 30000);
    const exists = await fs.pathExists(testOutput);
    expect(exists).toBe(true);
    const duration = await getVideoDuration(testOutput);
    expect(duration).toBeCloseTo(2, 0.5);
    await fs.unlink(testOutput).catch(() => {});
  });

  it('should concat two short test videos', async () => {
    const { runFFmpeg, concatVideosWithCrossfade } = await import('./services/videoService.js');
    const clip1 = path.join(process.cwd(), 'uploads', `pipeline_clip1_${Date.now()}.mp4`);
    const clip2 = path.join(process.cwd(), 'uploads', `pipeline_clip2_${Date.now()}.mp4`);
    const output = path.join(process.cwd(), 'uploads', `pipeline_concat_${Date.now()}.mp4`);

    await runFFmpeg('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:d=1',
      '-c:v', 'libx264', '-preset', 'ultrafast', clip1,
    ], 30000);
    await runFFmpeg('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=green:s=160x90:d=1',
      '-c:v', 'libx264', '-preset', 'ultrafast', clip2,
    ], 30000);

    await concatVideosWithCrossfade([clip1, clip2], output, 0.5, 'fade');
    const exists = await fs.pathExists(output);
    expect(exists).toBe(true);
    const stat = await fs.stat(output);
    expect(stat.size).toBeGreaterThan(0);

    for (const f of [clip1, clip2, output]) {
      await fs.unlink(f).catch(() => {});
    }
  });

  it('should convert SRT to ASS and verify output exists', async () => {
    const { convertSrtToKineticAss } = await import('./services/videoService.js');
    const srtInput = path.join(process.cwd(), 'uploads', `pipeline_srt_${Date.now()}.srt`);
    const assOutput = path.join(process.cwd(), 'uploads', `pipeline_ass_${Date.now()}.ass`);

    await fs.writeFile(srtInput, `1\n00:00:00,000 --> 00:00:02,000\nTest subtitle line\n`);

    await convertSrtToKineticAss(srtInput, assOutput, '#FFFF00', '#00FFFF', 'Arial', 'bounce', 1920, 1080);
    const exists = await fs.pathExists(assOutput);
    expect(exists).toBe(true);
    const content = await fs.readFile(assOutput, 'utf-8');
    expect(content).toContain('[Script Info]');
    expect(content).toContain('[Events]');

    for (const f of [srtInput, assOutput]) {
      await fs.unlink(f).catch(() => {});
    }
  });

  it('should apply a video filter (hue) with ffmpeg', async () => {
    const { runFFmpeg } = await import('./services/videoService.js');
    const videoInput = path.join(process.cwd(), 'uploads', `pipeline_filt_vid_${Date.now()}.mp4`);
    const output = path.join(process.cwd(), 'uploads', `pipeline_filt_out_${Date.now()}.mp4`);

    await runFFmpeg('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=white:s=160x90:d=1',
      '-c:v', 'libx264', '-preset', 'ultrafast', videoInput,
    ], 30000);

    await runFFmpeg('ffmpeg', [
      '-y', '-i', videoInput,
      '-vf', 'hue=h=90:s=1',
      '-c:a', 'copy',
      output,
    ], 30000);

    const exists = await fs.pathExists(output);
    expect(exists).toBe(true);
    const stat = await fs.stat(output);
    expect(stat.size).toBeGreaterThan(0);

    for (const f of [videoInput, output]) {
      await fs.unlink(f).catch(() => {});
    }
  });

  it('should extract a reference frame from video as base64', async () => {
    await fs.ensureDir(path.join(process.cwd(), 'videolar'));
    const { runFFmpeg, extractReferenceFrameAtTime } = await import('./services/videoService.js');
    const videoFile = path.join(process.cwd(), 'uploads', `pipeline_frame_vid_${Date.now()}.mp4`);
    await runFFmpeg('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=red:s=160x90:d=1',
      '-c:v', 'libx264', '-preset', 'ultrafast', videoFile,
    ], 30000);

    const frame = await extractReferenceFrameAtTime(videoFile, 0);
    expect(frame).toBeTruthy();
    expect(typeof frame).toBe('string');
    expect(frame.startsWith('data:image/png;base64,')).toBe(true);

    await fs.unlink(videoFile).catch(() => {});
  });
});

describe('[K-3] Scene CRUD — database scene operations', () => {
  it('should insert scenes and maintain sort order', async () => {
    const jobResult = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 3)`,
      [testUserId, 'Scene CRUD test'],
    );
    const jobId = Number(jobResult.lastID);
    testJobId = jobId;

    for (let i = 1; i <= 3; i++) {
      await db.run(
        `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
        [jobId, i, `Scene ${i} visual`, `Scene ${i} speech`, `Scene ${i} sfx`, 'static', i],
      );
    }

    const scenes = await db.all(
      'SELECT * FROM video_scenes WHERE job_id = $1 ORDER BY sort_order ASC',
      [jobId],
    );
    expect(scenes.length).toBe(3);
    expect(scenes[0].scene_number).toBe(1);
    expect(scenes[1].scene_number).toBe(2);
    expect(scenes[2].scene_number).toBe(3);
    expect(scenes[0].video_prompt).toBe('Scene 1 visual');
    expect(scenes[1].speech_text).toBe('Scene 2 speech');
    expect(scenes[2].sfx_prompt).toBe('Scene 3 sfx');
  });

  it('should reorder scenes by updating sort_order', async () => {
    const jobResult = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 3)`,
      [testUserId, 'Scene reorder test'],
    );
    const jobId = Number(jobResult.lastID);
    testJobId = jobId;

    for (let i = 1; i <= 3; i++) {
      await db.run(
        `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
        [jobId, i, `Scene ${i}`, `Speech ${i}`, `Sfx ${i}`, 'static', i],
      );
    }

    await db.run('UPDATE video_scenes SET sort_order = 3, scene_number = 3 WHERE job_id = $1 AND scene_number = 1', [jobId]);
    await db.run('UPDATE video_scenes SET sort_order = 1, scene_number = 1 WHERE job_id = $1 AND scene_number = 2', [jobId]);
    await db.run('UPDATE video_scenes SET sort_order = 2, scene_number = 2 WHERE job_id = $1 AND scene_number = 3', [jobId]);

    const reordered = await db.all(
      'SELECT scene_number, sort_order, video_prompt FROM video_scenes WHERE job_id = $1 ORDER BY sort_order ASC',
      [jobId],
    );
    expect(reordered.length).toBe(3);
    expect(reordered[0].video_prompt).toBe('Scene 2');
    expect(reordered[1].video_prompt).toBe('Scene 3');
    expect(reordered[2].video_prompt).toBe('Scene 1');
  });

  it('should delete a scene and renumber remaining', async () => {
    const jobResult = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, total_scenes)
       VALUES ($1, $2, 'pending', 3)`,
      [testUserId, 'Scene delete test'],
    );
    const jobId = Number(jobResult.lastID);
    testJobId = jobId;

    for (let i = 1; i <= 3; i++) {
      const result = await db.run(
        `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
        [jobId, i, `Scene ${i}`, '', '', 'static', i],
      );
    }

    await db.run('DELETE FROM video_scenes WHERE job_id = $1 AND sort_order = 2', [jobId]);
    await db.run('UPDATE video_scenes SET scene_number = 1, sort_order = 1 WHERE job_id = $1 AND scene_number = 1', [jobId]);
    await db.run('UPDATE video_scenes SET scene_number = 2, sort_order = 2 WHERE job_id = $1 AND scene_number = 3', [jobId]);

    const remaining = await db.all(
      'SELECT scene_number, sort_order, video_prompt FROM video_scenes WHERE job_id = $1 ORDER BY sort_order ASC',
      [jobId],
    );
    expect(remaining.length).toBe(2);
    expect(remaining[0].video_prompt).toBe('Scene 1');
    expect(remaining[1].video_prompt).toBe('Scene 3');
    expect(remaining[1].scene_number).toBe(2);
  });
});

describe('[K-4] Pipeline Error Handling — resume from failed state', () => {
  it('should reset job from failed to pending via retry logic', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent, completed_scenes, total_scenes, current_stage)
       VALUES ($1, $2, 'failed', 45, 2, 5, 'error_processing_scene_3')`,
      [testUserId, 'Retry recovery test'],
    );
    const jobId = Number(result.lastID);
    testJobId = jobId;

    await db.run(
      `UPDATE video_jobs SET
        status = 'pending',
        current_stage = 'Kuyrukta (Yeniden)',
        progress_percent = 0,
        completed_scenes = 0
       WHERE id = $1`,
      [jobId],
    );

    const recovered = await db.get('SELECT status, progress_percent, completed_scenes FROM video_jobs WHERE id = $1', [jobId]);
    expect(recovered.status).toBe('pending');
    expect(recovered.progress_percent).toBe(0);
    expect(recovered.completed_scenes).toBe(0);
  });

  it('should cancel an active job and verify cancelled state', async () => {
    const result = await db.run(
      `INSERT INTO video_jobs (user_id, master_prompt, status, progress_percent, current_stage)
       VALUES ($1, $2, 'processing', 30, 'generating_scene_2')`,
      [testUserId, 'Cancel test'],
    );
    const jobId = Number(result.lastID);
    testJobId = jobId;

    await db.run(
      `UPDATE video_jobs SET
        status = 'cancelled',
        current_stage = 'Kullanici tarafindan iptal edildi'
       WHERE id = $1`,
      [jobId],
    );

    const cancelled = await db.get('SELECT status, current_stage FROM video_jobs WHERE id = $1', [jobId]);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.current_stage).toBe('Kullanici tarafindan iptal edildi');
  });
});
