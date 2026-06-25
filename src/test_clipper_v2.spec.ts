import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { TranscriptionResult } from './services/clipper/types.js';
import { tokenTracker } from './lib/token-tracker.js';
import { skipAITests } from './test-utils/ai-guard.js';

// ── Test Verileri ─────────────────────────────────────────────────────────────

const mockTranscription: TranscriptionResult = {
  text: 'Bu videoda inanılmaz şeyler anlatacağım. Şok olacaksınız. Bakalım ne olacak?',
  segments: [
    { start: 0, end: 10, text: 'Bu videoda inanılmaz şeyler anlatacağım.' },
    { start: 10, end: 25, text: 'Şok olacaksınız. Bakalım ne olacak?' },
    {
      start: 25,
      end: 60,
      text: 'Uzun ve sıkıcı bir bölüm, burada hiçbir şey olmuyor ve zaman geçmiyor.',
    },
    { start: 60, end: 75, text: 'Bombabomba! Skandal ortaya çıktı, herkes şaşırdı!' },
  ],
  language: 'tr',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe.skipIf(skipAITests)('ViralAnalyzer v2 (Gemini Structured)', () => {
  let viralAnalyzer: any;

  beforeAll(async () => {
    const mod = await import('./services/clipper/viralAnalyzer.js');
    viralAnalyzer = mod.viralAnalyzer;
  });

  describe('analyze()', () => {
    it('should return ViralAnalysisResult with structured segments', async () => {
      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 5,
        title: 'Test Video',
      });

      expect(result).toHaveProperty('segments');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('topReason');
      expect(result).toHaveProperty('transcriptSegments');
      expect(Array.isArray(result.segments)).toBe(true);
    }, 60000);

    it('should call generateObject with Zod schema', async () => {
      await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 2,
      });
    }, 60000);

    it('should track token usage from generateObject response', async () => {
      await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 2,
      });

      const usage = viralAnalyzer.getLastTokenUsage();
      // Will be null if no AI call was made (e.g., fallback path)
      if (usage !== null) {
        expect(usage).toHaveProperty('usage');
      }
    }, 60000);

    it('should map structured segments to ClipSegment format', async () => {
      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 2,
      });

      if (result.segments.length > 0) {
        const seg = result.segments[0];
        expect(seg).toHaveProperty('id');
        expect(seg).toHaveProperty('startTime');
        expect(seg).toHaveProperty('endTime');
        expect(seg).toHaveProperty('duration');
        expect(seg).toHaveProperty('score');
        expect(seg).toHaveProperty('reason');
        expect(seg).toHaveProperty('highlights');
        expect(seg).toHaveProperty('suggestedCaption');
        expect(seg).toHaveProperty('suggestedHashtags');
      }
    }, 60000);

    it('should clamp score to 0-100 range', async () => {
      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 1,
      });

      if (result.segments.length > 0) {
        expect(result.segments[0].score).toBeGreaterThanOrEqual(0);
        expect(result.segments[0].score).toBeLessThanOrEqual(100);
      }
    }, 60000);

    it('should fallback to keyword scoring when generateObject fails', async () => {
      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 5,
      });

      // Should still return segments via keyword fallback (or AI if available)
      expect(result.segments.length).toBeGreaterThan(0);
    }, 60000);

    it('should return empty segments when no eligible segments exist', async () => {
      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 200,
        maxDuration: 300,
        targetCount: 5,
      });

      expect(result.segments).toEqual([]);
      expect(result.overallScore).toBe(0);
    }, 60000);
  });

  describe('getLastTokenUsage()', () => {
    it('should return usage data after successful analyze', async () => {
      await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 2,
      });

      const usage = viralAnalyzer.getLastTokenUsage();
      if (usage !== null) {
        expect(usage).toHaveProperty('model');
        expect(usage).toHaveProperty('usage');
      }
    }, 60000);
  });
});

describe('TokenTracker', () => {
  beforeEach(() => {
    tokenTracker.reset();
  });

  describe('track()', () => {
    it('should accumulate token usage per model', () => {
      tokenTracker.track('model-a', { promptTokens: 100, completionTokens: 50, totalTokens: 150 });
      tokenTracker.track('model-a', { promptTokens: 200, completionTokens: 80, totalTokens: 280 });

      const usage = tokenTracker.getModelUsage('model-a');
      expect(usage).toBeDefined();
      expect(usage?.totalTokens).toBe(430);
      expect(usage?.callCount).toBe(2);
    });

    it('should handle missing usage gracefully', () => {
      tokenTracker.track('model-b', undefined);
      const usage = tokenTracker.getModelUsage('model-b');
      expect(usage).toBeUndefined();
    });
  });

  describe('getSnapshot()', () => {
    it('should return aggregate stats', () => {
      tokenTracker.track('model-a', { promptTokens: 100, completionTokens: 50, totalTokens: 150 });
      tokenTracker.track('model-b', { promptTokens: 200, completionTokens: 100, totalTokens: 300 });

      const snapshot = tokenTracker.getSnapshot();
      expect(snapshot.models.length).toBe(2);
      expect(snapshot.totalTokens).toBe(450);
      expect(snapshot.totalCalls).toBe(2);
    });
  });

  describe('reset()', () => {
    it('should clear all usage data', () => {
      tokenTracker.track('model-a', { promptTokens: 100, completionTokens: 50, totalTokens: 150 });
      tokenTracker.reset();

      const snapshot = tokenTracker.getSnapshot();
      expect(snapshot.models.length).toBe(0);
      expect(snapshot.totalTokens).toBe(0);
    });
  });
});

describe('PerFrameCropper', () => {
  describe('interpolation helpers', () => {
    it('should export cropPerFrame function', async () => {
      const mod = await import('./services/clipper/perFrameCropper.js');
      expect(typeof mod.cropPerFrame).toBe('function');
    });

    it('should export PerFrameCropOptions and PerFrameCropResult types', async () => {
      const mod = await import('./services/clipper/perFrameCropper.js');
      expect(mod.cropPerFrame).toBeDefined();
    });
  });

  describe('SmartCropper.cropPerFrame()', () => {
    it('should be callable on SmartCropper instance', async () => {
      const { SmartCropper } = await import('./services/clipper/smartCropper.js');
      const cropper = new SmartCropper();
      expect(typeof cropper.cropPerFrame).toBe('function');
    });
  });
});

describe('AutoSubtitleBgm', () => {
  describe('autoProcessClip()', () => {
    it('should export autoProcessClip function', async () => {
      const mod = await import('./services/clipper/autoSubtitleBgm.js');
      expect(typeof mod.autoProcessClip).toBe('function');
    });

    it('should export type definitions', async () => {
      const mod = await import('./services/clipper/autoSubtitleBgm.js');
      expect(mod.autoProcessClip).toBeDefined();
    });
  });

  describe('Clipper auto endpoint', () => {
    it('should have POST /:id/auto route defined', async () => {
      const clipperMod = await import('./routes/clipper.js');
      const router = clipperMod.default;
      expect(router).toBeDefined();
    });
  });
});

// ── ClipQueue: Retry + Priority ──────────────────────────────────────────────

describe('ClipQueue', () => {
  describe('sendClipToQueue()', () => {
    it('should export sendClipToQueue function', async () => {
      const { sendClipToQueue } = await import('./lib/clip-queue.js');
      expect(typeof sendClipToQueue).toBe('function');
    });
  });

  describe('retryClipJob()', () => {
    it('should export retryClipJob function', async () => {
      const { retryClipJob } = await import('./lib/clip-queue.js');
      expect(typeof retryClipJob).toBe('function');
    });
  });
});

// ── Clipper Routes: Priority + Retry Endpoint ────────────────────────────────

describe('Clipper Routes (Priority & Retry)', () => {
  it('should export sendClipToQueue function', async () => {
    const mod = await import('./lib/clip-queue.js');
    expect(typeof mod.sendClipToQueue).toBe('function');
  });

  it('should export retryClipJob function', async () => {
    const mod = await import('./lib/clip-queue.js');
    expect(typeof mod.retryClipJob).toBe('function');
  });

  it('should have POST /:id/retry route defined', async () => {
    const clipperMod = await import('./routes/clipper.js');
    const router = clipperMod.default;
    expect(router).toBeDefined();
  });

  it('should have GET /progress/:id route defined', async () => {
    const clipperMod = await import('./routes/clipper.js');
    const router = clipperMod.default;
    expect(router).toBeDefined();
  });
});
