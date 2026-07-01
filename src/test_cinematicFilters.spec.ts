import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import {
  applyFlashbackEffect,
  applyMatchCut,
  applyFadeToBlack,
  applyDeadSilence,
} from './services/videoService.js';

describe('cinematicFilters', () => {
  const fixturesDir = path.join(process.cwd(), 'src', '__fixtures__');
  const tempDir = path.join(process.cwd(), 'tmp', `cinematic_test_${Date.now()}`);

  const inputVideo = path.join(fixturesDir, 'input_exists.mp4');

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('applyFlashbackEffect processes video with sepia and vignette', async () => {
    const output = path.join(tempDir, 'flashback_output.mp4');
    const result = await applyFlashbackEffect(inputVideo, output);
    expect(result).toBe(output);
    expect(await fs.pathExists(output)).toBe(true);
    const stat = await fs.stat(output);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('applyFadeToBlack processes video with fade effect', async () => {
    const output = path.join(tempDir, 'fade_output.mp4');
    const result = await applyFadeToBlack(inputVideo, 0, 0.5, output);
    expect(result).toBe(output);
    expect(await fs.pathExists(output)).toBe(true);
    const stat = await fs.stat(output);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('applyDeadSilence silences audio stream partially', async () => {
    const output = path.join(tempDir, 'silence_output.mp4');
    const result = await applyDeadSilence(inputVideo, 0, 0.5, output);
    expect(result).toBe(output);
    expect(await fs.pathExists(output)).toBe(true);
    const stat = await fs.stat(output);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('applyMatchCut visual merges two clips', async () => {
    const output = path.join(tempDir, 'matchcut_v_output.mp4');
    const result = await applyMatchCut(inputVideo, inputVideo, output, 'visual');
    expect(result).toBe(output);
    expect(await fs.pathExists(output)).toBe(true);
    const stat = await fs.stat(output);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('applyMatchCut audio merges two clips with audio crossfade', async () => {
    const output = path.join(tempDir, 'matchcut_a_output.mp4');
    const result = await applyMatchCut(inputVideo, inputVideo, output, 'audio');
    expect(result).toBe(output);
    expect(await fs.pathExists(output)).toBe(true);
    const stat = await fs.stat(output);
    expect(stat.size).toBeGreaterThan(0);
  });
});
