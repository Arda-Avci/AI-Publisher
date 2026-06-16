import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SplitLayout } from './services/splitScreen.js';
import { execFile } from 'child_process';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

vi.mock('child_process', () => ({
  execFile: vi.fn((cmd, args, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; }
    cb(null, '1920,1080\n', '');
    return { on: vi.fn(), kill: vi.fn() };
  }),
}));

vi.mock('./services/videoService.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./services/videoService.js')>();
  return {
    ...original,
    runFFmpegWithFallback: vi.fn(async () => {}),
    runFFmpeg: vi.fn(async () => ({ stdout: '', stderr: '' })),
  };
});

// ── Import under test ─────────────────────────────────────────────────────────

import {
  applySplitScreen,
  generateSplitScreenPreview,
  LAYOUT_RATIOS,
} from './services/splitScreen.js';

describe('splitScreen', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── split layouts ───────────────────────────────────────────────────────────

  it('split layouts (50/50, 70/30)', async () => {
    const { runFFmpegWithFallback } = await import('./services/videoService.js');

    // Mock ffprobe to return dimensions
    (execFile as any).mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (typeof opts === 'function') { cb = opts; }
      cb(null, '1920,1080\n', '');
      return { on: vi.fn(), kill: vi.fn() };
    });

    await applySplitScreen(
      'primary.mp4',
      'secondary.mp4',
      'output_50_50.mp4',
      '50/50',
      'top'
    );
    expect(runFFmpegWithFallback).toHaveBeenCalled();

    vi.clearAllMocks();

    await applySplitScreen(
      'primary.mp4',
      'secondary.mp4',
      'output_70_30.mp4',
      '70/30',
      'left'
    );
    expect(runFFmpegWithFallback).toHaveBeenCalled();
  });

  it('split layouts (60/40, 30/70, 40/60)', async () => {
    const { runFFmpegWithFallback } = await import('./services/videoService.js');

    (execFile as any).mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (typeof opts === 'function') { cb = opts; }
      cb(null, '1920,1080\n', '');
      return { on: vi.fn(), kill: vi.fn() };
    });

    for (const layout of ['60/40', '30/70', '40/60'] as SplitLayout[]) {
      vi.clearAllMocks();
      await applySplitScreen('p.mp4', 's.mp4', 'out.mp4', layout, 'top');
      expect(runFFmpegWithFallback).toHaveBeenCalled();
    }
  });

  // ── SplitLayout type validation ─────────────────────────────────────────────

  it('SplitLayout type validation', () => {
    const validLayouts: SplitLayout[] = ['50/50', '70/30', '60/40', '30/70', '40/60'];
    validLayouts.forEach(l => {
      expect(LAYOUT_RATIOS).toHaveProperty(l);
      expect(LAYOUT_RATIOS[l].primaryPct + LAYOUT_RATIOS[l].secondaryPct).toBe(100);
    });
  });

  it('LAYOUT_RATIOS primary/secondary percentages sum to 100', () => {
    Object.entries(LAYOUT_RATIOS).forEach(([, v]: [string, any]) => {
      expect(v.primaryPct + v.secondaryPct).toBe(100);
    });
  });

  // ── generateSplitScreenPreview ──────────────────────────────────────────────

  it('generateSplitScreenPreview returns output path', async () => {
    (execFile as any).mockImplementation((cmd: any, args: any, opts: any, cb: any) => {
      if (typeof opts === 'function') { cb = opts; }
      cb(null, '1920,1080\n', '');
      return { on: vi.fn(), kill: vi.fn() };
    });

    const preview = await generateSplitScreenPreview('p.mp4', 's.mp4', '50/50', 'top');
    expect(typeof preview).toBe('string');
    expect(preview).toContain('.mp4');
  });

  // ── LAYOUT_RATIOS values ────────────────────────────────────────────────────

  it('LAYOUT_RATIOS correct percentages', () => {
    expect(LAYOUT_RATIOS['50/50']).toEqual({ primaryPct: 50, secondaryPct: 50 });
    expect(LAYOUT_RATIOS['70/30']).toEqual({ primaryPct: 70, secondaryPct: 30 });
    expect(LAYOUT_RATIOS['60/40']).toEqual({ primaryPct: 60, secondaryPct: 40 });
    expect(LAYOUT_RATIOS['30/70']).toEqual({ primaryPct: 30, secondaryPct: 70 });
    expect(LAYOUT_RATIOS['40/60']).toEqual({ primaryPct: 40, secondaryPct: 60 });
  });
});
