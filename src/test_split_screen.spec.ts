import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import { FIXTURES } from './__fixtures__/index.js';
import type { SplitLayout } from './services/splitScreen.js';

import {
  applySplitScreen,
  generateSplitScreenPreview,
  LAYOUT_RATIOS,
} from './services/splitScreen.js';

const outputPath = () => path.join(os.tmpdir(), `test_split_${Date.now()}.mp4`);
const previewPath = () => path.join(os.tmpdir(), `test_preview_${Date.now()}.mp4`);

describe('splitScreen', () => {
  it('split layouts (50/50, 70/30)', async () => {
    await expect(
      applySplitScreen(FIXTURES.primary, FIXTURES.secondary, outputPath(), '50/50', 'top'),
    ).resolves.toBeUndefined();

    await expect(
      applySplitScreen(FIXTURES.primary, FIXTURES.secondary, outputPath(), '70/30', 'left'),
    ).resolves.toBeUndefined();
  }, 120000);

  it('split layouts (60/40, 30/70, 40/60)', async () => {
    for (const layout of ['60/40', '30/70', '40/60'] as SplitLayout[]) {
      await expect(
        applySplitScreen(FIXTURES.primary, FIXTURES.secondary, outputPath(), layout, 'top'),
      ).resolves.toBeUndefined();
    }
  }, 120000);

  it('SplitLayout type validation', () => {
    const validLayouts: SplitLayout[] = ['50/50', '70/30', '60/40', '30/70', '40/60'];
    validLayouts.forEach((l) => {
      expect(LAYOUT_RATIOS).toHaveProperty(l);
      expect(LAYOUT_RATIOS[l].primaryPct + LAYOUT_RATIOS[l].secondaryPct).toBe(100);
    });
  });

  it('LAYOUT_RATIOS primary/secondary percentages sum to 100', () => {
    Object.entries(LAYOUT_RATIOS).forEach(([, v]: [string, any]) => {
      expect(v.primaryPct + v.secondaryPct).toBe(100);
    });
  });

  it('generateSplitScreenPreview returns output path', async () => {
    const preview = await generateSplitScreenPreview(
      FIXTURES.primary,
      FIXTURES.secondary,
      '50/50',
      'top',
    );
    expect(typeof preview).toBe('string');
    expect(preview).toContain('.mp4');
  }, 120000);

  it('LAYOUT_RATIOS correct percentages', () => {
    expect(LAYOUT_RATIOS['50/50']).toEqual({ primaryPct: 50, secondaryPct: 50 });
    expect(LAYOUT_RATIOS['70/30']).toEqual({ primaryPct: 70, secondaryPct: 30 });
    expect(LAYOUT_RATIOS['60/40']).toEqual({ primaryPct: 60, secondaryPct: 40 });
    expect(LAYOUT_RATIOS['30/70']).toEqual({ primaryPct: 30, secondaryPct: 70 });
    expect(LAYOUT_RATIOS['40/60']).toEqual({ primaryPct: 40, secondaryPct: 60 });
  });
});
