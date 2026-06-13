import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as videoService from './services/videoService.js';
import fsExtra from 'fs-extra';
import axios from 'axios';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(''),
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockImplementation((p: string) => Promise.resolve(p.includes('_exists'))),
    readdir: vi.fn().mockResolvedValue([]),
    existsSync: vi.fn().mockImplementation((p: string) => p.includes('_exists')),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(''),
  remove: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockImplementation((p: string) => Promise.resolve(p.includes('_exists'))),
  readdir: vi.fn().mockResolvedValue([]),
  existsSync: vi.fn().mockImplementation((p: string) => p.includes('_exists')),
}));

vi.mock('./services/videoService.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./services/videoService.js')>();
  return {
    ...original,
    runFFmpeg: vi.fn(async () => ({ stdout: '', stderr: '' })),
    runFFmpegWithFallback: vi.fn(async () => {}),
    runInWorker: vi.fn(async () => ({ status: 'success', stdout: '', stderr: '' })),
    getVideoDuration: vi.fn(async () => 30.0),
  };
});

vi.mock('./lib/logger.js', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}));

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({ object: {} }),
  generateText: vi.fn().mockResolvedValue({ text: 'mock text' }),
}));

vi.mock('./lib/ai-provider.js', () => ({
  getAIModelChain: vi.fn().mockReturnValue([{ modelId: 'gemini-2.5-flash' }]),
}));

vi.mock('./lib/ai-utils.js', () => ({
  withFallbackAndRetry: vi.fn(async (fn: any, _models: any, _retries: number, _delay: number, _useAll: boolean) => {
    return {
      object: {
        titles: [
          { title: 'Viral Title 1', style: 'curiosity' as const, ctaIncluded: true, emojiCount: 1 },
          { title: 'Viral Title 2', style: 'emotional' as const, ctaIncluded: false, emojiCount: 2 },
        ],
        hashtags: [
          { tag: '#viral', category: 'trend' as const, estimatedReach: 'high' as const },
          { tag: '#test', category: 'niche' as const, estimatedReach: 'medium' as const },
        ],
        trendingTopics: ['topic1', 'topic2'],
      },
    };
  }),
}));

vi.mock('./lib/colab-manager.js', () => ({
  colab: {
    getState: vi.fn(() => ({
      status: 'running',
      ngrokUrl: 'https://mock-colab.ngrok-free.dev',
      gpuMemoryGB: 16,
      gpuUsedGB: 4,
      gpuUtilizationPct: 25,
      lastHealthCheck: new Date().toISOString(),
      lastError: null,
      startedAt: new Date().toISOString(),
      uptimeSeconds: 100,
      runtimeSeconds: 100
    })),
    start: vi.fn(async () => ({ ngrokUrl: 'https://mock-colab.ngrok-free.dev' })),
    stop: vi.fn(async () => {}),
    connect: vi.fn(async () => ({ ngrokUrl: 'https://mock-colab.ngrok-free.dev' })),
    scheduleIdleStop: vi.fn(),
    cancelIdleStop: vi.fn(),
    isHealthy: vi.fn(() => true),
    verifyLibraries: vi.fn(async () => ({ success: true, report: { diffusers: true } })),
    on: vi.fn(),
    off: vi.fn()
  }
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { status: 'success', output_path: '/output.mp4' } }),
    get: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } }
    })),
    interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } }
  }
}));

vi.mock('./services/aiService.js', () => ({
  generateStudioScenes: vi.fn().mockResolvedValue({
    scenes: [{ sceneNumber: 1, videoPrompt: 'Test scene', speechText: 'Hello', sfxPrompt: '' }],
    marketing: {
      ytTitle: 'Test Title',
      ytDesc: 'Test Desc',
      ytTags: 'test,tags',
      ttDesc: 'Test TT',
      ttTags: 'mock,tt',
      xDesc: 'Mock X',
      xTags: 'mock,x',
      metaDesc: 'Mock Meta',
      metaTags: 'mock,meta'
    }
  }),
  translateText: vi.fn().mockResolvedValue('Translated text'),
  withFallbackAndRetry: vi.fn(async (fn) => {
    return {
      object: {
        titles: [{ title: 'Test Title', style: 'curiosity', ctaIncluded: true, emojiCount: 2 }],
        hashtags: [{ tag: '#test', platform: 'youtube', category: 'niche', estimatedReach: '10K' }]
      }
    };
  }),
  generateObject: vi.fn().mockResolvedValue({
    object: {
      titles: [{ title: 'Test Title', style: 'curiosity', ctaIncluded: true, emojiCount: 2 }],
      hashtags: [{ tag: '#test', platform: 'youtube', category: 'niche', estimatedReach: '10K' }]
    }
  }),
  generateText: vi.fn().mockResolvedValue({ text: 'Generated text' }),
  getAIModelChain: vi.fn(() => [
    { chat: () => ({ messages: [] }) }
  ]),
}));

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AutoDubbing', () => {
  let stretchAudioToDuration: any;
  let replaceAudioTrack: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/autoDubbing.js');
    stretchAudioToDuration = mod.stretchAudioToDuration;
    replaceAudioTrack = mod.replaceAudioTrack;
  });

  describe('stretchAudioToDuration()', () => {
    it('should use atempo filter for duration changes', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '15.0', stderr: '' });

      await stretchAudioToDuration('/input.wav', 30.0, '/output.wav');

      expect(runFFmpegSpy).toHaveBeenCalled();
    });
  });

  describe('replaceAudioTrack()', () => {
    it('should call runFFmpegWithFallback with map for audio replacement', async () => {
      const runFFmpegWithFallbackSpy = vi.mocked(videoService.runFFmpegWithFallback);
      runFFmpegWithFallbackSpy.mockResolvedValue(undefined);

      await replaceAudioTrack('/video.mp4', '/new_audio.wav', '/output.mp4');

      expect(runFFmpegWithFallbackSpy).toHaveBeenCalled();
    });
  });
});

describe('ViralHook', () => {
  let generateViralTitles: any;
  let generateHashtags: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/viralHook.js');
    generateViralTitles = mod.generateViralTitles;
    generateHashtags = mod.generateHashtags;
  });

  describe('generateViralTitles()', () => {
    it('should return array of viral title suggestions', async () => {
      const result = await generateViralTitles('Test topic', 5);

      expect(result).toHaveProperty('titles');
      expect(Array.isArray(result.titles)).toBe(true);
    });
  });

  describe('generateHashtags()', () => {
    it('should return hashtag suggestions for platform', async () => {
      const result = await generateHashtags('Test content', 'youtube');

      expect(result).toHaveProperty('hashtags');
      expect(Array.isArray(result.hashtags)).toBe(true);
    });
  });
});

describe('EmotionCaptions', () => {
  let generateHighlightSrt: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/emotionCaptions.js');
    generateHighlightSrt = mod.generateHighlightSrt;
  });

  describe('generateHighlightSrt()', () => {
    it('should generate SRT entries with highlight styling', async () => {
      const transcript = 'Hello world. This is amazing!';
      const peaks = [
        { startSeconds: 0.0, endSeconds: 2.0, word: 'Wow', intensity: 0.9, suggestedColor: '#FF4444' },
        { startSeconds: 2.0, endSeconds: 4.0, word: 'Amazing', intensity: 0.6, suggestedColor: '#FF9500' }
      ];

      const result = generateHighlightSrt(transcript, peaks);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('index');
      expect(result[0]).toHaveProperty('text');
    });
  });
});

describe('AiBroll', () => {
  let generateBroll: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/aiBroll.js');
    generateBroll = mod.generateBroll;
  });

  describe('generateBroll()', () => {
    it('should return GenerateBrollResult with output path', async () => {
      const axiosPostSpy = vi.mocked(axios.post);
      axiosPostSpy.mockResolvedValue({
        data: { status: 'success', video_path: '/broll.mp4' }
      });

      const result = await generateBroll(['nature', 'landscape'], 5.0);

      expect(result).toHaveProperty('outputPath');
      expect(result).toHaveProperty('success');
    });

    it('should return error when colab call fails', async () => {
      const axiosPostSpy = vi.mocked(axios.post);
      axiosPostSpy.mockRejectedValue(new Error('Colab error'));

      const result = await generateBroll(['test'], 5.0);

      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
    });
  });
});

describe('StudioSound', () => {
  let enhanceAudio: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/studioSound.js');
    enhanceAudio = mod.enhanceAudio;
  });

  describe('enhanceAudio()', () => {
    it('should call runFFmpegWithFallback with audio filters', async () => {
      const runFFmpegWithFallbackSpy = vi.mocked(videoService.runFFmpegWithFallback);
      runFFmpegWithFallbackSpy.mockResolvedValue(undefined);

      await enhanceAudio('/input.mp4', '/output.mp4');

      expect(runFFmpegWithFallbackSpy).toHaveBeenCalled();
    });
  });
});

describe('EyeContact', () => {
  let correctEyeContact: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/eyeContact.js');
    correctEyeContact = mod.correctEyeContact;
  });

  describe('correctEyeContact()', () => {
    it('should return EyeContactResult with processed video path', async () => {
      const axiosPostSpy = vi.mocked(axios.post);
      axiosPostSpy.mockResolvedValue({
        data: { status: 'success', output_path: '/corrected.mp4' }
      });

      (fsExtra.pathExists as any).mockResolvedValue(true);

      const result = await correctEyeContact('/input.mp4', '/output.mp4');

      expect(result).toHaveProperty('processedVideoPath');
      expect(result).toHaveProperty('usedFallback');
    });

    it('should use fallback when colab not running', async () => {
      const { colab } = await import('./lib/colab-manager.js');
      vi.mocked(colab.getState).mockReturnValue({
        status: 'stopped',
        ngrokUrl: null as any,
        gpuMemoryGB: 0,
        gpuUsedGB: 0,
        gpuUtilizationPct: 0,
        lastHealthCheck: new Date().toISOString(),
        lastError: null,
        startedAt: new Date().toISOString(),
        uptimeSeconds: 0,
        runtimeSeconds: 0
      });

      const result = await correctEyeContact('/input.mp4', '/output.mp4');

      expect(result.usedFallback).toBe(true);
      expect(result.processedVideoPath).toBe('/input.mp4');
    });
  });
});

describe('Inpainting', () => {
  let inpaintObjects: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/inpainting.js');
    inpaintObjects = mod.inpaintObjects;
  });

  describe('inpaintObjects()', () => {
    it('should return InpaintResult with output video path', async () => {
      const axiosPostSpy = vi.mocked(axios.post);
      axiosPostSpy.mockResolvedValue({
        data: { status: 'success', output_path: '/inpainted.mp4' }
      });

      (fsExtra.pathExists as any).mockResolvedValue(true);

      const maskRegions = [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }];
      const result = await inpaintObjects('/input.mp4', maskRegions, '/output.mp4');

      expect(result).toHaveProperty('outputVideoPath');
      expect(result).toHaveProperty('usedFallback');
    });

    it('should use fallback when colab not running', async () => {
      const { colab } = await import('./lib/colab-manager.js');
      vi.mocked(colab.getState).mockReturnValue({
        status: 'stopped',
        ngrokUrl: null as any,
        gpuMemoryGB: 0,
        gpuUsedGB: 0,
        gpuUtilizationPct: 0,
        lastHealthCheck: new Date().toISOString(),
        lastError: null,
        startedAt: new Date().toISOString(),
        uptimeSeconds: 0,
        runtimeSeconds: 0
      });

      const maskRegions = [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }];
      const result = await inpaintObjects('/input.mp4', maskRegions, '/output.mp4');

      expect(result.usedFallback).toBe(true);
    });

    it('should return error when no mask regions provided', async () => {
      const { colab } = await import('./lib/colab-manager.js');
      vi.mocked(colab.getState).mockReturnValue({
        status: 'running',
        ngrokUrl: 'https://mock-colab.ngrok-free.dev',
        gpuMemoryGB: 16,
        gpuUsedGB: 4,
        gpuUtilizationPct: 25,
        lastHealthCheck: new Date().toISOString(),
        lastError: null,
        startedAt: new Date().toISOString(),
        uptimeSeconds: 100,
        runtimeSeconds: 100
      });

      const copySpy = vi.mocked(fsExtra.copy);
      copySpy.mockResolvedValue(undefined);

      const result = await inpaintObjects('/input.mp4', [], '/output.mp4');

      expect(result.usedFallback).toBe(true);
      expect(result).toHaveProperty('error', 'No mask regions provided');
    });
  });
});

export default {};
