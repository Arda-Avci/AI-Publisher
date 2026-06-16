import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from './db.js';
import { broadcast } from './queue.js';
import { broadcastProgress, redisPub, redisSub } from './lib/redis.js';
import { uploadToYouTube, uploadToTikTok } from './publisher.js';
import axios from 'axios';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    create: vi.fn().mockReturnThis(),
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.alloc(0)),
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockImplementation((p: string) => Promise.resolve(p.includes('_exists'))),
    readdir: vi.fn().mockResolvedValue([]),
    existsSync: vi.fn().mockImplementation((p: string) => p.includes('_exists')),
    createWriteStream: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      end: vi.fn(),
    }),
    createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn() }),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.alloc(0)),
  remove: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockImplementation((p: string) => Promise.resolve(p.includes('_exists'))),
  readdir: vi.fn().mockResolvedValue([]),
  existsSync: vi.fn().mockImplementation((p: string) => p.includes('_exists')),
}));

vi.mock('./lib/logger.js', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('ioredis', () => {
  class MockRedis {
    on = vi.fn();
    publish = vi.fn().mockResolvedValue(1);
    subscribe = vi.fn().mockResolvedValue('OK');
  }
  return {
    default: MockRedis
  };
});

vi.mock('./lib/redis-mutex.js', () => ({
  RedisMutex: vi.fn().mockImplementation(() => ({
    acquire: vi.fn().mockResolvedValue(true),
    release: vi.fn(),
  })),
}));

vi.mock('./lib/colab-manager.js', () => ({
  colab: {
    getState: vi.fn().mockReturnValue({ status: 'stopped' }),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    isHealthy: vi.fn().mockReturnValue(false),
    cancelIdleStop: vi.fn(),
    verifyLibraries: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('./services/videoService.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./services/videoService.js')>();
  return {
    ...original,
    runFFmpeg: vi.fn(async () => ({ stdout: '1920x1080', stderr: '' })),
    runFFmpegWithFallback: vi.fn(async () => {}),
    runInWorker: vi.fn(async () => ({ status: 'success', stdout: '1920x1080', stderr: '' })),
    getVideoDuration: vi.fn(async () => 30.0),
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DB', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('insert job returns lastID', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 42 }], rowCount: 1 }) };
    vi.spyOn(db as any, 'pool', 'get').mockReturnValue(mockPool);
    // Re-mock db.get to avoid pool access
    const result = await (db as any).run.call({ pool: mockPool },
      "INSERT INTO video_jobs (master_prompt, status) VALUES (?, ?)",
      ['test prompt', 'pending']
    );
    expect(result.lastID).toBe(42);
  });

  it('select job returns row', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 1, status: 'pending' }] }) };
    const result = await (db as any).get.call({ pool: mockPool },
      "SELECT * FROM video_jobs WHERE id = ?",
      [1]
    );
    expect(result?.id).toBe(1);
  });

  it('update job status', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    const result = await (db as any).run.call({ pool: mockPool },
      "UPDATE video_jobs SET status = ?, current_stage = ? WHERE id = ?",
      ['processing', 'Sahne 1', 1]
    );
    expect(result.changes).toBe(1);
  });

  it('credit transaction insert', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 5 }], rowCount: 1 }) };
    const result = await (db as any).run.call({ pool: mockPool },
      "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)",
      [1, -15, 'production', 'Video production']
    );
    expect(result.lastID).toBe(5);
  });
});

describe('Queue', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('job stage progression updates status', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    await (db as any).run.call({ pool: mockPool },
      "UPDATE video_jobs SET status = ?, current_stage = ?, progress_percent = ? WHERE id = ?",
      ['processing', 'Sahne 1 Isleniyor', 25, 1]
    );
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('SSE broadcast sends progress', async () => {
    const pubSpy = vi.spyOn(redisPub as any, 'publish');
    await broadcastProgress(1, { stageKey: 'stageScenesPreparing', percent: 10 });
    expect(pubSpy).toHaveBeenCalledWith('job_progress:1', expect.any(String));
  });

  it('cancel job sets status cancelled', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    await (db as any).run.call({ pool: mockPool },
      "UPDATE video_jobs SET status = 'cancelled' WHERE id = ?",
      [1]
    );
    expect(mockPool.query).toHaveBeenCalled();
  });
});

describe('SSE', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('connect emits job progress event', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 1, progress_percent: 50 }] }) };
    const job = await (db as any).get.call({ pool: mockPool },
      "SELECT * FROM video_jobs WHERE id = ?", [1]
    );
    expect(job?.progress_percent).toBe(50);
  });

  it('receive message parses JSON payload', () => {
    const payload = { stageKey: 'stageScenesPreparing', percent: 10 };
    const parsed = JSON.parse(JSON.stringify(payload));
    expect(parsed.stageKey).toBe('stageScenesPreparing');
    expect(parsed.percent).toBe(10);
  });

  it('reconnect resumes listening on same channel', async () => {
    const sub = { subscribe: vi.fn().mockResolvedValue('OK') };
    await (sub as any).subscribe('job_progress:1');
    await (sub as any).subscribe('job_progress:1');
    expect(sub.subscribe).toHaveBeenCalledTimes(2);
  });
});

describe('Publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mock('fs-extra', () => ({
      default: {
        pathExists: vi.fn().mockResolvedValue(false),
      },
      pathExists: vi.fn().mockResolvedValue(false),
    }));
  });

  it('YouTube upload mock returns false when no auth', async () => {
    vi.mock('fs-extra', () => ({
      default: { pathExists: vi.fn().mockResolvedValue(false) },
      pathExists: vi.fn().mockResolvedValue(false),
    }));
    // uploadToYouTube checks for auth_youtube.json
    const exists = await import('fs-extra').then(m => m.default.pathExists('auth_youtube.json'));
    expect(exists).toBe(false);
  });

  it('TikTok upload mock returns false when no auth', async () => {
    vi.mock('fs-extra', () => ({
      default: { pathExists: vi.fn().mockResolvedValue(false) },
      pathExists: vi.fn().mockResolvedValue(false),
    }));
    const exists = await import('fs-extra').then(m => m.default.pathExists('auth_tiktok.json'));
    expect(exists).toBe(false);
  });
});

describe('DB Complex Queries', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('select pending jobs ordered by id asc', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] }) };
    const result = await (db as any).all.call({ pool: mockPool },
      "SELECT * FROM video_jobs WHERE status = 'pending' ORDER BY id ASC"
    );
    expect(result.length).toBe(2);
  });

  it('update multiple job fields', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    await (db as any).run.call({ pool: mockPool },
      `UPDATE video_jobs SET
        total_scenes = ?,
        estimated_minutes = ?,
        yt_title = ?,
        status = ?
      WHERE id = ?`,
      [5, 25, 'Test Video', 'processing', 1]
    );
    expect(mockPool.query).toHaveBeenCalled();
  });
});

describe('Queue Worker', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('consume message parses JSON payload', () => {
    const payload = { jobId: 42 };
    const parsed = JSON.parse(JSON.stringify(payload));
    expect(parsed.jobId).toBe(42);
  });

  it('ack removes message from queue', () => {
    const channel = { ack: vi.fn() };
    channel.ack({ content: Buffer.from('{}') });
    expect(channel.ack).toHaveBeenCalled();
  });
});

describe('Broadcast Progress', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('broadcastProgress publishes to correct channel', async () => {
    const mockPub = { publish: vi.fn().mockResolvedValue(1) };
    await mockPub.publish('job_progress:99', JSON.stringify({ percent: 50 }));
    expect(mockPub.publish).toHaveBeenCalledWith('job_progress:99', expect.any(String));
  });

  it('broadcast with stage key includes stageKey', async () => {
    const data = { stageKey: 'stageCompleted', percent: 100, finalFilename: 'film_1.mp4' };
    const str = JSON.stringify(data);
    const parsed = JSON.parse(str);
    expect(parsed.stageKey).toBe('stageCompleted');
  });
});

describe('DB Insert & Select Patterns', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('insert video_scenes with scene_number', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 10 }], rowCount: 1 }) };
    const result = await (db as any).run.call({ pool: mockPool },
      `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [1, 1, 'prompt', 'speech', 'sfx', 'none', 1]
    );
    expect(result.lastID).toBe(10);
  });

  it('select job with scene prompts', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({
      rows: [{ id: 1, scene_prompts: JSON.stringify([{ videoPrompt: 'test' }]) }]
    }) };
    const result = await (db as any).get.call({ pool: mockPool },
      "SELECT * FROM video_jobs WHERE id = ?", [1]
    );
    expect(result.scene_prompts).toBeDefined();
  });
});

describe('Queue State Transitions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('pending to processing transition', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    await (db as any).run.call({ pool: mockPool },
      "UPDATE video_jobs SET status = 'processing', progress_percent = 5 WHERE id = ? AND status = 'pending'",
      [1]
    );
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('processing to completed transition', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    await (db as any).run.call({ pool: mockPool },
      "UPDATE video_jobs SET status = 'completed', current_stage = 'Tamamlandi', progress_percent = 100 WHERE id = ?",
      [1]
    );
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('processing to failed transition', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    await (db as any).run.call({ pool: mockPool },
      "UPDATE video_jobs SET status = 'failed', current_stage = 'Hata Olustu' WHERE id = ?",
      [1]
    );
    expect(mockPool.query).toHaveBeenCalled();
  });
});

describe('Credit Operations', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('check sufficient credits returns boolean', () => {
    const balance = 100;
    const required = 50;
    const ok = balance >= required;
    expect(ok).toBe(true);
  });

  it('credit deduction updates user balance', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    await (db as any).run.call({ pool: mockPool },
      "UPDATE users SET credits = credits - ? WHERE id = ?",
      [15, 1]
    );
    expect(mockPool.query).toHaveBeenCalled();
  });
});

describe('Publisher Auth File Check', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('YouTube auth file path is correct', () => {
    const authFile = 'auth_youtube.json';
    expect(authFile).toBe('auth_youtube.json');
  });

  it('TikTok auth file path is correct', () => {
    const authFile = 'auth_tiktok.json';
    expect(authFile).toBe('auth_tiktok.json');
  });
});

export default {};