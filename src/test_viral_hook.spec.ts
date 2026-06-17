import { describe, it, expect } from 'vitest';
import type { Platform } from './services/viralHook.js';

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

import { FIXTURES } from './__fixtures__/index.js';

describe('viralHook', () => {
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
        numbers: 30,
      },
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
      score: 15,
      hookType: 'question',
      pacingScore: 8.0,
      visualAppealScore: 7.0,
      audioClarityScore: 6.5,
      attentionRetentionScore: 7.5,
      strengths: [],
      weaknesses: [],
      improvementTips: [],
    };
    expect(() => HookQualitySchema.parse(invalid)).toThrow();
  });

  // ── ViralTitlesSchema ──────────────────────────────────────────────────────

  it('ViralTitlesSchema interface fields', () => {
    const valid = {
      titles: [
        {
          title: 'Test basligi 2026',
          style: 'curiosity' as const,
          ctaIncluded: true,
          emojiCount: 1,
        },
        {
          title: 'Sans feci bilgi',
          style: 'stat-driven' as const,
          ctaIncluded: false,
          emojiCount: 2,
        },
      ],
    };
    const result = ViralTitlesSchema.parse(valid);
    expect(result.titles.length).toBe(2);
    expect(result.titles[0].title).toBe('Test basligi 2026');
    expect(result.titles[0].ctaIncluded).toBe(true);
    expect(result.titles[0].emojiCount).toBe(1);
  });

  it('ViralTitlesSchema rejects invalid style', () => {
    const invalid = {
      titles: [{ title: 'test', style: 'invalid_style', ctaIncluded: false, emojiCount: 0 }],
    };
    expect(() => ViralTitlesSchema.parse(invalid)).toThrow();
  });

  // ── HashtagsSchema ──────────────────────────────────────────────────────────

  it('HashtagsSchema interface fields', () => {
    const valid = {
      hashtags: [
        { tag: '#viral', platform: 'youtube', category: 'trend' as const, estimatedReach: '100K' },
        {
          tag: '#tutorial',
          platform: 'youtube',
          category: 'niche' as const,
          estimatedReach: '10K',
        },
      ],
      trendingTopics: ['#AI2026'],
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
        { tag: '#test', platform: 'tiktok', category: 'generic' as const, estimatedReach: '1K' },
      ],
    };
    const result = HashtagsSchema.parse(minimal);
    expect(result.hashtags.length).toBe(1);
    expect(result.trendingTopics).toBeUndefined();
  });

  // ── generateViralTitles ─────────────────────────────────────────────────────

  it('generateViralTitles returns array', async () => {
    const result = await generateViralTitles('AI technology trends', 5);
    expect(Array.isArray(result.titles)).toBe(true);
    expect(result.titles.length).toBeGreaterThan(0);
    expect(result.titles[0]).toHaveProperty('title');
    expect(result.titles[0]).toHaveProperty('style');
  }, 60000);

  it('generateViralTitles returns array with different styles', async () => {
    const result = await generateViralTitles('test topic');
    expect(result.titles.length).toBeGreaterThan(0);
    const styles = result.titles.map((t: any) => t.style);
    expect(styles.length).toBeGreaterThan(0);
  }, 60000);

  // ── generateHashtags ───────────────────────────────────────────────────────

  it('generateHashtags returns array', async () => {
    const result = await generateHashtags('artificial intelligence video', 'youtube');
    expect(Array.isArray(result.hashtags)).toBe(true);
    expect(result.hashtags.length).toBeGreaterThan(0);
    expect(result.hashtags[0]).toHaveProperty('tag');
    expect(result.hashtags[0]).toHaveProperty('platform');
    expect(result.hashtags[0]).toHaveProperty('category');
  }, 60000);

  it('generateHashtags works for all platforms', async () => {
    const platforms: Platform[] = ['youtube', 'tiktok', 'x', 'meta'];
    for (const platform of platforms) {
      const result = await generateHashtags('content', platform);
      expect(Array.isArray(result.hashtags)).toBe(true);
    }
  }, 60000);

  // ── analyzeHookQuality ─────────────────────────────────────────────────────

  it('analyzeHookQuality returns HookQualitySchema shape', async () => {
    const result = await analyzeHookQuality(FIXTURES.video);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('hookType');
    expect(result).toHaveProperty('openerStrength');
  }, 60000);

  // ── optimizeForViral ────────────────────────────────────────────────────────

  it('optimizeForViral combines hook + titles + hashtags', async () => {
    const result = await optimizeForViral(FIXTURES.video, 'AI topic', 'youtube');
    expect(result).toHaveProperty('hookScore');
    expect(result).toHaveProperty('titles');
    expect(result).toHaveProperty('hashtags');
    expect(Array.isArray(result.titles)).toBe(true);
    expect(Array.isArray(result.hashtags)).toBe(true);
  }, 60000);

  // ── ViralContentSchema ─────────────────────────────────────────────────────

  it('ViralContentSchema interface fields', () => {
    const valid = {
      titles: ['Title 1', 'Title 2'],
      hashtags: ['#test', '#viral'],
      hookScore: 75,
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
    const result = await generateViralContent(FIXTURES.video, 'test transcript');
    expect(Array.isArray(result.titles)).toBe(true);
    expect(Array.isArray(result.hashtags)).toBe(true);
    expect(typeof result.hookScore).toBe('number');
  }, 60000);
});
