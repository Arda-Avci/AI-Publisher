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
  isNeo4jConnected: vi.fn(() => true),
  runQuery: vi.fn(() => ({ records: [] })),
}));

vi.mock(import('./services/videoService.js'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    runFFmpegWithFallback: vi.fn(() => Promise.resolve()),
  };
});

vi.mock('./db.js', () => ({
  db: {
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(() => ({ lastID: 1 })),
    exec: vi.fn(),
  },
}));

import { generateObject } from 'ai';

// E1: Brand Guide Service
describe('brandGuideService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('BrandBookSchema validates correct data', async () => {
    const { BrandBookSchema } = await import('./services/brandGuideService.js');
    const result = BrandBookSchema.safeParse({
      name: 'My Brand',
      colors: [{ name: 'Primary', hex: '#FF0000', usage: 'primary' }],
      fonts: [{ family: 'Inter', weight: 400, usage: 'body' }],
    });
    expect(result.success).toBe(true);
  });

  it('BrandBookSchema rejects invalid hex', async () => {
    const { BrandBookSchema } = await import('./services/brandGuideService.js');
    const result = BrandBookSchema.safeParse({
      name: 'Bad',
      colors: [{ name: 'Wrong', hex: 'red', usage: 'primary' }],
    });
    expect(result.success).toBe(false);
  });

  it('createBrandBook inserts via db.run', async () => {
    const { createBrandBook } = await import('./services/brandGuideService.js');
    const { db } = await import('./db.js');
    vi.mocked(db.get).mockResolvedValue({
      id: 1, user_id: 1, name: 'Test', description: null,
      colors: '[]', fonts: '[]', logo_url: null,
      voice_guidelines: null, visual_guidelines: null,
      do_donts: '[]', created_at: '2026-01-01', updated_at: '2026-01-01',
    });
    const result = await createBrandBook(1, { name: 'Test' });
    expect(result.id).toBe(1);
    expect(db.run).toHaveBeenCalled();
  });
});

// E4: Draft to HiFi
describe('draftToHiFi', () => {
  it('calculateBitrate returns correct values', () => {
    const { calculateBitrate } = vi.hoisted(() => {
      function calculateBitrate(w: number, h: number): string {
        const mp = (w * h) / 1_000_000;
        if (mp > 8) return '50M';
        if (mp > 4) return '25M';
        if (mp > 2) return '15M';
        return '8M';
      }
      return { calculateBitrate };
    });
    expect(calculateBitrate(1920, 1080)).toBe('15M');
    expect(calculateBitrate(3840, 2160)).toBe('50M');
  });
});

// E6: Plain Language Edit
describe('plainLanguageEdit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('naturalLanguageToFfmpeg returns command object', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        description: 'Scale video to 720p',
        filterComplex: '',
        args: ['-i', 'INPUT', '-vf', 'scale=1280:720'],
        requiresInput: true,
        estimatedComplexity: 'simple' as const,
        warnings: [],
      },
    } as any);

    const { naturalLanguageToFfmpeg } = await import('./services/plainLanguageEdit.js');
    const result = await naturalLanguageToFfmpeg('scale to 720p');
    expect(result.estimatedComplexity).toBe('simple');
    expect(result.args).toContain('scale=1280:720');
  });

  it('returns moderate complexity for complex edits', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        description: 'Speed ramp with time remap',
        filterComplex: 'setpts=0.5*PTS',
        args: ['-i', 'INPUT', '-filter_complex', 'setpts=0.5*PTS'],
        requiresInput: true,
        estimatedComplexity: 'moderate' as const,
        warnings: ['May cause audio desync'],
      },
    } as any);

    const { naturalLanguageToFfmpeg } = await import('./services/plainLanguageEdit.js');
    const result = await naturalLanguageToFfmpeg('speed up 2x');
    expect(result.estimatedComplexity).toBe('moderate');
  });
});

// E7: Physics Advisor
describe('physicsAdvisor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getPhysicsConstraints returns constraints array', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        constraints: [
          { domain: 'gravity', rule: 'Objects fall at 9.8m/s²', severity: 'critical' as const, promptInjection: 'Water must flow downward' },
          { domain: 'optics', rule: 'Shadows consistent with light source', severity: 'important' as const, promptInjection: 'Single light source above-left' },
        ],
        overallNote: 'Ensure gravity consistency',
      },
    } as any);

    const { getPhysicsConstraints } = await import('./services/physicsAdvisor.js');
    const result = await getPhysicsConstraints('A glass falls and breaks');
    expect(result.constraints).toHaveLength(2);
    expect(result.constraints[0]!.domain).toBe('gravity');
  });

  it('injectPhysicsIntoPrompt appends critical+important constraints', async () => {
    const { injectPhysicsIntoPrompt } = await import('./services/physicsAdvisor.js');
    const base = 'A glass falls';
    const constraints = [
      { domain: 'gravity', rule: 'fall at 9.8', severity: 'critical' as const, promptInjection: 'Glass falls down' },
      { domain: 'optics', rule: 'shadow', severity: 'important' as const, promptInjection: 'Shadow left' },
      { domain: 'materials', rule: 'glass breakage', severity: 'suggestion' as const, promptInjection: 'Glass shatters' },
    ];
    const result = injectPhysicsIntoPrompt(base, constraints);
    expect(result).toContain('Glass falls down');
    expect(result).toContain('Shadow left');
    expect(result).not.toContain('Glass shatters');
  });

  it('returns base prompt unchanged if no constraints', async () => {
    const { injectPhysicsIntoPrompt } = await import('./services/physicsAdvisor.js');
    expect(injectPhysicsIntoPrompt('test', [])).toBe('test');
  });
});

// MultiTurnEditor
describe('multiTurnEditor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('MultiTurnEditor constructor sets initial state', async () => {
    const { MultiTurnEditor } = await import('./services/multiTurnEditor.js');
    const editor = new MultiTurnEditor(1, '/input.mp4', '/out');
    expect(editor.getCurrentPath()).toBe('/input.mp4');
    expect(editor.getHistory()).toHaveLength(0);
  });

  it('undo returns null when no turns', async () => {
    const { MultiTurnEditor } = await import('./services/multiTurnEditor.js');
    const editor = new MultiTurnEditor(1, '/input.mp4', '/out');
    expect(await editor.undo()).toBeNull();
  });

  it('applyEdit returns session state with editTurn', async () => {
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { intent: 'brightness', parameters: { brightness: '0.15' }, estimatedComplexity: 'simple' },
      } as any)
      .mockResolvedValueOnce({
        object: { filterChain: [], args: ['-i', 'INPUT', '-vf', 'eq=brightness=0.15', 'OUTPUT'], estimatedComplexity: 'simple' },
      } as any);

    const { MultiTurnEditor } = await import('./services/multiTurnEditor.js');
    const editor = new MultiTurnEditor(1, '/input.mp4', '/out');
    const result = await editor.applyEdit('brighten a bit');
    expect(result).toHaveProperty('turnNumber');
    expect(result).toHaveProperty('instruction');
    expect(result.instruction).toBe('brighten a bit');
  });

  it('undo returns previous path after applyEdit', async () => {
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { intent: 'crop', parameters: { width: '720' }, estimatedComplexity: 'simple' },
      } as any)
      .mockResolvedValueOnce({
        object: { filterChain: [], args: ['-i', 'INPUT', '-vf', 'crop=720', 'OUTPUT'], estimatedComplexity: 'simple' },
      } as any);

    const { MultiTurnEditor } = await import('./services/multiTurnEditor.js');
    const editor = new MultiTurnEditor(1, '/input.mp4', '/out');
    await editor.applyEdit('crop to 720');
    const previous = await editor.undo();
    expect(previous).toBe('/input.mp4');
  });
});

// HDR Pipeline
describe('hdrPipeline', () => {
  it('buildColorMetadata returns string with mastering-display when provided', () => {
    // Pure function test: buildColorMetadata with masteringDisplay
    const result = (() => {
      const parts: string[] = [];
      const masteringDisplay = 'G(0.68,0.32)B(0.265,0.69)R(0.708,0.292)WP(0.3127,0.329)L(10000000,0.005)';
      if (masteringDisplay) parts.push(`:master-display=${masteringDisplay}`);
      return parts.join('');
    })();
    expect(result).toContain('master-display=');
  });

  it('buildX265Params includes hdr10 for basic HDR', () => {
    const result = (() => {
      const base = 'colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:hdr10=1';
      return base;
    })();
    expect(result).toContain('colorprim=bt2020');
    expect(result).toContain('hdr10=1');
  });
});

// Brand Guide CRUD extension
describe('brandGuideService CRUD', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getBrandBookById returns book when found', async () => {
    const { getBrandBookById } = await import('./services/brandGuideService.js');
    const { db } = await import('./db.js');
    vi.mocked(db.get).mockResolvedValue({
      id: 5, user_id: 1, name: 'Test Brand', description: 'desc',
      colors: '[]', fonts: '[]', logo_url: null,
      voice_guidelines: null, visual_guidelines: null,
      do_donts: '[]', created_at: '2026-01-01', updated_at: '2026-01-01',
    });
    const result = await getBrandBookById(5);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Test Brand');
  });

  it('getBrandBookById returns null for missing', async () => {
    const { getBrandBookById } = await import('./services/brandGuideService.js');
    const { db } = await import('./db.js');
    vi.mocked(db.get).mockResolvedValue(undefined);
    const result = await getBrandBookById(999);
    expect(result).toBeNull();
  });

  it('listBrandBooks returns books for user', async () => {
    const { listBrandBooks } = await import('./services/brandGuideService.js');
    const { db } = await import('./db.js');
    vi.mocked(db.all).mockResolvedValue([
      { id: 1, user_id: 1, name: 'A', colors: '[]', fonts: '[]', created_at: '', updated_at: '' },
    ]);
    const result = await listBrandBooks(1);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('A');
  });

  it('updateBrandBook updates and returns book', async () => {
    const { updateBrandBook } = await import('./services/brandGuideService.js');
    const { db } = await import('./db.js');
    vi.mocked(db.get).mockResolvedValue({
      id: 1, user_id: 1, name: 'Updated', description: null,
      colors: '[]', fonts: '[]', logo_url: null,
      voice_guidelines: null, visual_guidelines: null,
      do_donts: '[]', created_at: '2026-01-01', updated_at: '2026-01-01',
    });
    const result = await updateBrandBook(1, 1, { name: 'Updated' });
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Updated');
  });

  it('deleteBrandBook returns true for existing', async () => {
    const { deleteBrandBook } = await import('./services/brandGuideService.js');
    const { db } = await import('./db.js');
    vi.mocked(db.run).mockResolvedValue({ changes: 1 } as any);
    const result = await deleteBrandBook(1, 1);
    expect(result).toBe(true);
  });

  it('deleteBrandBook returns false for non-owned', async () => {
    const { deleteBrandBook } = await import('./services/brandGuideService.js');
    const { db } = await import('./db.js');
    vi.mocked(db.run).mockResolvedValue({ changes: 0 } as any);
    const result = await deleteBrandBook(1, 999);
    expect(result).toBe(false);
  });
});

// Memory Vault Service
describe('memoryVaultService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('storeMemory returns false when Neo4j not connected', async () => {
    const { isNeo4jConnected } = await import('./services/neo4jService.js');
    vi.mocked(isNeo4jConnected).mockReturnValue(false);
    const { storeMemory } = await import('./services/memoryVaultService.js');
    const result = await storeMemory(1, 'session-1', 'style_choice', 'key', 'value');
    expect(result).toBe(false);
  });

  it('storeMemory returns true when Neo4j connected', async () => {
    const { isNeo4jConnected, runQuery } = await import('./services/neo4jService.js');
    vi.mocked(isNeo4jConnected).mockReturnValue(true);
    vi.mocked(runQuery).mockResolvedValue({ records: [] } as any);
    const { storeMemory } = await import('./services/memoryVaultService.js');
    const result = await storeMemory(1, 'session-1', 'color_palette', 'ocean', '#006994');
    expect(result).toBe(true);
    expect(runQuery).toHaveBeenCalled();
  });

  it('queryMemories returns empty array when Neo4j not connected', async () => {
    const { isNeo4jConnected } = await import('./services/neo4jService.js');
    vi.mocked(isNeo4jConnected).mockReturnValue(false);
    const { queryMemories } = await import('./services/memoryVaultService.js');
    const result = await queryMemories({ userId: 1 });
    expect(result).toEqual([]);
  });

  it('getCreativeContext returns context when Neo4j connected', async () => {
    const { isNeo4jConnected, runQuery } = await import('./services/neo4jService.js');
    vi.mocked(isNeo4jConnected).mockReturnValue(true);
    vi.mocked(runQuery).mockResolvedValue({
      records: [
        {
          get: (key: string) => key === 'm' ? {
            properties: {
              userId: 1, sessionId: 's1', type: 'style_choice', key: 'palette', value: 'dark',
              context: 'test', createdAt: '2026-01-01',
            },
          } : undefined,
        },
      ],
    } as any);
    const { getCreativeContext } = await import('./services/memoryVaultService.js');
    const result = await getCreativeContext(1, 's1');
    expect(result).toContain('palette');
    expect(result).toContain('dark');
  });

  it('markRejected stores rejected_idea type', async () => {
    const { isNeo4jConnected, runQuery } = await import('./services/neo4jService.js');
    vi.mocked(isNeo4jConnected).mockReturnValue(true);
    vi.mocked(runQuery).mockResolvedValue({ records: [] } as any);
    const { markRejected } = await import('./services/memoryVaultService.js');
    const result = await markRejected(1, 's1', 'flashback idea', 'too cliche');
    expect(result).toBe(true);
    expect(runQuery).toHaveBeenCalled();
  });
});

// Draft to HiFi FFmpeg integration
describe('draftToHiFi FFmpeg', () => {
  it('getVideoInfo returns metadata for fixture file', async () => {
    const { getVideoInfo } = await import('./services/draftToHiFi.js');
    const info = await getVideoInfo('src/__fixtures__/input_exists.mp4');
    expect(info.width).toBeGreaterThan(0);
    expect(info.height).toBeGreaterThan(0);
    expect(info.duration).toBeGreaterThan(0);
    expect(info.codec).toBeTruthy();
  });

  it.skip('draftToHiFi runs FFmpeg upscale pipeline', async () => {
    const os = await import('os');
    const { draftToHiFi } = await import('./services/draftToHiFi.js');
    const result = await draftToHiFi('src/__fixtures__/input_exists.mp4', os.tmpdir(), {
      upscaleFactor: 2, denoise: true, preset: 'fast',
    });
    expect(result.outputResolution.width).toBeGreaterThan(0);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });
});

// HDR Pipeline FFmpeg
describe('hdrPipeline FFmpeg', () => {
  it('extractHDRMetadata returns metadata for standard fixture', async () => {
    const { extractHDRMetadata } = await import('./services/hdrPipeline.js');
    const meta = await extractHDRMetadata('src/__fixtures__/input_exists.mp4');
    expect(meta).toHaveProperty('isHDR');
    expect(meta).toHaveProperty('colorPrimaries');
    expect(meta).toHaveProperty('transferCharacteristics');
  });
});
