import { describe, it, expect } from 'vitest';
import {
  validateProfile,
  emptyProfile,
  profileToText,
  profilesToText,
  integrateWithFeatures,
  exampleProfile,
} from './services/characterProfileService.js';

describe('CharacterProfileService', () => {
  it('validateProfile: gecerli profil OK', () => {
    const r = validateProfile({
      name: 'Test',
      measurements: { heightCm: 180, weightKg: 75 },
    });
    expect(r.ok).toBe(true);
    expect(r.profile?.name).toBe('Test');
  });

  it('validateProfile: gecersiz olcu fail', () => {
    const r = validateProfile({
      name: 'Test',
      measurements: { heightCm: 50 }, // min 100
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('validateProfile: boy araligi 100-250', () => {
    expect(validateProfile({ name: 'X', measurements: { heightCm: 100 } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', measurements: { heightCm: 250 } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', measurements: { heightCm: 99 } }).ok).toBe(false);
    expect(validateProfile({ name: 'X', measurements: { heightCm: 251 } }).ok).toBe(false);
  });

  it('validateProfile: kilo araligi 30-250', () => {
    expect(validateProfile({ name: 'X', measurements: { weightKg: 30 } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', measurements: { weightKg: 250 } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', measurements: { weightKg: 29 } }).ok).toBe(false);
  });

  it('validateProfile: gogus/bel/kalca araliklari', () => {
    expect(validateProfile({ name: 'X', measurements: { chestCm: 60, waistCm: 50, hipsCm: 60 } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', measurements: { chestCm: 49 } }).ok).toBe(false);
    expect(validateProfile({ name: 'X', measurements: { chestCm: 181 } }).ok).toBe(false);
    expect(validateProfile({ name: 'X', measurements: { waistCm: 40 } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', measurements: { waistCm: 39 } }).ok).toBe(false);
    expect(validateProfile({ name: 'X', measurements: { hipsCm: 60 } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', measurements: { hipsCm: 49 } }).ok).toBe(false);
  });

  it('validateProfile: age 1-120', () => {
    expect(validateProfile({ name: 'X', appearance: { age: 25 } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', appearance: { age: 0 } }).ok).toBe(false);
    expect(validateProfile({ name: 'X', appearance: { age: 121 } }).ok).toBe(false);
  });

  it('validateProfile: gender enum', () => {
    expect(validateProfile({ name: 'X', appearance: { gender: 'male' } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', appearance: { gender: 'female' } }).ok).toBe(true);
    expect(validateProfile({ name: 'X', appearance: { gender: 'unknown' } }).ok).toBe(false);
  });

  it('emptyProfile minimum gerekli alan', () => {
    const p = emptyProfile('Test');
    expect(p.name).toBe('Test');
  });

  it('exampleProfile tam dolu ornek', () => {
    const p = exampleProfile();
    expect(p.name).toBeTruthy();
    expect(p.measurements?.heightCm).toBeGreaterThan(0);
    expect(p.appearance?.age).toBeGreaterThan(0);
  });

  it('profileToText: sadece isim', () => {
    const text = profileToText({ name: 'X' });
    expect(text).toContain('X');
  });

  it('profileToText: boy + kilo', () => {
    const text = profileToText({
      name: 'Ahmet',
      measurements: { heightCm: 180, weightKg: 80 },
    });
    expect(text).toContain('180cm');
    expect(text).toContain('80kg');
  });

  it('profileToText: feet/inch cevirisi', () => {
    const text = profileToText({
      name: 'Jane',
      measurements: { heightCm: 175 },
    });
    // 175cm = ~5'9"
    expect(text).toMatch(/5'9/);
  });

  it('profileToText: olculer turkce', () => {
    const text = profileToText({
      name: 'Elif',
      measurements: { chestCm: 90, waistCm: 70, hipsCm: 95 },
    });
    expect(text).toContain('gogus 90cm');
    expect(text).toContain('bel 70cm');
    expect(text).toContain('kalca 95cm');
  });

  it('profileToText: appearance enum cevirisi', () => {
    const text = profileToText({
      name: 'Test',
      appearance: {
        gender: 'female',
        skinTone: 'olive',
        hairColor: 'siyah',
        bodyType: 'athletic',
      },
    });
    expect(text).toContain('kadin');
    expect(text).toContain('zeytin ten');
    expect(text).toContain('atletik');
  });

  it('profileToText: facialHair (erkek)', () => {
    const text = profileToText({
      name: 'John',
      appearance: { gender: 'male', facialHair: 'beard' },
    });
    expect(text).toContain('sakalli');
  });

  it('profilesToText: multi karakter', () => {
    const text = profilesToText([
      { name: 'Alice', measurements: { heightCm: 165 } },
      { name: 'Bob', measurements: { heightCm: 180 } },
    ]);
    expect(text).toContain('Alice');
    expect(text).toContain('Bob');
    expect(text).toContain('165cm');
    expect(text).toContain('180cm');
  });

  it('integrateWithFeatures: ozellikleri ekler', () => {
    const profiles = [
      { name: 'X', measurements: { heightCm: 180 } },
    ];
    const result = integrateWithFeatures('Ana karakter: zeki', profiles);
    expect(result).toContain('Ana karakter: zeki');
    expect(result).toContain('Detayli Fiziksel Ozellikler');
    expect(result).toContain('X');
  });

  it('integrateWithFeatures: profiles bossa sadece features', () => {
    const result = integrateWithFeatures('Yalniz feature', []);
    expect(result).toBe('Yalniz feature');
  });

  it('integrateWithFeatures: features bossa sadece profiller', () => {
    const profiles = [{ name: 'Solo', measurements: { heightCm: 170 } }];
    const result = integrateWithFeatures(null, profiles);
    expect(result).toContain('Solo');
    expect(result).toContain('170cm');
  });

  it('integrateWithFeatures: tekrarlamaz (name kontrolu)', () => {
    const profiles = [{ name: 'AlreadyThere', measurements: { heightCm: 180 } }];
    const result = integrateWithFeatures('AlreadyThere mevcut', profiles);
    // Tekrar eklememeli
    expect(result.match(/AlreadyThere/g)?.length).toBe(1);
  });
});
