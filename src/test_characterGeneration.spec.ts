import { describe, it, expect } from 'vitest';
import {
  buildCharacterReferencePrompt,
  buildCharacterReferenceText,
  buildAllCharacterReferences,
  type PhotoAnalysisResult,
  analysisToProfile,
} from './services/characterGenerationService.js';
import { type CharacterProfile } from './types/characterProfile.js';

describe('CharacterGenerationService', () => {
  it('buildCharacterReferencePrompt: full body default', () => {
    const profile: CharacterProfile = {
      name: 'Elif',
      measurements: { heightCm: 175, weightKg: 65, chestCm: 90, waistCm: 70, hipsCm: 95 },
      appearance: { age: 28, gender: 'female', skinTone: 'medium', hairColor: 'kahverengi', bodyType: 'athletic' },
    };
    const prompt = buildCharacterReferencePrompt(profile, 'fullbody');
    expect(prompt).toContain('full body');
    expect(prompt).toContain('175cm');
    expect(prompt).toContain('90cm chest');
    expect(prompt).toContain('kahverengi');
  });

  it('buildCharacterReferencePrompt: portrait view', () => {
    const profile: CharacterProfile = { name: 'Test' };
    const prompt = buildCharacterReferencePrompt(profile, 'portrait');
    expect(prompt).toContain('portrait');
  });

  it('buildCharacterReferencePrompt: three-quarter view', () => {
    const profile: CharacterProfile = { name: 'Test' };
    const prompt = buildCharacterReferencePrompt(profile, 'three-quarter');
    expect(prompt).toContain('three-quarter');
  });

  it('buildCharacterReferencePrompt: stil secimleri', () => {
    const profile: CharacterProfile = { name: 'Test', visualStyle: 'anime' };
    const prompt = buildCharacterReferencePrompt(profile);
    expect(prompt.toLowerCase()).toContain('anime');
  });

  it('buildCharacterReferencePrompt: feet/inch donusumu', () => {
    const profile: CharacterProfile = {
      name: 'Test',
      measurements: { heightCm: 180 },
    };
    const prompt = buildCharacterReferencePrompt(profile);
    expect(prompt).toMatch(/5'11|5'10|6'/);
  });

  it('buildCharacterReferencePrompt: erkek', () => {
    const profile: CharacterProfile = {
      name: 'John',
      measurements: { heightCm: 180, weightKg: 80 },
      appearance: { age: 35, gender: 'male', facialHair: 'beard' },
    };
    const prompt = buildCharacterReferencePrompt(profile);
    expect(prompt).toContain('man');
    expect(prompt).toContain('beard');
  });

  it('buildCharacterReferencePrompt: cocuk', () => {
    const profile: CharacterProfile = {
      name: 'Kid',
      measurements: { heightCm: 130, weightKg: 30 },
      appearance: { age: 8, gender: 'female' },
    };
    const prompt = buildCharacterReferencePrompt(profile);
    expect(prompt).toContain('8 years old');
    expect(prompt).toContain('130cm');
  });

  it('buildCharacterReferenceText: @ referansi ile', () => {
    const profile: CharacterProfile = {
      name: 'Elif Yilmaz',
      measurements: { heightCm: 175, chestCm: 90, waistCm: 70, hipsCm: 95 },
      appearance: { age: 28, gender: 'female' },
    };
    const ref = buildCharacterReferenceText(profile);
    expect(ref).toContain('@ElifYilmaz');
    expect(ref).toContain('175cm');
    expect(ref).toContain('fiziksel referans');
  });

  it('buildCharacterReferenceText: @ isaretsiz karakter adlari', () => {
    const profile: CharacterProfile = { name: 'John Doe' };
    const ref = buildCharacterReferenceText(profile);
    expect(ref).toContain('@JohnDoe'); // bosluk kaldirildi
  });

  it('buildAllCharacterReferences: coklu', () => {
    const profiles: CharacterProfile[] = [
      { name: 'Alice', appearance: { gender: 'female' } },
      { name: 'Bob', appearance: { gender: 'male' } },
    ];
    const refs = buildAllCharacterReferences(profiles);
    expect(refs).toContain('@Alice');
    expect(refs).toContain('@Bob');
  });

  it('buildAllCharacterReferences: bos liste', () => {
    expect(buildAllCharacterReferences([])).toBe('');
  });

  it('analysisToProfile: Vision AI cikti donusumu', () => {
    const analysis: PhotoAnalysisResult = {
      age: 30,
      ageConfidence: 'high',
      gender: 'female',
      bodyType: 'athletic',
      estimatedHeightCm: { value: 168, confidence: 'medium' },
      estimatedWeightKg: { value: 60, confidence: 'low' },
      hairColor: 'kahverengi',
      hairStyle: 'duz',
      hairLength: 'long',
      eyeColor: 'yesil',
      skinTone: 'light',
      bodyCharacteristics: ['fit'],
      outfitDescription: 'klasik is kiyaseti',
      distinguishingFeatures: ['ben'],
      visualPrompt: '30 yasinda, 168cm, kahverengi uzun sacli kadin',
      overallConfidence: 0.85,
    };
    const profile = analysisToProfile(analysis, 'Test', 'analyst');
    expect(profile.name).toBe('Test');
    expect(profile.role).toBe('analyst');
    expect(profile.measurements?.heightCm).toBe(168);
    expect(profile.appearance?.age).toBe(30);
    expect(profile.appearance?.gender).toBe('female');
    expect(profile.style?.outfitDescription).toBe('klasik is kiyaseti');
    expect(profile.freeformDescription).toContain('30 yasinda');
  });
});
