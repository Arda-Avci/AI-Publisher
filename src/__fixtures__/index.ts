import path from 'path';

export const fx = (name: string) => path.join(__dirname, name);

// Pre-defined fixture paths
export const FIXTURES = {
  video: fx('input_exists.mp4'),
  audio: fx('audio_exists.wav'),
  lut: fx('lut_exists.cube'),
  srt: fx('test_subtitle.srt'),
  primary: fx('primary.mp4'),
  secondary: fx('secondary.mp4'),
  seg1: fx('seg1.mp4'),
  seg2: fx('seg2.mp4'),
} as const;
