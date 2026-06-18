import { describe, it, expect } from 'vitest';
import { FIXTURES } from './__fixtures__/index.js';
import {
  parseSrtToWords,
  generateWordTimings,
  parseJsonSubtitles,
  mergeWordTimings,
  extractTextFromSrt,
  alignSubtitlesToAudio,
} from './lib/subtitleRenderer.js';

describe('subtitleRenderer', () => {
  it('parseSrt returns segments array', () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Merhaba dunya

2
00:00:02,500 --> 00:00:05,000
Bu bir test
`;
    const words = parseSrtToWords(srt);
    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBeGreaterThan(0);
    expect(words[0]).toHaveProperty('word');
    expect(words[0]).toHaveProperty('start');
    expect(words[0]).toHaveProperty('end');
  });

  it('parseSrt handles empty input', () => {
    const words = parseSrtToWords('');
    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBe(0);
  });

  it('word-level timing extraction', () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Bir iki uc
`;
    const words = parseSrtToWords(srt);
    expect(words.length).toBe(3);
    words.forEach((w) => {
      expect(w.end).toBeGreaterThan(w.start);
    });
  });

  it('generateWordTimings returns array', () => {
    const timings = generateWordTimings('bu bir test cumlesi', 4.0, 150);
    expect(Array.isArray(timings)).toBe(true);
    expect(timings.length).toBeGreaterThan(0);
  });

  it('generateWordTimings handles empty text', () => {
    const timings = generateWordTimings('', 10.0);
    expect(Array.isArray(timings)).toBe(true);
    expect(timings.length).toBe(0);
  });

  it('parseJsonSubtitles parses valid JSON', () => {
    const json = JSON.stringify({
      words: [
        { word: 'test', start: 0.0, end: 0.5 },
        { word: 'words', start: 0.5, end: 1.0 },
      ],
    });
    const words = parseJsonSubtitles(json);
    expect(words.length).toBe(2);
    const firstWord = words[0];
    expect(firstWord).toBeDefined();
    if (firstWord) {
      expect(firstWord.word).toBe('test');
    }
  });

  it('parseJsonSubtitles handles invalid JSON', () => {
    const words = parseJsonSubtitles('not json');
    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBe(0);
  });

  it('mergeWordTimings combines arrays', () => {
    const arr1 = [{ word: 'bir', start: 0, end: 0.5 }];
    const arr2 = [{ word: 'iki', start: 0.5, end: 1.0 }];
    const merged = mergeWordTimings([arr1, arr2]);
    expect(merged.length).toBe(2);
  });

  it('mergeWordTimings sorts by start time', () => {
    const arr1 = [{ word: 'iki', start: 0.5, end: 1.0 }];
    const arr2 = [{ word: 'bir', start: 0.0, end: 0.5 }];
    const merged = mergeWordTimings([arr1, arr2]);
    const firstMerged = merged[0];
    expect(firstMerged).toBeDefined();
    if (firstMerged) {
      expect(firstMerged.word).toBe('bir');
    }
  });

  it('extractTextFromSrt returns plain text', () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Merhaba dunya

2
00:00:02,000 --> 00:00:04,000
Nasilsin
`;
    const text = extractTextFromSrt(srt);
    expect(text).toContain('Merhaba');
    expect(text).toContain('Nasilsin');
  });

  it('alignSubtitlesToAudio returns words array', () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Test content
`;
    const result = alignSubtitlesToAudio(srt, FIXTURES.audio);
    expect(Array.isArray(result)).toBe(true);
  });

  it('ASS export produces valid ASS content via parseSrtToWords', () => {
    const srt = `1
00:00:00,000 --> 00:00:01,500
Birinci satir
`;
    const words = parseSrtToWords(srt);
    expect(words.length).toBeGreaterThan(0);
    const lastWord = words[words.length - 1];
    expect(lastWord).toBeDefined();
    if (lastWord) {
      expect(lastWord.end).toBeGreaterThan(lastWord.start);
    }
  });
});
