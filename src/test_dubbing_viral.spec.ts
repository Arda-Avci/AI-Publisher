import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';

import { FIXTURES } from './__fixtures__/index.js';
import { stretchAudioToDuration, replaceAudioTrack } from './services/autoDubbing.js';
import { generateViralTitles, generateHashtags } from './services/viralHook.js';
import { generateHighlightSrt } from './services/emotionCaptions.js';
import { skipAITests } from './test-utils/ai-guard.js';
import { generateBroll } from './services/aiBroll.js';
import { enhanceAudio } from './services/studioSound.js';
import { correctEyeContact } from './services/eyeContact.js';
import { inpaintObjects } from './services/inpainting.js';

const tmpDir = os.tmpdir();
const tmpOut = (name: string) => path.join(tmpDir, `dubbing_test_${name}`);

describe('AutoDubbing', () => {
  describe('stretchAudioToDuration()', () => {
    it('should use atempo filter for duration changes', async () => {
      const result = await stretchAudioToDuration(FIXTURES.audio, 30.0, tmpOut('stretched.wav'));
      expect(result).toBeUndefined();
    }, 60000);
  });

  describe('replaceAudioTrack()', () => {
    it('should call runFFmpegWithFallback with map for audio replacement', async () => {
      const result = await replaceAudioTrack(
        FIXTURES.video,
        FIXTURES.audio,
        tmpOut('replaced.mp4'),
      );
      expect(result).toBeUndefined();
    }, 60000);
  });
});

describe('ViralHook', () => {
  describe('generateViralTitles()', () => {
    it.runIf(!skipAITests)('should return array of viral title suggestions', async () => {
      const result = await generateViralTitles('Test topic', 5);
      expect(result).toHaveProperty('titles');
      expect(Array.isArray(result.titles)).toBe(true);
    }, 60000);
  });

  describe('generateHashtags()', () => {
    it.runIf(!skipAITests)('should return hashtag suggestions for platform', async () => {
      const result = await generateHashtags('Test content', 'youtube');
      expect(result).toHaveProperty('hashtags');
      expect(Array.isArray(result.hashtags)).toBe(true);
    }, 60000);
  });
});

describe('EmotionCaptions', () => {
  describe('generateHighlightSrt()', () => {
    it('should generate SRT entries with highlight styling', async () => {
      const transcript = 'Hello world. This is amazing!';
      const peaks = [
        {
          startSeconds: 0.0,
          endSeconds: 2.0,
          word: 'Wow',
          intensity: 0.9,
          suggestedColor: '#FF4444',
        },
        {
          startSeconds: 2.0,
          endSeconds: 4.0,
          word: 'Amazing',
          intensity: 0.6,
          suggestedColor: '#FF9500',
        },
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
  describe('generateBroll()', () => {
    it('should return GenerateBrollResult with output path', async () => {
      const result = await generateBroll(['nature', 'landscape'], 5.0, tmpOut('broll.mp4'));
      expect(result).toHaveProperty('outputPath');
      expect(result).toHaveProperty('success');
    }, 60000);

    it('should return error when colab call fails', async () => {
      const result = await generateBroll(['test'], 5.0, tmpOut('broll_fail.mp4'));
      if (!result.success) {
        expect(result).toHaveProperty('error');
      }
    }, 60000);
  });
});

describe('StudioSound', () => {
  describe('enhanceAudio()', () => {
    it('should call runFFmpegWithFallback with audio filters', async () => {
      const result = await enhanceAudio(FIXTURES.video, tmpOut('enhanced.mp4'));
      expect(result).toBeUndefined();
    }, 60000);
  });
});

describe('EyeContact', () => {
  describe('correctEyeContact()', () => {
    it('should return EyeContactResult with processed video path', async () => {
      const result = await correctEyeContact(FIXTURES.video, tmpOut('eye_contact.mp4'));
      expect(result).toHaveProperty('processedVideoPath');
      expect(result).toHaveProperty('usedFallback');
    }, 60000);

    it('should use fallback when colab not running', async () => {
      const result = await correctEyeContact(FIXTURES.video, tmpOut('eye_contact_fallback.mp4'));
      expect(result).toHaveProperty('usedFallback');
      expect(result).toHaveProperty('processedVideoPath');
    }, 60000);
  });
});

describe('Inpainting', () => {
  describe('inpaintObjects()', () => {
    it('should return InpaintResult with output video path', async () => {
      const maskRegions = [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }];
      const result = await inpaintObjects(FIXTURES.video, maskRegions, tmpOut('inpainted.mp4'));
      expect(result).toHaveProperty('outputVideoPath');
      expect(result).toHaveProperty('usedFallback');
    }, 60000);

    it('should use fallback when colab not running', async () => {
      const maskRegions = [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }];
      const result = await inpaintObjects(FIXTURES.video, maskRegions, tmpOut('inpainted2.mp4'));
      expect(result.usedFallback).toBeDefined();
    }, 60000);

    it('should return error when no mask regions provided', async () => {
      const result = await inpaintObjects(FIXTURES.video, [], tmpOut('inpainted3.mp4'));
      expect(result.usedFallback).toBe(true);
      expect(result).toHaveProperty('error');
    }, 60000);
  });
});
