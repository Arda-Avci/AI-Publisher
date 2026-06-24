import { describe, it, expect } from 'vitest';
import {
  ageToGroup,
  getDefaultMeasurements,
  getDefaultAppearance,
  getOutfitPresets,
  getDefaultOutfitId,
  getOutfitPrompt,
  getCharacterDefaults,
  OUTFIT_PRESETS,
} from './services/characterPresets.js';

describe('CharacterPresets', () => {
  it('ageToGroup: yas araliklari', () => {
    expect(ageToGroup(5)).toBe('child');
    expect(ageToGroup(12)).toBe('child');
    expect(ageToGroup(13)).toBe('teen');
    expect(ageToGroup(17)).toBe('teen');
    expect(ageToGroup(18)).toBe('young-adult');
    expect(ageToGroup(29)).toBe('young-adult');
    expect(ageToGroup(30)).toBe('adult');
    expect(ageToGroup(49)).toBe('adult');
    expect(ageToGroup(50)).toBe('middle-aged');
    expect(ageToGroup(64)).toBe('middle-aged');
    expect(ageToGroup(65)).toBe('senior');
    expect(ageToGroup(90)).toBe('senior');
  });

  it('getDefaultMeasurements: erkek orta yas', () => {
    const m = getDefaultMeasurements(35, 'male');
    expect(m.heightCm).toBe(178);
    expect(m.weightKg).toBe(80);
    expect(m.chestCm).toBeGreaterThan(80);
  });

  it('getDefaultMeasurements: kadin genc yetiskin', () => {
    const m = getDefaultMeasurements(25, 'female');
    expect(m.heightCm).toBe(165);
    expect(m.hipsCm).toBeGreaterThan(m.waistCm); // kalca > bel
  });

  it('getDefaultMeasurements: cocuk (yas < 13)', () => {
    const m = getDefaultMeasurements(8, 'female');
    expect(m.heightCm).toBeLessThan(150);
    expect(m.weightKg).toBeLessThan(40);
  });

  it('getDefaultMeasurements: yasli (senior)', () => {
    const m = getDefaultMeasurements(70, 'male');
    expect(m.heightCm).toBeLessThanOrEqual(178); // yasla boy azalir
  });

  it('getDefaultMeasurements: non-binary ortalama', () => {
    const m = getDefaultMeasurements(30, 'non-binary');
    expect(m.heightCm).toBe(171);
  });

  it('getDefaultAppearance: erkek kisa sac', () => {
    const a = getDefaultAppearance(30, 'male');
    expect(a.hairLength).toBe('short');
  });

  it('getDefaultAppearance: kadin uzun sac', () => {
    const a = getDefaultAppearance(25, 'female');
    expect(['long', 'medium']).toContain(a.hairLength);
  });

  it('getDefaultAppearance: senior beyaz sac', () => {
    const a = getDefaultAppearance(70, 'female');
    expect(a.hairColor).toBe('beyaz');
  });

  it('getOutfitPresets: kadin yetiskin 3+ secenek', () => {
    const presets = getOutfitPresets(35, 'female');
    expect(presets.length).toBeGreaterThanOrEqual(3);
    const ids = presets.map((p) => p.id);
    expect(ids).toContain('female-dress');
  });

  it('getOutfitPresets: erkek yetisin takim elbise var', () => {
    const presets = getOutfitPresets(30, 'male');
    expect(presets.map((p) => p.id)).toContain('male-suit');
  });

  it('getOutfitPresets: cocuk kiz icin okul uniformasi', () => {
    const presets = getOutfitPresets(8, 'female');
    expect(presets.map((p) => p.id)).toContain('female-child-school');
  });

  it('getOutfitPresets: cocuk erkek icin okul uniformasi', () => {
    const presets = getOutfitPresets(10, 'male');
    expect(presets.map((p) => p.id)).toContain('male-child-school');
  });

  it('getOutfitPresets: unisex presets her zaman var', () => {
    expect(getOutfitPresets(20, 'female').map((p) => p.id)).toContain('all-sport');
    expect(getOutfitPresets(20, 'male').map((p) => p.id)).toContain('all-sport');
  });

  it('getDefaultOutfitId: kadin yetiskin → dress', () => {
    expect(getDefaultOutfitId(30, 'female')).toBe('female-dress');
  });

  it('getDefaultOutfitId: erkek yetiskin → suit', () => {
    expect(getDefaultOutfitId(30, 'male')).toBe('male-suit');
  });

  it('getDefaultOutfitId: kiz cocugu → okul uniformasi', () => {
    expect(getDefaultOutfitId(8, 'female')).toBe('female-child-school');
  });

  it('getDefaultOutfitId: erkek cocuk → okul uniformasi', () => {
    expect(getDefaultOutfitId(8, 'male')).toBe('male-child-school');
  });

  it('getOutfitPrompt: var olan ID', () => {
    const prompt = getOutfitPrompt('female-dress');
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('elbise');
  });

  it('getOutfitPrompt: olmayan ID null', () => {
    expect(getOutfitPrompt('nonexistent')).toBe(null);
  });

  it('getCharacterDefaults: tam set doner', () => {
    const d = getCharacterDefaults('Elif', 28, 'female');
    expect(d.name).toBe('Elif');
    expect(d.age).toBe(28);
    expect(d.gender).toBe('female');
    expect(d.measurements.heightCm).toBeGreaterThan(0);
    expect(d.appearance.hairColor).toBeTruthy();
    expect(d.outfit_preset).toBeTruthy();
  });

  it('OUTFIT_PRESETS: en az 12 preset var', () => {
    expect(OUTFIT_PRESETS.length).toBeGreaterThanOrEqual(12);
  });

  it('OUTFIT_PRESETS: her preset unique ID', () => {
    const ids = OUTFIT_PRESETS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('OUTFIT_PRESETS: erkek elbise YOK (yerine takim elbise)', () => {
    const maleDress = OUTFIT_PRESETS.find((p) => p.id === 'male-dress');
    expect(maleDress).toBeUndefined();
  });
});
