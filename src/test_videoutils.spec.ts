import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import { FIXTURES } from './__fixtures__/index.js';

import {
  getVideoDuration,
  concatVideosWithCrossfade,
  convertSrtToKineticAss,
  extractLastFrame,
  applyEndScreen,
  getGridCoordinates,
  generateEndScreenImage,
} from './services/videoService.js';

const outputPath = () => path.join(os.tmpdir(), `test_videoutils_${Date.now()}.mp4`);

describe('videoService utilities', () => {
  it('getVideoDuration returns number', async () => {
    const dur = await getVideoDuration(FIXTURES.video);
    expect(typeof dur).toBe('number');
    expect(dur).toBeGreaterThan(0);
  }, 30000);

  it('getVideoDuration returns 0 for invalid path', async () => {
    const dur = await getVideoDuration('nonexistent.mp4');
    expect(dur).toBe(0);
  }, 30000);

  it('extractLastFrame creates output file', async () => {
    const frame = await extractLastFrame(FIXTURES.video);
    expect(typeof frame).toBe('string');
  }, 30000);

  it('applyEndScreen produces output', async () => {
    const tempEndScreen = path.join(os.tmpdir(), `endscreen_${Date.now()}.png`);
    await generateEndScreenImage(null, tempEndScreen, true);
    try {
      await expect(
        applyEndScreen(FIXTURES.video, tempEndScreen, outputPath(), true),
      ).resolves.toBeUndefined();
    } finally {
      const fs = await import('fs-extra');
      await fs.remove(tempEndScreen);
    }
  }, 30000);

  it('concatVideosWithCrossfade with 2 segments', async () => {
    await expect(
      concatVideosWithCrossfade([FIXTURES.seg1, FIXTURES.seg2], outputPath(), 1.0),
    ).resolves.toBeUndefined();
  }, 30000);

  it('concatVideosWithCrossfade handles empty array', async () => {
    await expect(
      concatVideosWithCrossfade([], outputPath()),
    ).rejects.toThrow('Video listesi bos');
  }, 30000);

  it('convertSrtToKineticAss creates ASS file', async () => {
    const assPath = path.join(os.tmpdir(), `test_${Date.now()}.ass`);
    await convertSrtToKineticAss(FIXTURES.srt, assPath);

    const fs = await import('fs-extra');
    const content = await fs.readFile(assPath, 'utf-8');
    expect(content).toContain('[Script Info]');
    expect(content).toContain('Kinetic Subtitles');
    expect(content).toContain('Dialogue:');
  }, 30000);

  it('getGridCoordinates returns {x, y}', () => {
    const coords = getGridCoordinates('top_right', 1920, 1080, 300, 150);
    expect(coords).toHaveProperty('x');
    expect(coords).toHaveProperty('y');
    expect(coords.x).toBeLessThan(1920);
  });
});
