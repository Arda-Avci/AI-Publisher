import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as videoService from './services/videoService.js';
import fsExtra from 'fs-extra';

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

vi.mock('./services/videoService.js', () => ({
  runFFmpeg: vi.fn(async () => ({ stdout: '', stderr: '' })),
  runFFmpegWithFallback: vi.fn(async () => {}),
  runInWorker: vi.fn(async () => ({ status: 'success', stdout: '1920x1080', stderr: '' })),
  getVideoDuration: vi.fn(async () => 30.0),
  concatVideosWithCrossfade: vi.fn(async () => {}),
  WorkerResult: {},
}));

vi.mock('./lib/logger.js', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}));

describe('BeatAnalyzer', () => {
  let detectBPM: any;
  let findBeatPeaks: any;
  let buildBeatMarkers: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/beatAnalyzer.js');
    detectBPM = mod.detectBPM;
    findBeatPeaks = mod.findBeatPeaks;
    buildBeatMarkers = mod.buildBeatMarkers;
  });

  describe('detectBPM()', () => {
    it('should return a BPM number', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '120', stderr: '' });

      const bpm = await detectBPM('/audio_exists.wav');

      expect(typeof bpm).toBe('number');
      expect(bpm).toBeGreaterThan(0);
    });
  });

  describe('findBeatPeaks()', () => {
    it('should return array of beat markers', async () => {
      const beats = await findBeatPeaks('/audio_exists.wav', 120);

      expect(Array.isArray(beats)).toBe(true);
      expect(beats.length).toBeGreaterThan(0);
      expect(beats[0]).toHaveProperty('timestamp');
      expect(beats[0]).toHaveProperty('strength');
      expect(beats[0]).toHaveProperty('beatNumber');
    });
  });

  describe('buildBeatMarkers()', () => {
    it('should return BeatAnalysisResult with bpm and beats', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '120', stderr: '' });

      const result = await buildBeatMarkers('/audio_exists.wav');

      expect(result).toHaveProperty('bpm');
      expect(result).toHaveProperty('beats');
      expect(result).toHaveProperty('duration');
      expect(Array.isArray(result.beats)).toBe(true);
    });
  });
});

describe('BeatSyncEditor', () => {
  let applyBeatSync: any;
  let applyBeatSyncCuts: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/beatSyncEditor.js');
    applyBeatSync = mod.applyBeatSync;
    applyBeatSyncCuts = mod.applyBeatSyncCuts;
  });

  describe('applyBeatSync()', () => {
    it('should extract segments and concat with crossfade', async () => {
      (fsExtra.pathExists as any).mockResolvedValue(true);

      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '', stderr: '' });

      const concatSpy = vi.mocked(videoService.concatVideosWithCrossfade);
      concatSpy.mockResolvedValue(undefined);

      const beats = [
        { timestamp: 0.0, strength: 1.0, beatNumber: 0, bar: 1 },
        { timestamp: 0.5, strength: 0.7, beatNumber: 1, bar: 1 },
        { timestamp: 2.0, strength: 0.8, beatNumber: 2, bar: 1 },
      ];

      await applyBeatSync(
        { videoPath: '/input_exists.mp4', crossfadeDur: 0.5, minSegmentDur: 1.0, alignToBeats: true },
        beats,
        '/output.mp4'
      );

      expect(runFFmpegSpy).toHaveBeenCalled();
    });
  });

  describe('applyBeatSyncCuts()', () => {
    it('should complete without error when given valid beats', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '', stderr: '' });

      const cutPoints = [
        { timestamp: 0.0, strength: 1.0, beatNumber: 0, bar: 1 },
        { timestamp: 0.5, strength: 0.7, beatNumber: 1, bar: 1 },
        { timestamp: 1.0, strength: 0.8, beatNumber: 2, bar: 1 },
        { timestamp: 1.5, strength: 0.7, beatNumber: 3, bar: 1 },
      ];

      await applyBeatSyncCuts('/input_exists.mp4', cutPoints, '/output.mp4');

      expect(runFFmpegSpy).toHaveBeenCalled();
    });
  });
});

describe('TranscriptEditor', () => {
  let parseTranscriptEdits: any;
  let findWordTimestamps: any;
  let assembleVideoSegments: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/transcriptEditor.js');
    parseTranscriptEdits = mod.parseTranscriptEdits;
    findWordTimestamps = mod.findWordTimestamps;
    assembleVideoSegments = mod.assembleVideoSegments;
  });

  describe('parseTranscriptEdits()', () => {
    it('should return array of time ranges', () => {
      const wordTimestamps = [
        { word: 'hello', start: 0.0, end: 0.5, confidence: 0.9 },
        { word: 'world', start: 0.5, end: 1.0, confidence: 0.9 },
      ];

      const ranges = parseTranscriptEdits('hello world', [1], wordTimestamps);

      expect(Array.isArray(ranges)).toBe(true);
    });
  });

  describe('findWordTimestamps()', () => {
    it('should return Map of word index to timestamps', () => {
      const wordTimestamps = [
        { word: 'hello', start: 0.0, end: 0.5, confidence: 0.9 },
        { word: 'world', start: 0.5, end: 1.0, confidence: 0.9 },
      ];

      const result = findWordTimestamps('hello world', wordTimestamps);

      expect(result).toBeInstanceOf(Map);
      expect(result.get(0)).toBeDefined();
    });
  });

  describe('assembleVideoSegments()', () => {
    it('should call runFFmpeg to assemble segments', async () => {
      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '', stderr: '' });

      const segments = [
        { start: 0.0, end: 5.0, path: '/seg1.mp4' },
        { start: 5.0, end: 10.0, path: '/seg2.mp4' },
      ];

      await assembleVideoSegments(segments, '/video_exists.mp4', '/output.mp4');

      expect(runFFmpegSpy).toHaveBeenCalled();
    });
  });
});

describe('AutoEditor', () => {
  let autoCutVideo: any;
  let detectMotionLevels: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/autoEditor.js');
    autoCutVideo = mod.autoCutVideo;
    detectMotionLevels = mod.detectMotionLevels;
  });

  describe('autoCutVideo()', () => {
    it('should extract audio and detect silence', async () => {
      const runInWorkerSpy = vi.mocked(videoService.runInWorker);
      runInWorkerSpy.mockResolvedValue({ status: 'success', stdout: '', stderr: '' });

      const runFFmpegSpy = vi.mocked(videoService.runFFmpeg);
      runFFmpegSpy.mockResolvedValue({ stdout: '', stderr: '' });

      await autoCutVideo('/input_exists.mp4', { aggressive: false });

      expect(runInWorkerSpy).toHaveBeenCalled();
    });
  });

  describe('detectMotionLevels()', () => {
    it('should return array of motion levels', async () => {
      const runInWorkerSpy = vi.mocked(videoService.runInWorker);
      runInWorkerSpy.mockResolvedValue({ status: 'success', stdout: '0.5\n0.6\n0.4', stderr: '' });

      const levels = await detectMotionLevels('/input_exists.mp4');

      expect(Array.isArray(levels)).toBe(true);
    });
  });
});

describe('ColorGrader', () => {
  let applyLUT: any;
  let applyColorGrade: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./services/colorGrader.js');
    applyLUT = mod.applyLUT;
    applyColorGrade = mod.applyColorGrade;
  });

  describe('applyLUT()', () => {
    it('should call runInWorker with LUT filter', async () => {
      (fsExtra.pathExists as any).mockResolvedValue(true);

      const runInWorkerSpy = vi.mocked(videoService.runInWorker);
      runInWorkerSpy.mockResolvedValue({ status: 'success', stdout: '', stderr: '' });

      await applyLUT('/input_exists.mp4', '/lut_exists.cube', '/output.mp4');

      expect(runInWorkerSpy).toHaveBeenCalled();
    });

    it('should throw when LUT file not found', async () => {
      (fsExtra.pathExists as any).mockResolvedValue(false);

      await expect(
        applyLUT('/input_exists.mp4', '/nonexistent.lut', '/output.mp4')
      ).rejects.toThrow();
    });
  });

  describe('applyColorGrade()', () => {
    it('should call runInWorker or runFFmpegWithFallback with color grade filters', async () => {
      const runInWorkerSpy = vi.mocked(videoService.runInWorker);
      runInWorkerSpy.mockResolvedValue({ status: 'success', stdout: '', stderr: '' });

      const runFFmpegWithFallbackSpy = vi.mocked(videoService.runFFmpegWithFallback);
      runFFmpegWithFallbackSpy.mockResolvedValue(undefined);

      const grade = {
        type: 'preset' as const,
        preset: 'warm' as const,
      };

      await applyColorGrade('/input_exists.mp4', grade, '/output.mp4');

      const called = runInWorkerSpy.mock.calls.length > 0 || runFFmpegWithFallbackSpy.mock.calls.length > 0;
      expect(called).toBe(true);
    });
  });
});
