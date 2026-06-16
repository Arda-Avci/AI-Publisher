import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { execFile } from 'child_process';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.alloc(0)),
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockImplementation((p: string) => Promise.resolve(p.includes('_exists'))),
    existsSync: vi.fn().mockImplementation((p: string) => p.includes('_exists')),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.alloc(0)),
  remove: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockImplementation((p: string) => Promise.resolve(p.includes('_exists'))),
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

vi.mock('child_process', () => ({
  execFile: vi.fn((cmd, args, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; }
    const argsStr = args ? args.join(' ') : '';
    
    // ffprobe video dimensions
    if (cmd === 'ffprobe' && argsStr.includes('stream=width,height')) {
      cb(null, '1920x1080\n', '');
      return { on: vi.fn(), kill: vi.fn() };
    }
    
    // ffprobe duration
    if (cmd === 'ffprobe' && argsStr.includes('format=duration')) {
      const videoPath = args[args.length - 1];
      if (videoPath === 'nonexistent.mp4') {
        cb(null, 'invalid\n', '');
      } else if (videoPath.includes('seg1')) {
        cb(null, '10.0\n', '');
      } else if (videoPath.includes('seg2')) {
        cb(null, '10.0\n', '');
      } else {
        cb(null, '30.5\n', '');
      }
      return { on: vi.fn(), kill: vi.fn() };
    }
    
    // Default success for ffmpeg
    cb(null, '', '');
    return { on: vi.fn(), kill: vi.fn() };
  }),
}));

// ── Import under test ─────────────────────────────────────────────────────────

import {
  getVideoDuration,
  concatVideosWithCrossfade,
  convertSrtToKineticAss,
  extractLastFrame,
  applyEndScreen,
  getGridCoordinates,
} from './services/videoService.js';

describe('videoService utilities', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── getVideoDuration ───────────────────────────────────────────────────────

  it('getVideoDuration returns number', async () => {
    const dur = await getVideoDuration('test_video_exists.mp4');
    expect(typeof dur).toBe('number');
    expect(dur).toBe(30.5);
  });

  it('getVideoDuration returns 0 for invalid path', async () => {
    const dur = await getVideoDuration('nonexistent.mp4');
    expect(dur).toBe(0);
  });

  // ── extractLastFrame ────────────────────────────────────────────────────────

  it('extractLastFrame creates output file', async () => {
    const frame = await extractLastFrame('test_video_exists.mp4');
    expect(typeof frame).toBe('string');
  });

  // ── applyEndScreen ─────────────────────────────────────────────────────────

  it('applyEndScreen produces output', async () => {
    await applyEndScreen(
      'test_video_exists.mp4',
      'endscreen.png_exists',
      'output.mp4',
      true
    );
    expect(execFile).toHaveBeenCalled();
  });

  // ── concatVideosWithCrossfade ───────────────────────────────────────────────

  it('concatVideosWithCrossfade with 2 segments', async () => {
    await concatVideosWithCrossfade(
      ['seg1.mp4_exists', 'seg2.mp4_exists'],
      'output.mp4',
      1.0
    );
    expect(execFile).toHaveBeenCalled();
  });

  it('concatVideosWithCrossfade handles empty array', async () => {
    await expect(
      concatVideosWithCrossfade([], 'output.mp4')
    ).rejects.toThrow('Video listesi bos');
  });

  // ── convertSrtToKineticAss ──────────────────────────────────────────────────
 
  it('convertSrtToKineticAss creates ASS file', async () => {
    const srtContent = `1
00:00:00,000 --> 00:00:02,000
Hello world test

2
00:00:02,000 --> 00:00:04,000
Goodbye world
`;
    const srtPath = path.join(process.cwd(), 'uploads', `test_${Date.now()}.srt`);
    const assPath = srtPath.replace('.srt', '.ass');
 
    const fsExtra = await import('fs-extra');
    vi.mocked(fsExtra.readFile).mockResolvedValue(srtContent as any);
    vi.mocked(fsExtra.default.readFile).mockResolvedValue(srtContent as any);
    vi.mocked(fsExtra.writeFile).mockResolvedValue(undefined);
    vi.mocked(fsExtra.default.writeFile).mockResolvedValue(undefined);
    vi.mocked(fsExtra.pathExists).mockResolvedValue(true as any);
    vi.mocked(fsExtra.default.pathExists).mockResolvedValue(true as any);
    vi.mocked(fsExtra.remove).mockResolvedValue(undefined);
    vi.mocked(fsExtra.default.remove).mockResolvedValue(undefined);
 
    await convertSrtToKineticAss(srtPath, assPath);
    expect(fsExtra.default.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(fsExtra.default.writeFile).mock.calls;
    const assContent = calls[calls.length - 1][1];
    expect(assContent).toContain('[Script Info]');
    expect(assContent).toContain('Kinetic Subtitles');
    expect(assContent).toContain('Dialogue:');
  });

  // ── getGridCoordinates ──────────────────────────────────────────────────────

  it('getGridCoordinates returns {x, y}', () => {
    const coords = getGridCoordinates('top_right', 1920, 1080, 300, 150);
    expect(coords).toHaveProperty('x');
    expect(coords).toHaveProperty('y');
    expect(coords.x).toBeLessThan(1920);
  });
});
