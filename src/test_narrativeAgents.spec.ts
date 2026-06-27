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

vi.mock('./services/neo4jService.js', () => ({
  isNeo4jConnected: vi.fn(() => false),
  runQuery: vi.fn(),
  runRead: vi.fn(),
  initNeo4jSchema: vi.fn(),
}));

import { generateObject } from 'ai';

// ─── Phase B: Canon Auditor ──────────────────────────────────────────────────

describe('canonAuditor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('validateScenes returns passed=true when no death violations', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        entities: [
          { type: 'character', name: 'Alice', state: 'walking', status: 'alive' },
          { type: 'location', name: 'Forest', state: 'sunny', status: 'intact' },
        ],
      },
    } as any);

    const { validateScenes } = await import('./services/agents/canonAuditor.js');
    const result = await validateScenes(['Alice walks in the forest'], 1);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('validateScenes detects death violation across scenes', async () => {
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { entities: [{ type: 'character', name: 'Bob', state: 'dies', status: 'dead' }] },
      } as any)
      .mockResolvedValueOnce({
        object: { entities: [{ type: 'character', name: 'Bob', state: 'walking', status: 'alive' }] },
      } as any);

    const { validateScenes } = await import('./services/agents/canonAuditor.js');
    const result = await validateScenes(['Bob dies', 'Bob walks again'], 1);
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.type === 'character_death_violation')).toBe(true);
  });

  it('checkTimelineConsistency detects teleportation', async () => {
    const { checkTimelineConsistency } = await import('./services/agents/canonAuditor.js');
    const issues = await checkTimelineConsistency([
      { characterName: 'Alice', sceneNumber: 1, location: 'Cave', state: 'exploring' },
      { characterName: 'Alice', sceneNumber: 2, location: 'City', state: 'talking' },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.type).toBe('timeline_inconsistency');
  });

  it('checkTimelineConsistency allows travel with travel state', async () => {
    const { checkTimelineConsistency } = await import('./services/agents/canonAuditor.js');
    const issues = await checkTimelineConsistency([
      { characterName: 'Alice', sceneNumber: 1, location: 'Cave', state: 'exploring' },
      { characterName: 'Alice', sceneNumber: 2, location: 'City', state: 'traveling by horse' },
    ]);
    expect(issues).toHaveLength(0);
  });
});

// ─── Phase B: Continuity Manager ─────────────────────────────────────────────

describe('continuityManager', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('analyzePlantPayoff returns plants array', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        plants: [
          { plant: 'Old key', scenePlanted: 1, payoff: 'Opens treasure room', scenePayoff: 3, status: 'pending' },
          { plant: 'Mentioned letter', scenePlanted: 2, payoff: undefined, scenePayoff: undefined, status: 'missed' },
        ],
        suggestions: ['The letter from scene 2 was never used — resolve it'],
      },
    } as any);

    const { analyzePlantPayoff } = await import('./services/agents/continuityManager.js');
    const result = await analyzePlantPayoff(['Scene 1', 'Scene 2', 'Scene 3']);
    expect(result.plants).toHaveLength(2);
    expect(result.plants[0]!.status).toBe('pending');
    expect(result.suggestions).toHaveLength(1);
  });

  it('trackCharacterState returns void when Neo4j not connected', async () => {
    const { trackCharacterState } = await import('./services/agents/continuityManager.js');
    const state = {
      characterName: 'Alice', sceneNumber: 1, location: 'Cave',
      inventory: ['torch'], health: 'healthy', emotionalState: 'curious',
    };
    await expect(trackCharacterState('Alice', state as any)).resolves.toBeUndefined();
  });
});

// ─── Phase B: Character Psychologist ─────────────────────────────────────────

describe('characterPsychologist', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('analyzeSceneRelationships returns edges', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        interactions: [
          { character1: 'Hero', character2: 'Villain', interaction: 'argument', affectionDelta: -2, trustDelta: -5, animosityDelta: 8, notes: 'heated exchange' },
        ],
      },
    } as any);

    const { analyzeSceneRelationships } = await import('./services/agents/characterPsychologist.js');
    const edges = await analyzeSceneRelationships('Hero argues with Villain', 1);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.character1).toBe('Hero');
    expect(edges[0]!.animosity).toBe(8);
  });

  it('getRelationshipArc returns null when Neo4j not connected', async () => {
    const { getRelationshipArc } = await import('./services/agents/characterPsychologist.js');
    const arc = await getRelationshipArc('Hero', 'Villain');
    expect(arc).toBeNull();
  });

  it('suggestSlowBurnBeat returns beat with score change', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestedEmotion: 'Tension building',
        scoreChange: 5,
        dialogueHint: 'I do not trust you yet.',
        reason: 'Early beat, subtle shift',
      },
    } as any);

    const { suggestSlowBurnBeat } = await import('./services/agents/characterPsychologist.js');
    const beat = await suggestSlowBurnBeat('Hero', 'Sidekick', null, 'First meeting');
    expect(beat.suggestedEmotion).toBe('Tension building');
    expect(beat.scoreChange).toBeGreaterThan(0);
    expect(beat.scoreChange).toBeLessThanOrEqual(10);
  });
});

// ─── Phase G: Narrative Device Agent ─────────────────────────────────────────

describe('narrativeDeviceAgent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('suggestNarrativeDevice returns suggestion for preferred device', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        device: 'frame_story',
        description: 'An old man tells the story to his grandchildren',
        integrationNotes: ['Opening scene in present day', 'Return to present between acts', 'Final reveal in framing story'],
        scenePlacement: [1, 5, 10],
        impact: 'Creates emotional distance that makes the ending more poignant',
      },
    } as any);

    const { suggestNarrativeDevice } = await import('./services/agents/narrativeDeviceAgent.js');
    const result = await suggestNarrativeDevice('A knight seeks the holy grail', 'frame_story');
    expect(result.device).toBe('frame_story');
    expect(result.scenePlacement).toContain(1);
    expect(result.integrationNotes.length).toBeGreaterThanOrEqual(2);
  });

  it('defaults to dramatic_irony when no preference given', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        device: 'dramatic_irony',
        description: 'Audience knows the bomb is under the table',
        integrationNotes: ['Show bomb placement early', 'Cut to hero unknowingly sitting at table'],
        scenePlacement: [1, 8],
        impact: 'Creates unbearable tension',
      },
    } as any);

    const { suggestNarrativeDevice } = await import('./services/agents/narrativeDeviceAgent.js');
    const result = await suggestNarrativeDevice('Dinner party scene');
    expect(result.device).toBe('dramatic_irony');
  });
});

// ─── Phase G: Time Structure Agent ───────────────────────────────────────────

describe('timeStructureAgent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('suggestTimeStructure returns suggestion', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        sequence: [
          { sceneNumber: 1, narrativeTime: 'Present day', description: 'Detective finds clue' },
          { sceneNumber: 2, narrativeTime: 'Flashback to 1990', description: 'The crime happens' },
        ],
        audienceEffect: 'Keeps audience guessing',
        justification: 'Mystery benefits from non-linear reveal',
      },
    } as any);

    const { suggestTimeStructure } = await import('./services/agents/timeStructureAgent.js');
    const result = await suggestTimeStructure('A detective solves a cold case', 5);
    expect(result.structure).toBe('linear');
    expect(result.sequence).toHaveLength(2);
    expect(result.audienceEffect).toBeTruthy();
  });

  it('uses preferred structure when provided', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        structure: 'time_loop',
        description: 'Same day repeats with subtle changes',
        sceneOrder: [1, 2, 3, 1, 2, 4],
        narrativeRationale: 'Character learns from repeated mistakes',
      },
    } as any);

    const { suggestTimeStructure } = await import('./services/agents/timeStructureAgent.js');
    const result = await suggestTimeStructure('Groundhog Day style story', 6, 'time_loop');
    expect(result.structure).toBe('time_loop');
  });
});

// ─── Phase G: Transition Designer Agent ──────────────────────────────────────

describe('transitionDesignerAgent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('designTransitions returns transition plan', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        transitions: [
          { fromScene: 1, toScene: 2, type: 'match_cut', description: 'Clock face matches to moon', duration: '2s' },
          { fromScene: 2, toScene: 3, type: 'smash_cut', description: 'Sudden alarm sound', duration: '0.5s' },
        ],
        overallRhythm: 'Starts slow, accelerates toward climax',
      },
    } as any);

    const { designTransitions } = await import('./services/agents/transitionDesignerAgent.js');
    const result = await designTransitions(['Morning routine', 'Alarm goes off', 'Rushes to work']);
    expect(result.transitions).toHaveLength(2);
    expect(result.transitions[0]!.type).toBe('match_cut');
    expect(result.transitions[0]!.duration).toBeTruthy();
  });

  it('returns transitions for single scene', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        transitions: [],
        overallRhythm: 'Single scene, no transitions needed',
      },
    } as any);

    const { designTransitions } = await import('./services/agents/transitionDesignerAgent.js');
    const result = await designTransitions(['Just a monologue']);
    expect(result.transitions).toHaveLength(0);
  });
});
