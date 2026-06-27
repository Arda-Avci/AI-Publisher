import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./lib/ai-provider.js', () => ({
  getAIModelChain: vi.fn(() => [{ modelId: 'test-model' }]),
}));

vi.mock('./lib/ai-utils.js', () => ({
  withFallbackAndRetry: vi.fn((fn) =>
    fn({ modelId: 'test-model' }),
  ),
}));

vi.mock('./lib/logger.js', () => ({
  Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from 'ai';
import { createPostProductionPlan } from './services/agents/postProductionAgent.js';
import { planSoundDesign } from './services/agents/soundDesigner.js';

const mockScenes = [
  'A man wakes up in a dark room with no memory',
  'He finds a photograph on the nightstand',
  'A knock on the door reveals a stranger with answers',
];

describe('postProductionAgent', () => {
  beforeEach(() => {
    vi.mocked(generateObject).mockReset();
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: {
          scenes: [
            { index: 1, summary: 'Waking up in dark room', idealDurationSec: 15, pacingLabel: 'slow', emotionalArc: 'falling' },
            { index: 2, summary: 'Finding photograph', idealDurationSec: 12, pacingLabel: 'medium', emotionalArc: 'rising' },
            { index: 3, summary: 'Knock on door', idealDurationSec: 20, pacingLabel: 'fast', emotionalArc: 'climax' },
          ],
        },
      } as any)
      .mockResolvedValueOnce({
        object: {
          rough: {
            sceneOrder: [1, 2, 3],
            transitionNotes: ['Fade in from black', 'Match cut on photograph', 'Smash cut to door'],
            tempAudioSuggestions: ['Dark ambient drone', 'Soft piano', 'Tension strings'],
            structuralNotes: ['Add establishing shot'],
          },
          fine: {
            trimAdjustments: [
              { sceneIndex: 1, newDurationSec: 12, reason: 'Tighten waking sequence' },
            ],
            pacingNotes: ['Scene 2 needs more breathing room'],
            transitionRefinements: [
              { at: 1, technique: 'J-cut', description: 'Audio of knock starts before cut' },
            ],
          },
          pictureLock: {
            colorGradeDirection: 'Cool teal shadows with warm skin tones',
            soundMixNotes: ['Dialogue clear at -12dB', 'Ambience at -24dB'],
            vfxNotes: ['Remove microphone shadow in scene 1'],
            deliveryFormat: '4K DCI 24fps ProRes 422 HQ',
          },
          recommendations: ['Add subwoofer track for door knock'],
        },
      } as any);
  });

  it('returns PostProductionPlan with all three stages', async () => {
    const plan = await createPostProductionPlan(mockScenes);
    expect(plan).toHaveProperty('roughCut');
    expect(plan).toHaveProperty('fineCut');
    expect(plan).toHaveProperty('pictureLock');
    expect(plan).toHaveProperty('recommendations');
  });

  it('roughCut contains sceneOrder, transitionNotes, tempAudioTracks', async () => {
    const plan = await createPostProductionPlan(mockScenes);
    expect(plan.roughCut.sceneOrder).toHaveLength(3);
    expect(plan.roughCut.transitionNotes).toContain('Fade in from black');
    expect(plan.roughCut.tempAudioTracks).toContain('Dark ambient drone');
  });

  it('fineCut contains trimAdjustments', async () => {
    const plan = await createPostProductionPlan(mockScenes);
    expect(plan.fineCut.trimAdjustments).toHaveLength(1);
    expect(plan.fineCut.trimAdjustments[0]!.newDurationSec).toBe(12);
  });

  it('pictureLock has deliveryFormat', async () => {
    const plan = await createPostProductionPlan(mockScenes);
    expect(plan.pictureLock.deliveryFormat).toContain('4K');
  });

  it('buildTimeline produces correct total duration', async () => {
    const plan = await createPostProductionPlan(mockScenes);
    const last = plan.pictureLock.masterTimeline[plan.pictureLock.masterTimeline.length - 1];
    expect(last).toBeDefined();
    expect(last.endTimeSec).toBeGreaterThan(0);
  });

  it('passes auteurStyle to prompt when provided', async () => {
    await createPostProductionPlan(mockScenes, undefined, undefined, 'Tarantino');
    expect(generateObject).toHaveBeenCalled();
  });
});

describe('soundDesigner', () => {
  beforeEach(() => {
    vi.mocked(generateObject).mockReset();
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        adr: [
          { sceneIndex: 1, characterName: 'Protagonist', originalLine: 'Where am I?', reason: 'Background noise', suggestedRecordingNote: 'Close mic, dead room' },
        ],
        foley: [
          { sceneIndex: 1, timestampSec: 2.5, effect: 'Footsteps on wood', description: 'Slow hesitant steps' },
        ],
        roomTones: [
          { sceneIndex: 1, environmentType: 'Bedroom', durationSec: 30, notes: 'Hum of old building' },
        ],
        soundBridges: [
          { fromSceneIndex: 1, toSceneIndex: 2, bridgeType: 'audio_lead' as const, description: 'Photograph rustle leads into scene 2' },
        ],
        scoreDirection: 'Minimalist piano with subtle strings',
        mixNotes: ['Warm dialogue presence', 'Low end rolloff at 60Hz'],
      },
    } as any);
  });

  it('returns SoundDesignPlan with all sections', async () => {
    const plan = await planSoundDesign(mockScenes);
    expect(plan).toHaveProperty('adr');
    expect(plan).toHaveProperty('foley');
    expect(plan).toHaveProperty('roomTones');
    expect(plan).toHaveProperty('soundBridges');
    expect(plan).toHaveProperty('scoreDirection');
    expect(plan).toHaveProperty('mixNotes');
  });

  it('ADR lines have required fields', async () => {
    const plan = await planSoundDesign(mockScenes);
    expect(plan.adr).toHaveLength(1);
    expect(plan.adr[0]!.characterName).toBe('Protagonist');
  });

  it('Foley has timestamp and effect', async () => {
    const plan = await planSoundDesign(mockScenes);
    expect(plan.foley[0]!.effect).toBe('Footsteps on wood');
    expect(plan.foley[0]!.timestampSec).toBe(2.5);
  });

  it('SoundBridges have bridgeType', async () => {
    const plan = await planSoundDesign(mockScenes);
    expect(plan.soundBridges[0]!.bridgeType).toBe('audio_lead');
  });

  it('passes trimAdjustments when provided', async () => {
    const trims = [{ sceneIndex: 1, newDurationSec: 12, reason: 'tighten' }];
    await planSoundDesign(mockScenes, trims);
    expect(generateObject).toHaveBeenCalled();
  });
});
