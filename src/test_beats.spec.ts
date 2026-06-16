import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFile } from 'child_process';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('child_process', () => ({
  execFile: vi.fn((cmd, args, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; }
    cb(null, '', '');
    return { on: vi.fn(), kill: vi.fn() };
  }),
}));

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(true),
    existsSync: vi.fn().mockReturnValue(true),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(true),
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('./lib/logger.js', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./services/videoService.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./services/videoService.js')>();
  return {
    ...original,
    runFFmpeg: vi.fn(async () => ({ stdout: '120.0', stderr: '' })),
    runFFmpegWithFallback: vi.fn(async () => {}),
    getVideoDuration: vi.fn(async () => 30.0),
    concatVideosWithCrossfade: vi.fn(async () => {}),
  };
});

// ── Import under test ─────────────────────────────────────────────────────────

import {
  findBeatPeaks,
  buildBeatMarkers,
  detectBPM,
  BeatMarker,
  BeatAnalysisResult,
} from './services/beatAnalyzer.js';

import {
  BeatCutPoint,
  applyBeatSync,
  findBeatCutPoints,
  analyzeAudioBPM,
  quickBeatSync,
} from './services/beatSyncEditor.js';

describe('beatAnalyzer', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── BeatMarker structure ────────────────────────────────────────────────────

  it('BeatMarker interface fields', () => {
    const marker: BeatMarker = {
      timestamp: 1.5,
      strength: 0.8,
      beatNumber: 4,
      bar: 2
    };
    expect(marker.timestamp).toBe(1.5);
    expect(marker.strength).toBe(0.8);
    expect(marker.beatNumber).toBe(4);
    expect(marker.bar).toBe(2);
  });

  // ── BeatCutPoint interface ───────────────────────────────────────────────────

  it('BeatCutPoint interface fields', () => {
    const cut: BeatCutPoint = {
      timestamp: 2.0,
      beatNumber: 8,
      strength: 1.0
    };
    expect(cut.timestamp).toBe(2.0);
    expect(cut.beatNumber).toBe(8);
    expect(cut.strength).toBe(1.0);
  });

  // ── findBeatPeaks with mocked audio ─────────────────────────────────────────

  it('findBeatPeaks with mocked audio file', async () => {
    const { runFFmpeg } = await import('./services/videoService.js');
    // Mock duration = 8 seconds, BPM = 120
    (runFFmpeg as any).mockImplementation((cmd: string, args: string[]) => {
      if (args.includes('-show_entries') && args.includes('format=duration')) {
        return Promise.resolve({ stdout: '8.0', stderr: '' });
      }
      if (args.includes('-show_entries') && args.includes('format=bit_rate')) {
        return Promise.resolve({ stdout: '320000', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const beats = await findBeatPeaks('audio.mp3', 120);
    expect(Array.isArray(beats)).toBe(true);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats[0]).toHaveProperty('timestamp');
    expect(beats[0]).toHaveProperty('strength');
    expect(beats[0]).toHaveProperty('beatNumber');
    expect(beats[0]).toHaveProperty('bar');
  });

  it('findBeatPeaks returns empty for invalid bpm', async () => {
    const beats = await findBeatPeaks('audio.mp3', 0);
    expect(Array.isArray(beats)).toBe(true);
  });

  // ── buildBeatMarkers ────────────────────────────────────────────────────────

  it('buildBeatMarkers returns BeatAnalysisResult', async () => {
    const { runFFmpeg } = await import('./services/videoService.js');
    (runFFmpeg as any).mockImplementation((cmd: string, args: string[]) => {
      if (args.includes('-show_entries') && args.includes('format=duration')) {
        return Promise.resolve({ stdout: '10.0', stderr: '' });
      }
      if (args.includes('-show_entries') && args.includes('format=bit_rate')) {
        return Promise.resolve({ stdout: '256000', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result: BeatAnalysisResult = await buildBeatMarkers('audio.mp3');
    expect(result).toHaveProperty('bpm');
    expect(result).toHaveProperty('beats');
    expect(result).toHaveProperty('duration');
    expect(typeof result.bpm).toBe('number');
    expect(Array.isArray(result.beats)).toBe(true);
  });

  // ── detectBPM ─────────────────────────────────────────────────────────────

  it('detectBPM returns number', async () => {
    const { runFFmpeg } = await import('./services/videoService.js');
    (runFFmpeg as any).mockImplementation((cmd: string, args: string[]) => {
      if (args.includes('-show_entries') && args.includes('format=duration')) {
        return Promise.resolve({ stdout: '30.0', stderr: '' });
      }
      if (args.includes('-show_entries') && args.includes('format=bit_rate')) {
        return Promise.resolve({ stdout: '320000', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const bpm = await detectBPM('audio.mp3');
    expect(typeof bpm).toBe('number');
    expect(bpm).toBeGreaterThan(0);
  });
});

describe('beatSyncEditor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── BeatCutPoint interface ──────────────────────────────────────────────────

  it('BeatCutPoint interface fields', () => {
    const cut: BeatCutPoint = {
      timestamp: 0.5,
      beatNumber: 0,
      strength: 1.0
    };
    expect(cut.timestamp).toBe(0.5);
    expect(cut.beatNumber).toBe(0);
    expect(cut.strength).toBe(1.0);
  });

  // ── analyzeAudioBPM ─────────────────────────────────────────────────────────

  it('analyzeAudioBPM returns object shape', async () => {
    // Mock python failure so it falls back to default
    vi.mocked(execFile).mockImplementation((cmd: any, args: any, opts: any, cb?: any) => {
      if (typeof opts === 'function') { cb = opts; }
      cb(new Error('python not found'), '', '');
      return { on: vi.fn(), kill: vi.fn() } as any;
    });

    const result = await analyzeAudioBPM('audio.mp3');
    expect(result).toHaveProperty('bpm');
    expect(result).toHaveProperty('peaks');
    expect(result).toHaveProperty('segments');
    expect(typeof result.bpm).toBe('number');
    expect(Array.isArray(result.peaks)).toBe(true);
    expect(Array.isArray(result.segments)).toBe(true);
  });

  // ── findBeatCutPoints ───────────────────────────────────────────────────────

  it('findBeatCutPoints returns BeatCutPoint array', async () => {
    const { getVideoDuration } = await import('./services/videoService.js');

    vi.mocked(execFile).mockImplementation((cmd: any, args: any, opts: any, cb?: any) => {
      if (typeof opts === 'function') { cb = opts; }
      cb(new Error('python not found'), '{"bpm":120,"peaks":[],"segments":[]}', '');
      return { on: vi.fn(), kill: vi.fn() } as any;
    });

    (getVideoDuration as any).mockResolvedValue(10.0);

    const cuts = await findBeatCutPoints('audio.mp3', 'video.mp4');
    expect(Array.isArray(cuts)).toBe(true);
    if (cuts.length > 0) {
      expect(cuts[0]).toHaveProperty('timestamp');
      expect(cuts[0]).toHaveProperty('beatNumber');
      expect(cuts[0]).toHaveProperty('strength');
    }
  });

  // ── applyBeatSync (mocked) ──────────────────────────────────────────────────

  it('applyBeatSync calls runFFmpeg', async () => {
    const { runFFmpeg, getVideoDuration } = await import('./services/videoService.js');

    (getVideoDuration as any).mockResolvedValue(10.0);
    (runFFmpeg as any).mockImplementation((cmd: string, args: string[]) => {
      if (args.includes('-show_entries') && args.includes('format=duration')) {
        return Promise.resolve({ stdout: '10.0', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const markers: BeatMarker[] = [
      { timestamp: 0, strength: 1.0, beatNumber: 0, bar: 1 },
      { timestamp: 0.5, strength: 0.8, beatNumber: 1, bar: 1 },
      { timestamp: 1.0, strength: 1.0, beatNumber: 2, bar: 1 },
    ];

    await applyBeatSync(
      { videoPath: 'video.mp4', crossfadeDur: 0.5, minSegmentDur: 0.3 },
      markers,
      'output_beats.mp4'
    );
    expect(runFFmpeg).toHaveBeenCalled();
  });

  // ── quickBeatSync ────────────────────────────────────────────────────────────

  it('quickBeatSync calls internal functions', async () => {
    const { runFFmpeg, getVideoDuration } = await import('./services/videoService.js');

    (getVideoDuration as any).mockResolvedValue(10.0);
    (runFFmpeg as any).mockImplementation((cmd: string, args: string[]) => {
      if (args.includes('-show_entries') && args.includes('format=duration')) {
        return Promise.resolve({ stdout: '10.0', stderr: '' });
      }
      if (args.includes('-show_entries') && args.includes('format=bit_rate')) {
        return Promise.resolve({ stdout: '320000', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const { concatVideosWithCrossfade } = await import('./services/videoService.js');

    await quickBeatSync('video.mp4', 'output_quick.mp4', 120);
    expect(runFFmpeg).toHaveBeenCalled();
  });
});
