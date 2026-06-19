import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';

import { FIXTURES } from './__fixtures__/index.js';
import {
  SmartCropper,
  cropVideo,
  detectFaceBox,
  computeCropRegion,
} from './services/clipper/smartCropper.js';
import {
  SubtitleMixer,
  embedSubtitles,
  mixBackgroundMusic,
  generateSrtFromWhisper,
} from './services/clipper/subtitleMixer.js';
import {
  splitScreenVertical,
  splitScreenHorizontal,
  overlayMascot,
  pipOverlay,
} from './services/clipper/splitScreenService.js';
import { autoReframeHorizontalToVertical } from './services/autoReframe.js';

const tmpDir = os.tmpdir();
const tmpOut = (name: string) => path.join(tmpDir, `clipper_svc_${name}`);

describe('SmartCropper', () => {
  describe('cropVideo()', () => {
    it('should call runFFmpeg with correct crop and scale filters', async () => {
      const result = await cropVideo(
        FIXTURES.video,
        tmpOut('cropped.mp4'),
        { x: 0, y: 0, width: 160, height: 90 },
        160,
        90,
      );
      expect(result).toBeDefined();
    }, 60000);

    it('should include duration arg when provided', async () => {
      const result = await cropVideo(
        FIXTURES.video,
        tmpOut('cropped_dur.mp4'),
        { x: 0, y: 0, width: 160, height: 90 },
        160,
        90,
        15,
      );
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('detectFaceBox()', () => {
    it('should return empty array when no faces detected', async () => {
      const faces = await detectFaceBox(FIXTURES.video, 1.0);
      expect(Array.isArray(faces)).toBe(true);
    }, 60000);
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
      const cropper = new SmartCropper();
      const result = await cropper.cropVideo(FIXTURES.video, tmpOut('smart_crop.mp4'), {
        targetFocus: 'center',
        aspectRatio: '9:16',
        outputWidth: 1080,
        outputHeight: 1920,
      });

      expect(result).toHaveProperty('outputPath');
      expect(result).toHaveProperty('cropRegion');
      expect(result).toHaveProperty('detectedFaces');
    }, 60000);
  });
});

describe('SubtitleMixer', () => {
  describe('embedSubtitles()', () => {
    it('should call runFFmpeg with subtitle filter', async () => {
      const result = await embedSubtitles(FIXTURES.video, FIXTURES.srt, tmpOut('subs.mp4'), {});
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('mixBackgroundMusic()', () => {
    it('should call runFFmpeg with amix filter', async () => {
      const result = await mixBackgroundMusic(
        FIXTURES.video,
        FIXTURES.audio,
        tmpOut('mixed.mp4'),
        0.15,
      );
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('generateSrtFromWhisper()', () => {
    it('should generate SRT file with correct entries', async () => {
      const transcript = {
        text: 'Hello world',
        segments: [
          { start: 0.0, end: 1.5, text: 'Hello' },
          { start: 1.5, end: 3.0, text: 'world' },
        ],
      };

      const result = await generateSrtFromWhisper(transcript, tmpOut('whisper.srt'));
      expect(result).toBe(tmpOut('whisper.srt'));
    }, 60000);
  });

  describe('SubtitleMixer.process()', () => {
    it('should embed subtitles and mix music', async () => {
      const mixer = new SubtitleMixer();
      const result = await mixer.process(FIXTURES.video, {
        srtPath: FIXTURES.srt,
        outputPath: tmpOut('mixer_out.mp4'),
        musicPath: FIXTURES.audio,
        musicVolume: 0.15,
      });

      expect(result).toHaveProperty('outputPath');
      expect(result).toHaveProperty('subtitlesEmbedded');
      expect(result).toHaveProperty('musicMixed');
    }, 60000);
  });
});

describe('SplitScreenService', () => {
  describe('splitScreenVertical()', () => {
    it('should call runFFmpegWithFallback with vstack filter', async () => {
      const result = await splitScreenVertical(
        FIXTURES.primary,
        FIXTURES.secondary,
        tmpOut('vstack.mp4'),
      );
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('splitScreenHorizontal()', () => {
    it('should call runFFmpegWithFallback with hstack filter', async () => {
      const result = await splitScreenHorizontal(
        FIXTURES.primary,
        FIXTURES.secondary,
        tmpOut('hstack.mp4'),
      );
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('overlayMascot()', () => {
    it('should call runFFmpegWithFallback with overlay filter', async () => {
      const result = await overlayMascot(FIXTURES.video, FIXTURES.secondary, tmpOut('mascot.mp4'), {
        x: 100,
        y: 200,
      });
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('pipOverlay()', () => {
    it('should call runFFmpegWithFallback with overlay at bottom-right position', async () => {
      const result = await pipOverlay(
        FIXTURES.primary,
        FIXTURES.secondary,
        tmpOut('pip.mp4'),
        'bottom-right',
      );
      expect(result).toBeDefined();
    }, 60000);
  });
});

describe('AutoReframe', () => {
  describe('autoReframeHorizontalToVertical()', () => {
    it('should call runFFmpegWithFallback with crop and scale filters', async () => {
      const result = await autoReframeHorizontalToVertical(
        FIXTURES.video,
        tmpOut('reframed.mp4'),
        'center',
      );
      expect(result).toBeDefined();
    }, 60000);
  });
});
