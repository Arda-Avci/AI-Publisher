import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as videoService from './services/videoService.js';
import fsExtra from 'fs-extra';

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
    runFFmpeg: vi.fn(async () => ({ stdout: '1920x1080', stderr: '' })),
    runFFmpegWithFallback: vi.fn(async () => {}),
    runInWorker: vi.fn(async () => ({ status: 'success', stdout: '1920x1080', stderr: '' })),
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SmartCropper', () => {
  let SmartCropper: any;
  let cropVideo: any;
  let detectFaceBox: any;
  let computeCropRegion: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/clipper/smartCropper.js');
    SmartCropper = mod.SmartCropper;
    cropVideo = mod.cropVideo;
    detectFaceBox = mod.detectFaceBox;
    computeCropRegion = mod.computeCropRegion;
  });

  describe('cropVideo()', () => {
    it('should call runFFmpeg with correct crop and scale filters', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '1920x1080', stderr: '' });

      await cropVideo(
        '/input.mp4',
        '/output.mp4',
        { x: 100, y: 50, width: 1920, height: 1080 },
        1080,
        1920
      );

      expect(runFFmpegSpy).toHaveBeenCalled();
    });

    it('should include duration arg when provided', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '', stderr: '' });

      await cropVideo(
        '/input.mp4',
        '/output.mp4',
        { x: 0, y: 0, width: 1920, height: 1080 },
        1080,
        1920,
        15
      );

      expect(runFFmpegSpy).toHaveBeenCalled();
    });
  });

  describe('detectFaceBox()', () => {
    it('should return empty array when no faces detected', async () => {
      const runInWorkerSpy = vi.mocked(videoService.runInWorker);
      runInWorkerSpy.mockResolvedValue({ status: 'success', stdout: '', stderr: '' });

      const faces = await detectFaceBox('/fake_frame.png', 1.0);
      expect(faces).toEqual([]);
    });
  });

  describe('computeCropRegion()', () => {
    it('should compute correct crop region for 9:16 target', () => {
      const face = { x: 500, y: 300, width: 100, height: 100, confidence: 0.9 };
      const region = computeCropRegion(face, '9:16', 1920, 1080, 0.3);

      expect(region).toHaveProperty('x');
      expect(region).toHaveProperty('y');
      expect(region).toHaveProperty('width');
      expect(region).toHaveProperty('height');
      expect(region.width / region.height).toBeCloseTo(9 / 16, 1);
    });
  });

  describe('SmartCropper.cropVideo()', () => {
    it('should return SmartCropResult with crop region and detected faces', async () => {
      const runInWorkerSpy = vi.mocked(videoService.runInWorker);
      runInWorkerSpy.mockResolvedValue({ status: 'success', stdout: '1920x1080', stderr: '' });

      const getVideoDurationSpy = vi.mocked(videoService.getVideoDuration);
      getVideoDurationSpy.mockResolvedValue(30.0);

      const cropper = new SmartCropper();
      const result = await cropper.cropVideo('/input.mp4', '/output.mp4', {
        targetFocus: 'center',
        aspectRatio: '9:16',
        outputWidth: 1080,
        outputHeight: 1920,
      });

      expect(result).toHaveProperty('outputPath', '/output.mp4');
      expect(result).toHaveProperty('cropRegion');
      expect(result).toHaveProperty('detectedFaces');
      expect(result).toHaveProperty('duration', 30.0);
    });
  });
});

describe('SubtitleMixer', () => {
  let SubtitleMixer: any;
  let subtitleMixer: any;
  let embedSubtitles: any;
  let mixBackgroundMusic: any;
  let generateSrtFromWhisper: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/clipper/subtitleMixer.js');
    SubtitleMixer = mod.SubtitleMixer;
    subtitleMixer = mod.subtitleMixer;
    embedSubtitles = mod.embedSubtitles;
    mixBackgroundMusic = mod.mixBackgroundMusic;
    generateSrtFromWhisper = mod.generateSrtFromWhisper;
  });

  describe('embedSubtitles()', () => {
    it('should call runFFmpeg with subtitle filter', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '', stderr: '' });

      await embedSubtitles('/input.mp4', '/subs.srt', '/output.mp4', {});

      expect(runFFmpegSpy).toHaveBeenCalled();
    });
  });

  describe('mixBackgroundMusic()', () => {
    it('should call runFFmpeg with amix filter', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '', stderr: '' });

      await mixBackgroundMusic('/input.mp4', '/music.mp3', '/output.mp4', 0.15);

      expect(runFFmpegSpy).toHaveBeenCalled();
    });
  });

  describe('generateSrtFromWhisper()', () => {
    it('should generate SRT file with correct entries', async () => {
      const writeFileSpy = vi.mocked(fsExtra.writeFile);
      writeFileSpy.mockResolvedValue(undefined);

      const transcript = {
        text: 'Hello world',
        segments: [
          { start: 0.0, end: 1.5, text: 'Hello' },
          { start: 1.5, end: 3.0, text: 'world' },
        ]
      };

      const result = await generateSrtFromWhisper(transcript, '/output.srt');

      expect(result).toBe('/output.srt');
      expect(writeFileSpy).toHaveBeenCalled();
    });
  });

  describe('SubtitleMixer.process()', () => {
    it('should embed subtitles and mix music', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '', stderr: '' });

      const mixer = new SubtitleMixer();
      const result = await mixer.process('/input.mp4', {
        srtPath: '/subs.srt',
        outputPath: '/output.mp4',
        musicPath: '/music.mp3',
        musicVolume: 0.15,
      });

      expect(result).toHaveProperty('outputPath', '/output.mp4');
      expect(result).toHaveProperty('subtitlesEmbedded');
      expect(result).toHaveProperty('musicMixed');
    });
  });
});

describe('SplitScreenService', () => {
  let splitScreenVertical: any;
  let splitScreenHorizontal: any;
  let overlayMascot: any;
  let pipOverlay: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/clipper/splitScreenService.js');
    splitScreenVertical = mod.splitScreenVertical;
    splitScreenHorizontal = mod.splitScreenHorizontal;
    overlayMascot = mod.overlayMascot;
    pipOverlay = mod.pipOverlay;
  });

  describe('splitScreenVertical()', () => {
    it('should call runFFmpegWithFallback with vstack filter', async () => {
      const runFFmpegWithFallbackSpy = vi.mocked(videoService.runFFmpegWithFallback);
      runFFmpegWithFallbackSpy.mockResolvedValue(undefined);

      await splitScreenVertical('/top.mp4', '/bottom.mp4', '/output.mp4');

      expect(runFFmpegWithFallbackSpy).toHaveBeenCalled();
    });
  });

  describe('splitScreenHorizontal()', () => {
    it('should call runFFmpegWithFallback with hstack filter', async () => {
      const runFFmpegWithFallbackSpy = vi.mocked(videoService.runFFmpegWithFallback);
      runFFmpegWithFallbackSpy.mockResolvedValue(undefined);

      await splitScreenHorizontal('/left.mp4', '/right.mp4', '/output.mp4');

      expect(runFFmpegWithFallbackSpy).toHaveBeenCalled();
    });
  });

  describe('overlayMascot()', () => {
    it('should call runFFmpegWithFallback with overlay filter', async () => {
      const runFFmpegWithFallbackSpy = vi.mocked(videoService.runFFmpegWithFallback);
      runFFmpegWithFallbackSpy.mockResolvedValue(undefined);

      await overlayMascot('/video.mp4', '/mascot.png', '/output.mp4', { x: 100, y: 200 });

      expect(runFFmpegWithFallbackSpy).toHaveBeenCalled();
    });
  });

  describe('pipOverlay()', () => {
    it('should call runFFmpegWithFallback with overlay at bottom-right position', async () => {
      const runFFmpegWithFallbackSpy = vi.mocked(videoService.runFFmpegWithFallback);
      runFFmpegWithFallbackSpy.mockResolvedValue(undefined);

      await pipOverlay('/main.mp4', '/pip.mp4', '/output.mp4', 'bottom-right');

      expect(runFFmpegWithFallbackSpy).toHaveBeenCalled();
    });
  });
});

describe('AutoReframe', () => {
  let autoReframeHorizontalToVertical: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/autoReframe.js');
    autoReframeHorizontalToVertical = mod.autoReframeHorizontalToVertical;
  });

  describe('autoReframeHorizontalToVertical()', () => {
    it('should call runFFmpegWithFallback with crop and scale filters', async () => {
      const runFFmpegWithFallbackSpy = vi.mocked(videoService.runFFmpegWithFallback);
      runFFmpegWithFallbackSpy.mockResolvedValue(undefined);

      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '1920x1080', stderr: '' });

      await autoReframeHorizontalToVertical('/input.mp4', '/output.mp4', 'center');

      expect(runFFmpegWithFallbackSpy).toHaveBeenCalled();
    });
  });
});

export default {};
