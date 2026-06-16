import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(true),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.alloc(0)),
    remove: vi.fn().mockResolvedValue(undefined),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(true),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.alloc(0)),
  remove: vi.fn().mockResolvedValue(undefined),
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
    runInWorker: vi.fn(async () => ({ status: 'success', stdout: '', stderr: '' })),
  };
});

// ── Import under test ─────────────────────────────────────────────────────────

import {
  parseColorCommand,
  applyColorGrade,
  generateLUTFromCommand,
  buildHueGrade,
} from './services/colorGrader.js';
import type { ColorGrade } from './services/colorGrader.js';

describe('colorGrader', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── parseColorCommand ───────────────────────────────────────────────────────

  it('parseColorCommand handles Turkish presets', () => {
    const warm = parseColorCommand('sicak sinematik');
    expect(warm.type).toBe('preset');
    expect(warm.preset).toBe('warm');

    const cool = parseColorCommand('soguk tonlar');
    expect(cool.type).toBe('preset');
    expect(cool.preset).toBe('cool');

    const neon = parseColorCommand('neon mor efekt');
    expect(neon.type).toBe('preset');
    expect(neon.preset).toBe('neon');

    const cinematic = parseColorCommand('sinematik gorunum');
    expect(cinematic.type).toBe('preset');
    expect(cinematic.preset).toBe('cinematic');

    const vintage = parseColorCommand('vintage retro');
    expect(vintage.type).toBe('preset');
    expect(vintage.preset).toBe('vintage');

    const desaturated = parseColorCommand('soluk renkler');
    expect(desaturated.type).toBe('preset');
    expect(desaturated.preset).toBe('desaturated');

    const highContrast = parseColorCommand('yuksek kontrast');
    expect(highContrast.type).toBe('preset');
    expect(highContrast.preset).toBe('highContrast');
  });

  it('parseColorCommand handles English presets', () => {
    expect(parseColorCommand('warm tone').preset).toBe('warm');
    expect(parseColorCommand('cool tone').preset).toBe('cool');
    expect(parseColorCommand('cinematic look').preset).toBe('cinematic');
    expect(parseColorCommand('neon purple').preset).toBe('neon');
    expect(parseColorCommand('vintage style').preset).toBe('vintage');
    expect(parseColorCommand('desaturated').preset).toBe('desaturated');
    expect(parseColorCommand('high contrast').preset).toBe('highContrast');
  });

  // ── ColorGrade interface fields ─────────────────────────────────────────────

  it('ColorGrade interface fields are correct', () => {
    const presetGrade: ColorGrade = { type: 'preset', preset: 'cinematic' };
    expect(presetGrade.type).toBe('preset');
    expect(presetGrade.preset).toBe('cinematic');

    const customGrade: ColorGrade = {
      type: 'custom',
      custom: {
        r: 'preserve', g: 'preserve', b: 'preserve',
        brightness: 0.05, contrast: 1.2, saturation: 1.6
      }
    };
    expect(customGrade.type).toBe('custom');
    expect(customGrade.custom?.brightness).toBe(0.05);
    expect(customGrade.custom?.contrast).toBe(1.2);
    expect(customGrade.custom?.saturation).toBe(1.6);
  });

  // ── color preset mapping ────────────────────────────────────────────────────

  it('color preset mapping (7 presets)', () => {
    const presets = [
      { cmd: 'sicak', expected: 'warm' },
      { cmd: 'soguk', expected: 'cool' },
      { cmd: 'sinematik', expected: 'cinematic' },
      { cmd: 'neon', expected: 'neon' },
      { cmd: 'vintage', expected: 'vintage' },
      { cmd: 'soluk', expected: 'desaturated' },
      { cmd: 'yuksek kontrast', expected: 'highContrast' },
    ];

    presets.forEach(({ cmd, expected }) => {
      const result = parseColorCommand(cmd);
      expect(result.type).toBe('preset');
      expect(result.preset).toBe(expected);
    });
  });

  // ── buildHueGrade ───────────────────────────────────────────────────────────

  it('buildHueGrade returns ColorGrade with custom type', () => {
    const purple = buildHueGrade('purple');
    expect(purple.type).toBe('custom');
    expect(purple.custom).toBeDefined();
    expect(purple.custom?.r).toBeDefined();
    expect(purple.custom?.g).toBeDefined();
    expect(purple.custom?.b).toBeDefined();
  });

  it('buildHueGrade maps Turkish hue names', () => {
    const mor = buildHueGrade('purple');
    const mavi = buildHueGrade('blue');
    const yesil = buildHueGrade('green');
    const kirmizi = buildHueGrade('red');
    const sari = buildHueGrade('yellow');
    const turuncu = buildHueGrade('orange');

    [mor, mavi, yesil, kirmizi, sari, turuncu].forEach(g => {
      expect(g.type).toBe('custom');
    });
  });

  // ── applyColorGrade (mocked) ────────────────────────────────────────────────

  it('applyColorGrade throws on invalid type', async () => {
    const invalidGrade = { type: 'lut' } as any;
    await expect(applyColorGrade('in.mp4', invalidGrade, 'out.mp4')).rejects.toThrow();
  });

  it('applyColorGrade preset calls runInWorker', async () => {
    const { runInWorker } = await import('./services/videoService.js');
    const grade: ColorGrade = { type: 'preset', preset: 'cinematic' };
    await applyColorGrade('in.mp4', grade, 'out.mp4');
    expect(runInWorker).toHaveBeenCalled();
  });

  // ── generateLUTFromCommand ───────────────────────────────────────────────────

  it('generateLUTFromCommand returns a path string', async () => {
    const lutPath = await generateLUTFromCommand('sinematik');
    expect(typeof lutPath).toBe('string');
    expect(lutPath).toContain('.cube');
  });

  it('generateLUTFromCommand creates file via fs.writeFile', async () => {
    const fs = await import('fs-extra');
    await generateLUTFromCommand('neon');
    expect(fs.default.writeFile).toHaveBeenCalled();
  });
});
