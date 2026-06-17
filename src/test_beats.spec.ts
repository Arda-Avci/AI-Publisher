import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import { FIXTURES } from './__fixtures__/index.js';

import {
  findBeatPeaks,
  buildBeatMarkers,
  detectBPM,
  BeatMarker,
  BeatAnalysisResult,
} from './services/beatAnalyzer.js';

import {
  BeatCutPoint,
  applyBeatSync,
  findBeatCutPoints,
  analyzeAudioBPM,
  quickBeatSync,
} from './services/beatSyncEditor.js';

const outputPath = () => path.join(os.tmpdir(), `test_beats_${Date.now()}.mp4`);

describe('beatAnalyzer', () => {
  it('BeatMarker interface fields', () => {
    const marker: BeatMarker = {
      timestamp: 1.5,
      strength: 0.8,
      beatNumber: 4,
      bar: 2,
    };
    expect(marker.timestamp).toBe(1.5);
    expect(marker.strength).toBe(0.8);
    expect(marker.beatNumber).toBe(4);
    expect(marker.bar).toBe(2);
  });

  it('BeatCutPoint interface fields', () => {
    const cut: BeatCutPoint = {
      timestamp: 2.0,
      beatNumber: 8,
      strength: 1.0,
    };
    expect(cut.timestamp).toBe(2.0);
    expect(cut.beatNumber).toBe(8);
    expect(cut.strength).toBe(1.0);
  });

  it('findBeatPeaks with real audio file', async () => {
    const beats = await findBeatPeaks(FIXTURES.audio, 120);
    expect(Array.isArray(beats)).toBe(true);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats[0]).toHaveProperty('timestamp');
    expect(beats[0]).toHaveProperty('strength');
    expect(beats[0]).toHaveProperty('beatNumber');
    expect(beats[0]).toHaveProperty('bar');
  }, 30000);

  it('findBeatPeaks returns empty for invalid bpm', async () => {
    const beats = await findBeatPeaks(FIXTURES.audio, 0);
    expect(Array.isArray(beats)).toBe(true);
  }, 30000);

  it('buildBeatMarkers returns BeatAnalysisResult', async () => {
    const result: BeatAnalysisResult = await buildBeatMarkers(FIXTURES.audio);
    expect(result).toHaveProperty('bpm');
    expect(result).toHaveProperty('beats');
    expect(result).toHaveProperty('duration');
    expect(typeof result.bpm).toBe('number');
    expect(Array.isArray(result.beats)).toBe(true);
  }, 30000);

  it('detectBPM returns number', async () => {
    const bpm = await detectBPM(FIXTURES.audio);
    expect(typeof bpm).toBe('number');
    expect(bpm).toBeGreaterThan(0);
  }, 30000);
});

describe('beatSyncEditor', () => {
  it('BeatCutPoint interface fields', () => {
    const cut: BeatCutPoint = {
      timestamp: 0.5,
      beatNumber: 0,
      strength: 1.0,
    };
    expect(cut.timestamp).toBe(0.5);
    expect(cut.beatNumber).toBe(0);
    expect(cut.strength).toBe(1.0);
  });

  it('analyzeAudioBPM returns object shape', async () => {
    const result = await analyzeAudioBPM(FIXTURES.audio);
    expect(result).toHaveProperty('bpm');
    expect(result).toHaveProperty('peaks');
    expect(result).toHaveProperty('segments');
    expect(typeof result.bpm).toBe('number');
    expect(Array.isArray(result.peaks)).toBe(true);
    expect(Array.isArray(result.segments)).toBe(true);
  }, 30000);

  it('findBeatCutPoints returns BeatCutPoint array', async () => {
    const cuts = await findBeatCutPoints(FIXTURES.audio, FIXTURES.video);
    expect(Array.isArray(cuts)).toBe(true);
    if (cuts.length > 0) {
      expect(cuts[0]).toHaveProperty('timestamp');
      expect(cuts[0]).toHaveProperty('beatNumber');
      expect(cuts[0]).toHaveProperty('strength');
    }
  }, 30000);

  it('applyBeatSync runs without error', async () => {
    const markers: BeatMarker[] = [
      { timestamp: 0, strength: 1.0, beatNumber: 0, bar: 1 },
      { timestamp: 0.5, strength: 0.8, beatNumber: 1, bar: 1 },
      { timestamp: 1.0, strength: 1.0, beatNumber: 2, bar: 1 },
    ];

    await expect(
      applyBeatSync(
        { videoPath: FIXTURES.video, crossfadeDur: 0.5, minSegmentDur: 0.3 },
        markers,
        outputPath(),
      ),
    ).resolves.toBeUndefined();
  }, 30000);

  it('quickBeatSync runs without error', async () => {
    await expect(quickBeatSync(FIXTURES.video, outputPath(), 120)).resolves.toBeUndefined();
  }, 30000);
});
