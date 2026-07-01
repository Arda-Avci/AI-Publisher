import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./lib/ai-provider.js', () => ({
  getAIModelChain: vi.fn(() => [{ modelId: 'test-model' }]),
}));

vi.mock('./lib/ai-utils.js', () => ({
  withFallbackAndRetry: vi.fn((fn) => fn({ modelId: 'test-model' })),
}));

vi.mock('./lib/logger.js', () => ({
  Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from 'ai';
import { analyzeTemporalSync } from './services/agents/temporalSync.js';

describe('temporalSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('analyzeTemporalSync successfully parses linear timeline', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        events: [
          {
            sceneNumber: 1,
            timeJumpDetected: false,
            timeJumpDuration: 'none',
            temporalType: 'linear',
            requiresTransitionShot: false,
            timeOfDayAdjustment: 'Bright noon sun',
            colorGradeHint: 'Natural tones',
          },
          {
            sceneNumber: 2,
            timeJumpDetected: false,
            timeJumpDuration: 'none',
            temporalType: 'linear',
            requiresTransitionShot: false,
            timeOfDayAdjustment: 'Bright noon sun, continuation',
            colorGradeHint: 'Natural tones',
          },
        ],
        timelineExplanation: 'A fully linear timeline with no jumps.',
      },
    } as any);

    const scenes = [
      { sceneNumber: 1, location: 'Office', timeOfDay: 'DAY', summary: 'Alice walks in.' },
      { sceneNumber: 2, location: 'Office', timeOfDay: 'DAY', summary: 'Alice sits down.' },
    ];

    const result = await analyzeTemporalSync(scenes);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.temporalType).toBe('linear');
    expect(result.events[1]?.timeJumpDetected).toBe(false);
    expect(result.timelineExplanation).toBe('A fully linear timeline with no jumps.');
  });

  it('analyzeTemporalSync detects flashback and ellipsis', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        events: [
          {
            sceneNumber: 1,
            timeJumpDetected: false,
            timeJumpDuration: 'none',
            temporalType: 'linear',
            requiresTransitionShot: false,
            timeOfDayAdjustment: 'Golden hour sunset',
            colorGradeHint: 'Warm film grade',
          },
          {
            sceneNumber: 2,
            timeJumpDetected: true,
            timeJumpDuration: '10 years ago',
            temporalType: 'flashback',
            requiresTransitionShot: true,
            transitionShotPrompt: 'Camera zooms into a vintage pocket watch spinning counter-clockwise',
            timeOfDayAdjustment: 'Hazy morning sun, dreamlike quality',
            colorGradeHint: 'Desaturated sepia vintage look',
          },
        ],
        timelineExplanation: 'The timeline transitions from present day to a flashback of 10 years ago.',
      },
    } as any);

    const scenes = [
      { sceneNumber: 1, location: 'Café', timeOfDay: 'SUNSET', summary: 'Bob drinks tea.' },
      { sceneNumber: 2, location: 'School', timeOfDay: 'MORNING', summary: 'Young Bob plays.' },
    ];

    const result = await analyzeTemporalSync(scenes);
    expect(result.events[1]?.temporalType).toBe('flashback');
    expect(result.events[1]?.requiresTransitionShot).toBe(true);
    expect(result.events[1]?.transitionShotPrompt).toContain('watch');
    expect(result.events[1]?.colorGradeHint).toBe('Desaturated sepia vintage look');
  });
});
