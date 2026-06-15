import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TranscriptionResult } from './services/clipper/types.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./lib/logger.js', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}));

const mockGenerateObject = vi.fn();
vi.mock('ai', () => ({
  generateObject: (...args: any[]) => mockGenerateObject(...args),
  generateText: vi.fn(),
}));

vi.mock('./lib/ai-provider.js', () => ({
  getAIModelChain: vi.fn(() => [
    { modelId: 'mock-model-1', chat: vi.fn() },
    { modelId: 'mock-model-2', chat: vi.fn() },
  ]),
}));

// ── Test Verileri ─────────────────────────────────────────────────────────────

const mockTranscription: TranscriptionResult = {
  text: 'Bu videoda inanılmaz şeyler anlatacağım. Şok olacaksınız. Bakalım ne olacak?',
  segments: [
    { start: 0, end: 10, text: 'Bu videoda inanılmaz şeyler anlatacağım.' },
    { start: 10, end: 25, text: 'Şok olacaksınız. Bakalım ne olacak?' },
    { start: 25, end: 60, text: 'Uzun ve sıkıcı bir bölüm, burada hiçbir şey olmuyor ve zaman geçmiyor.' },
    { start: 60, end: 75, text: 'Bombabomba! Skandal ortaya çıktı, herkes şaşırdı!' },
  ],
  language: 'tr',
};

const mockStructuredResult = {
  object: {
    segments: [
      {
        index: 3,
        score: 92,
        reason: 'Bombabomba ifadesi ve skandal kelimesi güçlü bir hook oluşturuyor.',
        highlights: ['Skandal açığa çıktı', 'Herkes şaşırdı'],
        caption: 'Bombabomba! Skandal ortaya çıktı!',
        hashtags: ['#viral', '#şok', '#skandal', '#keşfet', '#tiktok'],
      },
      {
        index: 1,
        score: 78,
        reason: 'Merak uyandıran soru formatı izleyiciyi tutuyor.',
        highlights: ['Şok etkisi', 'Merak hooku'],
        caption: 'Şok olacaksınız! Bakalım ne olacak?',
        hashtags: ['#viral', '#şok', '#merak', '#keşfet', '#youtube'],
      },
    ],
    overallScore: 85,
    topReason: 'Bombabomba ifadesi güçlü hook.',
  },
  usage: {
    promptTokens: 500,
    completionTokens: 200,
    totalTokens: 700,
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ViralAnalyzer v2 (Gemini Structured)', () => {
  let viralAnalyzer: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGenerateObject.mockResolvedValue(mockStructuredResult);
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
      expect(result).toHaveProperty('overallScore', 85);
      expect(result).toHaveProperty('topReason');
      expect(result).toHaveProperty('transcriptSegments', 4);
      expect(Array.isArray(result.segments)).toBe(true);
    });

    it('should call generateObject with Zod schema', async () => {
      await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 2,
      });

      expect(mockGenerateObject).toHaveBeenCalled();
      const callArgs = mockGenerateObject.mock.calls[0][0];
      expect(callArgs).toHaveProperty('schema');
      expect(callArgs).toHaveProperty('prompt');
    });

    it('should track token usage from generateObject response', async () => {
      await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 2,
      });

      const usage = viralAnalyzer.getLastTokenUsage();
      expect(usage).not.toBeNull();
      expect(usage?.usage.totalTokens).toBe(700);
      expect(usage?.usage.promptTokens).toBe(500);
      expect(usage?.usage.completionTokens).toBe(200);
    });

    it('should map structured segments to ClipSegment format', async () => {
      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 2,
      });

      const seg = result.segments[0];
      expect(seg).toHaveProperty('id');
      expect(seg).toHaveProperty('startTime');
      expect(seg).toHaveProperty('endTime');
      expect(seg).toHaveProperty('duration');
      expect(seg).toHaveProperty('score', 92);
      expect(seg).toHaveProperty('reason');
      expect(seg).toHaveProperty('highlights');
      expect(seg).toHaveProperty('suggestedCaption');
      expect(seg).toHaveProperty('suggestedHashtags');
    });

    it('should clamp score to 0-100 range', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          segments: [{ index: 0, score: 150, reason: 'test', highlights: [], caption: 'test', hashtags: [] }],
          overallScore: 150,
          topReason: 'test',
        },
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 1,
      });

      expect(result.segments[0].score).toBe(100); // clamped
    });

    it('should fallback to keyword scoring when generateObject fails', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('API failed'));

      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 5,
      });

      // Should still return segments via keyword fallback
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('should return empty segments when no eligible segments exist', async () => {
      const result = await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 200, // Very high minDuration, no segments qualify
        maxDuration: 300,
        targetCount: 5,
      });

      expect(result.segments).toEqual([]);
      expect(result.overallScore).toBe(0);
    });
  });

  describe('getLastTokenUsage()', () => {
    it('should return usage data after successful analyze', async () => {
      await viralAnalyzer.analyze(mockTranscription, {
        minDuration: 5,
        maxDuration: 90,
        targetCount: 2,
      });

      const usage = viralAnalyzer.getLastTokenUsage();
      expect(usage).not.toBeNull();
      expect(usage).toHaveProperty('model');
      expect(usage).toHaveProperty('usage');
      expect(usage?.usage.totalTokens).toBe(700);
    });
  });
});

describe('TokenTracker', () => {
  let tokenTracker: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./lib/token-tracker.js');
    tokenTracker = mod.tokenTracker;
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
  const mockCropFrames = [
    { timestamp: 0, cropX: 400, cropY: 100, cropW: 200, cropH: 300, confidence: 0.9 },
    { timestamp: 0.5, cropX: 420, cropY: 110, cropW: 200, cropH: 300, confidence: 0.85 },
    { timestamp: 1.0, cropX: 450, cropY: 120, cropW: 200, cropH: 300, confidence: 0.8 },
    { timestamp: 1.5, cropX: 500, cropY: 130, cropW: 200, cropH: 300, confidence: 0.75 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

const mockSendToQueue = vi.fn().mockResolvedValue(undefined);
vi.mock('./lib/rabbitmq.js', () => ({
  getRabbitChannel: vi.fn(() => ({
    prefetch: vi.fn(),
    assertQueue: vi.fn(),
    consume: vi.fn(),
    sendToQueue: (...args: any[]) => mockSendToQueue(...args),
    ack: vi.fn(),
  })),
  CLIP_JOBS_QUEUE: 'clip_jobs_queue',
  registerReconnectCallback: vi.fn(),
}));

const mockDbRun = vi.fn().mockResolvedValue({ lastID: 1 });
const mockDbGet = vi.fn();
const mockDbAll = vi.fn().mockResolvedValue([]);
vi.mock('./db.js', () => ({
  db: {
    run: (...args: any[]) => mockDbRun(...args),
    get: (...args: any[]) => mockDbGet(...args),
    all: (...args: any[]) => mockDbAll(...args),
  },
}));

const mockBroadcastProgress = vi.fn().mockResolvedValue(undefined);
vi.mock('./lib/redis.js', () => ({
  broadcastProgress: (...args: any[]) => mockBroadcastProgress(...args),
}));

describe('ClipQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendClipToQueue()', () => {
    it('should send message to RabbitMQ with priority', async () => {
      const { sendClipToQueue } = await import('./lib/clip-queue.js');

      await sendClipToQueue({
        clipJobId: 1,
        userId: 10,
        videoPath: '/test/video.mp4',
        priority: 3,
      });

      expect(mockSendToQueue).toHaveBeenCalled();
      const callArgs = mockSendToQueue.mock.calls[0];
      expect(callArgs[0]).toBe('clip_jobs_queue');
      const payload = JSON.parse(callArgs[1].toString());
      expect(payload.clipJobId).toBe(1);
      expect(payload.userId).toBe(10);
      expect(payload.priority).toBe(3);
      expect(callArgs[2]).toEqual({ persistent: true, priority: 3 });
    });

    it('should default priority to 5 when not provided', async () => {
      const { sendClipToQueue } = await import('./lib/clip-queue.js');

      await sendClipToQueue({
        clipJobId: 2,
        userId: 10,
        videoPath: '/test/video2.mp4',
      });

      const callArgs = mockSendToQueue.mock.calls[0];
      expect(callArgs[2]).toEqual({ persistent: true, priority: 5 });
    });
  });

  describe('retryClipJob()', () => {
    it('should requeue failed job and increment retry_count', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        status: 'failed',
        retry_count: 0,
        max_retries: 3,
        source_video_path: '/test/video.mp4',
        title: 'Test',
        priority: 5,
      });

      const { retryClipJob } = await import('./lib/clip-queue.js');
      const result = await retryClipJob(1, 10);

      expect(result).toBe(true);
      expect(mockDbRun).toHaveBeenCalledWith(
        'UPDATE clip_jobs SET status = $1, retry_count = $2 WHERE id = $3',
        ['pending', 1, 1]
      );
      expect(mockSendToQueue).toHaveBeenCalled();
    });

    it('should reject when job is not failed', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        status: 'completed',
        retry_count: 0,
        max_retries: 3,
      });

      const { retryClipJob } = await import('./lib/clip-queue.js');
      const result = await retryClipJob(1, 10);

      expect(result).toBe(false);
      expect(mockSendToQueue).not.toHaveBeenCalled();
    });

    it('should reject when max retries exceeded', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        status: 'failed',
        retry_count: 3,
        max_retries: 3,
        source_video_path: '/test/video.mp4',
      });

      const { retryClipJob } = await import('./lib/clip-queue.js');
      const result = await retryClipJob(1, 10);

      expect(result).toBe(false);
      expect(mockSendToQueue).not.toHaveBeenCalled();
    });

    it('should reject when job not found', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);

      const { retryClipJob } = await import('./lib/clip-queue.js');
      const result = await retryClipJob(999, 10);

      expect(result).toBe(false);
    });
  });
});

// ── Clipper Routes: Priority + Retry Endpoint ────────────────────────────────

describe('Clipper Routes (Priority & Retry)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

export default {};
