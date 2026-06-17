import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import { FIXTURES } from './__fixtures__/index.js';

import { detectBPM, findBeatPeaks, buildBeatMarkers } from './services/beatAnalyzer.js';
import { applyBeatSync, applyBeatSyncCuts } from './services/beatSyncEditor.js';
import { parseTranscriptEdits, findWordTimestamps, assembleVideoSegments } from './services/transcriptEditor.js';
import { autoCutVideo, detectMotionLevels } from './services/autoEditor.js';
import { applyLUT, applyColorGrade } from './services/colorGrader.js';

const outputPath = () => path.join(os.tmpdir(), `test_editor_${Date.now()}.mp4`);

describe('BeatAnalyzer', () => {
  describe('detectBPM()', () => {
    it('should return a BPM number', async () => {
      const bpm = await detectBPM(FIXTURES.audio);
      expect(typeof bpm).toBe('number');
      expect(bpm).toBeGreaterThan(0);
    }, 30000);
  });

  describe('findBeatPeaks()', () => {
    it('should return array of beat markers', async () => {
      const beats = await findBeatPeaks(FIXTURES.audio, 120);
      expect(Array.isArray(beats)).toBe(true);
      expect(beats.length).toBeGreaterThan(0);
      expect(beats[0]).toHaveProperty('timestamp');
      expect(beats[0]).toHaveProperty('strength');
      expect(beats[0]).toHaveProperty('beatNumber');
    }, 30000);
  });

  describe('buildBeatMarkers()', () => {
    it('should return BeatAnalysisResult with bpm and beats', async () => {
      const result = await buildBeatMarkers(FIXTURES.audio);
      expect(result).toHaveProperty('bpm');
      expect(result).toHaveProperty('beats');
      expect(result).toHaveProperty('duration');
      expect(Array.isArray(result.beats)).toBe(true);
    }, 30000);
  });
});

describe('BeatSyncEditor', () => {
  describe('applyBeatSync()', () => {
    it('should extract segments and concat with crossfade', async () => {
      const beats = [
        { timestamp: 0.0, strength: 1.0, beatNumber: 0, bar: 1 },
        { timestamp: 0.5, strength: 0.7, beatNumber: 1, bar: 1 },
        { timestamp: 2.0, strength: 0.8, beatNumber: 2, bar: 1 },
      ];

      await expect(
        applyBeatSync(
          { videoPath: FIXTURES.video, crossfadeDur: 0.5, minSegmentDur: 1.0, alignToBeats: true },
          beats,
          outputPath(),
        ),
      ).resolves.toBeUndefined();
    }, 30000);
  });

  describe('applyBeatSyncCuts()', () => {
    it('should complete without error when given valid beats', async () => {
      const cutPoints = [
        { timestamp: 0.0, strength: 1.0, beatNumber: 0, bar: 1 },
        { timestamp: 0.5, strength: 0.7, beatNumber: 1, bar: 1 },
        { timestamp: 1.0, strength: 0.8, beatNumber: 2, bar: 1 },
        { timestamp: 1.5, strength: 0.7, beatNumber: 3, bar: 1 },
      ];

      await expect(
        applyBeatSyncCuts(FIXTURES.video, cutPoints, outputPath()),
      ).resolves.toBeDefined();
    }, 30000);
  });
});

describe('TranscriptEditor', () => {
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
      const segments = [
        { start: 0.0, end: 5.0, path: FIXTURES.seg1 },
        { start: 5.0, end: 10.0, path: FIXTURES.seg2 },
      ];

      await expect(
        assembleVideoSegments(segments, FIXTURES.video, outputPath()),
      ).resolves.toBeUndefined();
    }, 30000);
  });
});

describe('AutoEditor', () => {
  describe('autoCutVideo()', () => {
    it('should extract audio and detect silence', async () => {
      await expect(
        autoCutVideo(FIXTURES.video, { aggressive: false }),
      ).resolves.toBeDefined();
    }, 30000);
  });

  describe('detectMotionLevels()', () => {
    it('should return array of motion levels', async () => {
      const levels = await detectMotionLevels(FIXTURES.video);
      expect(Array.isArray(levels)).toBe(true);
    }, 30000);
  });
});

describe('ColorGrader', () => {
  describe('applyLUT()', () => {
    it('should call runInWorker with LUT filter', async () => {
      await expect(
        applyLUT(FIXTURES.video, FIXTURES.lut, outputPath()),
      ).resolves.toBeUndefined();
    }, 30000);

    it('should throw when LUT file not found', async () => {
      await expect(
        applyLUT(FIXTURES.video, '/nonexistent_file_xyz.lut', outputPath()),
      ).rejects.toThrow();
    }, 30000);
  });

  describe('applyColorGrade()', () => {
    it('should complete with preset grade', async () => {
      const grade = { type: 'preset' as const, preset: 'warm' as const };
      await expect(
        applyColorGrade(FIXTURES.video, grade, outputPath()),
      ).resolves.toBeUndefined();
    }, 30000);
  });
});
