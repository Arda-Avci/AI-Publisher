import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Platform } from './services/viralHook.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(true),
    existsSync: vi.fn().mockReturnValue(true),
    readFile: vi.fn().mockResolvedValue(Buffer.alloc(0)),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(true),
  existsSync: vi.fn().mockReturnValue(true),
  readFile: vi.fn().mockResolvedValue(Buffer.alloc(0)),
}));

vi.mock('./lib/logger.js', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./lib/ai-provider.js', () => ({
  getAIModelChain: vi.fn().mockReturnValue([
    { modelId: 'mock-model', chat: vi.fn() }
  ]),
}));

vi.mock('./lib/ai-utils.js', () => {
  const mockFn = vi.fn().mockImplementation(async (op) => {
    return {
      object: {
        score: 7,
        hookType: 'statistic',
        pacingScore: 7,
        visualAppealScore: 7,
        audioClarityScore: 7,
        attentionRetentionScore: 7,
        strengths: ['good pacing'],
        weaknesses: ['weak hook'],
        improvementTips: ['improve audio'],
        openerStrength: 70,
        patternMatch: { curiosity: 50, controversy: 30, authority: 80, numbers: 40 },
        titles: [
          { title: 'Viral title', style: 'curiosity', ctaIncluded: false, emojiCount: 1 },
          { title: 'Curiosity title', style: 'curiosity', ctaIncluded: false, emojiCount: 0 },
          { title: 'Stat driven', style: 'stat-driven', ctaIncluded: false, emojiCount: 1 },
          { title: 'Controversial', style: 'controversial', ctaIncluded: true, emojiCount: 2 }
        ],
        hashtags: [
          { tag: '#viral', platform: 'youtube', category: 'trend', estimatedReach: '100K' },
          { tag: '#tech', platform: 'youtube', category: 'niche', estimatedReach: '50K' },
          { tag: '#test', platform: 'tiktok', category: 'generic', estimatedReach: '1K' }
        ],
        hookScore: 80
      }
    };
  });
  return {
    withFallbackAndRetry: mockFn,
  };
});

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('./services/videoService.js', () => ({
  runFFmpeg: vi.fn(async () => ({ stdout: '', stderr: '' })),
  extractReferenceFrame: vi.fn().mockResolvedValue(''),
  extractReferenceFrameAtTime: vi.fn().mockResolvedValue(''),
  getVideoDuration: vi.fn(async () => 30.0),
}));

// ── Import under test ─────────────────────────────────────────────────────────

import {
  HookQualitySchema,
  ViralTitlesSchema,
  HashtagsSchema,
  generateViralTitles,
  generateHashtags,
  analyzeHookQuality,
  optimizeForViral,
  generateViralContent,
  ViralContentSchema,
} from './services/viralHook.js';

import { z } from 'zod';

describe('viralHook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── HookQualitySchema interface ─────────────────────────────────────────────

  it('HookQualitySchema interface fields', () => {
    const valid = {
      score: 7.5,
      hookType: 'question' as const,
      pacingScore: 8.0,
      visualAppealScore: 7.0,
      audioClarityScore: 6.5,
      attentionRetentionScore: 7.5,
      strengths: ['good pacing'],
      weaknesses: ['weak opener'],
      improvementTips: ['add text overlay'],
      openerStrength: 65,
      patternMatch: {
        curiosity: 70,
        controversy: 40,
        authority: 55,
        numbers: 30
      }
    };

    const result = HookQualitySchema.parse(valid);
    expect(result.score).toBe(7.5);
    expect(result.hookType).toBe('question');
    expect(result.pacingScore).toBe(8.0);
    expect(result.openerStrength).toBe(65);
    expect(result.patternMatch?.curiosity).toBe(70);
  });

  it('HookQualitySchema rejects out-of-range score', () => {
    const invalid = {
      score: 15, // max is 10
      hookType: 'question',
      pacingScore: 8.0,
      visualAppealScore: 7.0,
      audioClarityScore: 6.5,
      attentionRetentionScore: 7.5,
      strengths: [],
      weaknesses: [],
      improvementTips: []
    };
    expect(() => HookQualitySchema.parse(invalid)).toThrow();
  });

  // ── ViralTitlesSchema ──────────────────────────────────────────────────────

  it('ViralTitlesSchema interface fields', () => {
    const valid = {
      titles: [
        { title: 'Test basligi 2026', style: 'curiosity' as const, ctaIncluded: true, emojiCount: 1 },
        { title: 'Sans feci bilgi', style: 'stat-driven' as const, ctaIncluded: false, emojiCount: 2 }
      ]
    };
    const result = ViralTitlesSchema.parse(valid);
    expect(result.titles.length).toBe(2);
    expect(result.titles[0].title).toBe('Test basligi 2026');
    expect(result.titles[0].ctaIncluded).toBe(true);
    expect(result.titles[0].emojiCount).toBe(1);
  });

  it('ViralTitlesSchema rejects invalid style', () => {
    const invalid = {
      titles: [{ title: 'test', style: 'invalid_style', ctaIncluded: false, emojiCount: 0 }]
    };
    expect(() => ViralTitlesSchema.parse(invalid)).toThrow();
  });

  // ── HashtagsSchema ──────────────────────────────────────────────────────────

  it('HashtagsSchema interface fields', () => {
    const valid = {
      hashtags: [
        { tag: '#viral', platform: 'youtube', category: 'trend' as const, estimatedReach: '100K' },
        { tag: '#tutorial', platform: 'youtube', category: 'niche' as const, estimatedReach: '10K' }
      ],
      trendingTopics: ['#AI2026']
    };
    const result = HashtagsSchema.parse(valid);
    expect(result.hashtags.length).toBe(2);
    expect(result.hashtags[0].tag).toBe('#viral');
    expect(result.hashtags[0].category).toBe('trend');
    expect(result.trendingTopics).toContain('#AI2026');
  });

  it('HashtagsSchema allows missing optional fields', () => {
    const minimal = {
      hashtags: [
        { tag: '#test', platform: 'tiktok', category: 'generic' as const, estimatedReach: '1K' }
      ]
    };
    const result = HashtagsSchema.parse(minimal);
    expect(result.hashtags.length).toBe(1);
    expect(result.trendingTopics).toBeUndefined();
  });

  // ── generateViralTitles returns array ───────────────────────────────────────

  it('generateViralTitles returns array', async () => {
    const { withFallbackAndRetry } = await import('./lib/ai-utils.js');
    (withFallbackAndRetry as any).mockResolvedValueOnce({
      object: {
        titles: [
          { title: 'Test Title 2026', style: 'curiosity', ctaIncluded: true, emojiCount: 1 }
        ]
      }
    });

    const result = await generateViralTitles('AI technology trends', 5);
    expect(Array.isArray(result.titles)).toBe(true);
    expect(result.titles.length).toBeGreaterThan(0);
    expect(result.titles[0]).toHaveProperty('title');
    expect(result.titles[0]).toHaveProperty('style');
  }, 15000);

  it('generateViralTitles returns array with different styles', async () => {
    const { withFallbackAndRetry } = await import('./lib/ai-utils.js');
    (withFallbackAndRetry as any).mockResolvedValueOnce({
      object: {
        titles: [
          { title: 'Curiosity title', style: 'curiosity', ctaIncluded: false, emojiCount: 0 },
          { title: 'Stat driven', style: 'stat-driven', ctaIncluded: false, emojiCount: 1 },
          { title: 'Controversial', style: 'controversial', ctaIncluded: true, emojiCount: 2 }
        ]
      }
    });

    const result = await generateViralTitles('test topic');
    expect(result.titles.length).toBe(3);
    const styles = result.titles.map((t: any) => t.style);
    expect(styles).toContain('curiosity');
    expect(styles).toContain('stat-driven');
    expect(styles).toContain('controversial');
  }, 15000);

  // ── generateHashtags returns array ─────────────────────────────────────────

  it('generateHashtags returns array', async () => {
    const { withFallbackAndRetry } = await import('./lib/ai-utils.js');
    (withFallbackAndRetry as any).mockResolvedValueOnce({
      object: {
        hashtags: [
          { tag: '#viral', platform: 'youtube', category: 'trend', estimatedReach: '100K' },
          { tag: '#tech', platform: 'youtube', category: 'niche', estimatedReach: '50K' }
        ]
      }
    });

    const result = await generateHashtags('artificial intelligence video', 'youtube');
    expect(Array.isArray(result.hashtags)).toBe(true);
    expect(result.hashtags.length).toBeGreaterThan(0);
    expect(result.hashtags[0]).toHaveProperty('tag');
    expect(result.hashtags[0]).toHaveProperty('platform');
    expect(result.hashtags[0]).toHaveProperty('category');
  }, 15000);

  it('generateHashtags works for all platforms', async () => {
    const { withFallbackAndRetry } = await import('./lib/ai-utils.js');
    (withFallbackAndRetry as any).mockResolvedValueOnce({
      object: { hashtags: [{ tag: '#test', platform: 'tiktok', category: 'generic', estimatedReach: '1K' }] }
    });

    const platforms: Platform[] = ['youtube', 'tiktok', 'x', 'meta'];
    for (const platform of platforms) {
      vi.clearAllMocks();
      const result = await generateHashtags('content', platform);
      expect(Array.isArray(result.hashtags)).toBe(true);
    }
  }, 15000);

  // ── analyzeHookQuality ─────────────────────────────────────────────────────

  it('analyzeHookQuality returns HookQualitySchema shape', async () => {
    const { withFallbackAndRetry } = await import('./lib/ai-utils.js');
    (withFallbackAndRetry as any).mockResolvedValueOnce({
      object: {
        score: 7.0,
        hookType: 'question',
        pacingScore: 7.5,
        visualAppealScore: 6.5,
        audioClarityScore: 7.0,
        attentionRetentionScore: 7.0,
        strengths: ['good text'],
        weaknesses: ['slow start'],
        improvementTips: ['add hook text'],
        openerStrength: 60
      }
    });

    const result = await analyzeHookQuality('video.mp4');
    expect(result.score).toBe(7.0);
    expect(result.hookType).toBe('question');
    expect(result.openerStrength).toBe(60);
  }, 15000);

  // ── optimizeForViral ────────────────────────────────────────────────────────

  it('optimizeForViral combines hook + titles + hashtags', async () => {
    const result = await optimizeForViral('video.mp4', 'AI topic', 'youtube');
    expect(result).toHaveProperty('hookScore');
    expect(result).toHaveProperty('titles');
    expect(result).toHaveProperty('hashtags');
    expect(Array.isArray(result.titles)).toBe(true);
    expect(Array.isArray(result.hashtags)).toBe(true);
  }, 15000);

  // ── ViralContentSchema ─────────────────────────────────────────────────────

  it('ViralContentSchema interface fields', () => {
    const valid = {
      titles: ['Title 1', 'Title 2'],
      hashtags: ['#test', '#viral'],
      hookScore: 75
    };
    const result = ViralContentSchema.parse(valid);
    expect(result.titles.length).toBe(2);
    expect(result.hashtags.length).toBe(2);
    expect(result.hookScore).toBe(75);
  });

  it('ViralContentSchema hookScore range', () => {
    const min = ViralContentSchema.parse({ titles: [], hashtags: [], hookScore: 0 });
    const max = ViralContentSchema.parse({ titles: [], hashtags: [], hookScore: 100 });
    expect(min.hookScore).toBe(0);
    expect(max.hookScore).toBe(100);
  });

  // ── generateViralContent ────────────────────────────────────────────────────

  it('generateViralContent returns titles + hashtags + hookScore', async () => {
    const { withFallbackAndRetry } = await import('./lib/ai-utils.js');
    const { extractReferenceFrame } = await import('./services/videoService.js');

    (extractReferenceFrame as any).mockResolvedValueOnce('');
    (withFallbackAndRetry as any).mockResolvedValueOnce({
      object: {
        titles: ['AI 2026 Semp', 'Mind Blowing Fact'],
        hashtags: ['#AI', '#Viral'],
        hookScore: 80
      }
    });

    const result = await generateViralContent('video.mp4', 'test transcript');
    expect(Array.isArray(result.titles)).toBe(true);
    expect(Array.isArray(result.hashtags)).toBe(true);
    expect(typeof result.hookScore).toBe('number');
  }, 15000);
});
