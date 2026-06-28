/**
 * Character Presets — yas + cinsiyet bazli fiziksel defaultlar + outfit presets.
 *
 * Yeni karakter olusturuldugunda otomatik default degerler uretir.
 * Kullanici isterse elle degistirebilir.
 */

import { Logger } from '../lib/logger.js';

// (Logger is used as static class below)

export type Gender = 'male' | 'female' | 'non-binary' | 'other' | 'unspecified';
export type AgeGroup = 'child' | 'teen' | 'young-adult' | 'adult' | 'middle-aged' | 'senior';

export interface PresetMeasurements {
  heightCm: number;
  weightKg: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  shoulderCm: number;
  shoeSize: number;
}

export interface PresetAppearance {
  skinTone?: string;
  hairColor?: string;
  hairStyle?: string;
  hairLength?: string;
  eyeColor?: string;
  bodyType?: string;
}

export interface OutfitPreset {
  id: string;
  label: string;
  labelTr: string;
  description: string;
  /** 'male' | 'female' | 'all' */
  appliesTo: 'male' | 'female' | 'all';
  /** 'child' | 'adult' | 'all' */
  appliesAge: 'child' | 'adult' | 'all';
  prompt: string;
}

// ── Yas/Cinsiyet bazli fiziksel default tablolar ───────────────────

/** Erkek default fiziksel olculer, yasa gore (ortalama degerler) */
const MALE_PRESETS: Record<AgeGroup, PresetMeasurements> = {
  child:    { heightCm: 130, weightKg: 30, chestCm: 64, waistCm: 58, hipsCm: 68, shoulderCm: 30, shoeSize: 32 },
  teen:     { heightCm: 170, weightKg: 60, chestCm: 84, waistCm: 72, hipsCm: 88, shoulderCm: 42, shoeSize: 42 },
  'young-adult': { heightCm: 178, weightKg: 75, chestCm: 96, waistCm: 80, hipsCm: 95, shoulderCm: 46, shoeSize: 43 },
  adult:    { heightCm: 178, weightKg: 80, chestCm: 100, waistCm: 86, hipsCm: 98, shoulderCm: 47, shoeSize: 43 },
  'middle-aged': { heightCm: 176, weightKg: 85, chestCm: 104, waistCm: 92, hipsCm: 100, shoulderCm: 47, shoeSize: 43 },
  senior:   { heightCm: 172, weightKg: 78, chestCm: 102, waistCm: 94, hipsCm: 98, shoulderCm: 45, shoeSize: 42 },
};

/** Kadin default fiziksel olculer, yasa gore */
const FEMALE_PRESETS: Record<AgeGroup, PresetMeasurements> = {
  child:    { heightCm: 128, weightKg: 28, chestCm: 62, waistCm: 56, hipsCm: 66, shoulderCm: 28, shoeSize: 31 },
  teen:     { heightCm: 162, weightKg: 52, chestCm: 80, waistCm: 66, hipsCm: 90, shoulderCm: 36, shoeSize: 38 },
  'young-adult': { heightCm: 165, weightKg: 58, chestCm: 86, waistCm: 70, hipsCm: 94, shoulderCm: 38, shoeSize: 38 },
  adult:    { heightCm: 165, weightKg: 62, chestCm: 90, waistCm: 74, hipsCm: 96, shoulderCm: 39, shoeSize: 38 },
  'middle-aged': { heightCm: 163, weightKg: 66, chestCm: 92, waistCm: 78, hipsCm: 98, shoulderCm: 39, shoeSize: 38 },
  senior:   { heightCm: 160, weightKg: 62, chestCm: 90, waistCm: 80, hipsCm: 96, shoulderCm: 38, shoeSize: 37 },
};

/** Non-binary / diger: ortalama degerler */
const NEUTRAL_PRESETS: Record<AgeGroup, PresetMeasurements> = {
  child:    { heightCm: 129, weightKg: 29, chestCm: 63, waistCm: 57, hipsCm: 67, shoulderCm: 29, shoeSize: 32 },
  teen:     { heightCm: 166, weightKg: 56, chestCm: 82, waistCm: 69, hipsCm: 89, shoulderCm: 39, shoeSize: 40 },
  'young-adult': { heightCm: 171, weightKg: 66, chestCm: 91, waistCm: 75, hipsCm: 95, shoulderCm: 42, shoeSize: 41 },
  adult:    { heightCm: 171, weightKg: 70, chestCm: 95, waistCm: 80, hipsCm: 97, shoulderCm: 43, shoeSize: 41 },
  'middle-aged': { heightCm: 170, weightKg: 74, chestCm: 98, waistCm: 85, hipsCm: 99, shoulderCm: 43, shoeSize: 41 },
  senior:   { heightCm: 166, weightKg: 70, chestCm: 96, waistCm: 86, hipsCm: 97, shoulderCm: 42, shoeSize: 40 },
};

/** Yas -> yas grubu donusumu (sayi → AgeGroup) */
export function ageToGroup(age: number): AgeGroup {
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  if (age < 30) return 'young-adult';
  if (age < 50) return 'adult';
  if (age < 65) return 'middle-aged';
  return 'senior';
}

/** Yastan + cinsiyetten default fiziksel olculer */
export function getDefaultMeasurements(age: number, gender: Gender): PresetMeasurements {
  const group = ageToGroup(age);
  if (gender === 'male') return { ...MALE_PRESETS[group] };
  if (gender === 'female') return { ...FEMALE_PRESETS[group] };
  return { ...NEUTRAL_PRESETS[group] };
}

/** Yastan + cinsiyetten default gorunum (ten, sac, goz) */
export function getDefaultAppearance(age: number, gender: Gender): PresetAppearance {
  const group = ageToGroup(age);
  const defaults: Record<AgeGroup, PresetAppearance> = {
    child: { skinTone: 'light', hairColor: 'koyu kahverengi', hairStyle: 'düz', hairLength: 'medium', eyeColor: 'kahverengi', bodyType: 'slim' },
    teen: { skinTone: 'light', hairColor: 'kahverengi', hairStyle: 'düz', hairLength: 'long', eyeColor: 'kahverengi', bodyType: 'slim' },
    'young-adult': { skinTone: 'medium', hairColor: 'kahverengi', hairStyle: 'düz', hairLength: 'medium', eyeColor: 'kahverengi', bodyType: 'average' },
    adult: { skinTone: 'medium', hairColor: 'kahverengi', hairStyle: 'doğal', hairLength: 'medium', eyeColor: 'kahverengi', bodyType: 'average' },
    'middle-aged': { skinTone: 'medium', hairColor: 'gri karışık', hairStyle: 'doğal', hairLength: 'short', eyeColor: 'kahverengi', bodyType: 'average' },
    senior: { skinTone: 'light', hairColor: 'beyaz', hairStyle: 'doğal', hairLength: 'short', eyeColor: 'kahverengi', bodyType: 'slim' },
  };
  // Erkekler icin default: kisa sac, golgesiz
  if (gender === 'male') {
    return { ...defaults[group], hairLength: group === 'teen' ? 'short' : 'short', hairStyle: 'kısa' };
  }
  return defaults[group];
}

// ── Outfit Presets ─────────────────────────────────────────────

export const OUTFIT_PRESETS: OutfitPreset[] = [
  // ── Kadin yetiskin ──
  {
    id: 'female-dress',
    label: 'Elegant Dress',
    labelTr: 'Şık Elbise',
    description: 'Klasik uzun elbise',
    appliesTo: 'female',
    appliesAge: 'adult',
    prompt: 'elegant uzun elbise, zarif, klasik kesim',
  },
  {
    id: 'female-tshirt-skirt',
    label: 'T-Shirt + Skirt',
    labelTr: 'T-Shirt + Etek',
    description: 'Rahat günlük kombin',
    appliesTo: 'female',
    appliesAge: 'adult',
    prompt: 'rahat t-shirt ve diz üstü etek, günlük şık',
  },
  {
    id: 'female-business',
    label: 'Business Suit',
    labelTr: 'İş Takımı',
    description: 'Profesyonel iş kıyafeti',
    appliesTo: 'female',
    appliesAge: 'adult',
    prompt: 'profesyonel kadın iş takımı, blazer ve pantolon',
  },
  // ── Kadin cocuk ──
  {
    id: 'female-child-play',
    label: 'Casual Kids',
    labelTr: 'Rahat Çocuk Kıyafeti',
    description: 'Çocuk için rahat kıyafet',
    appliesTo: 'female',
    appliesAge: 'child',
    prompt: 'canlı renklerde rahat çocuk kıyafeti, t-shirt ve şort veya etek',
  },
  {
    id: 'female-child-school',
    label: 'School Uniform',
    labelTr: 'Okul Üniforması',
    description: 'Kız çocuğu okul forması',
    appliesTo: 'female',
    appliesAge: 'child',
    prompt: 'klasik okul üniforması, beyaz gömlek ve lacivert etek',
  },
  // ── Erkek yetiskin ──
  {
    id: 'male-suit',
    label: 'Business Suit',
    labelTr: 'Takım Elbise',
    description: 'Klasik erkek takım elbise',
    appliesTo: 'male',
    appliesAge: 'adult',
    prompt: 'klasik takım elbise, kravat, gömlek',
  },
  {
    id: 'male-tshirt-shorts',
    label: 'T-Shirt + Shorts',
    labelTr: 'T-Shirt + Şort',
    description: 'Yaz için rahat kombin',
    appliesTo: 'male',
    appliesAge: 'adult',
    prompt: 'rahat t-shirt ve şort, yaz kombin',
  },
  {
    id: 'male-tshirt-pants',
    label: 'T-Shirt + Pants',
    labelTr: 'T-Shirt + Pantolon',
    description: 'Günlük erkek kombin',
    appliesTo: 'male',
    appliesAge: 'adult',
    prompt: 'rahat t-shirt ve kot pantolon, günlük şık',
  },
  {
    id: 'male-casual',
    label: 'Casual',
    labelTr: 'Günlük Rahat',
    description: 'Tişört ve kot pantolon',
    appliesTo: 'male',
    appliesAge: 'adult',
    prompt: 'günlük rahat, tişört ve kot pantolon',
  },
  // ── Erkek çocuk ──
  {
    id: 'male-child-play',
    label: 'Casual Kids',
    labelTr: 'Rahat Çocuk Kıyafeti',
    description: 'Çocuk için rahat kıyafet',
    appliesTo: 'male',
    appliesAge: 'child',
    prompt: 'canlı renklerde rahat çocuk kıyafeti, t-shirt ve şort',
  },
  {
    id: 'male-child-school',
    label: 'School Uniform',
    labelTr: 'Okul Üniforması',
    description: 'Erkek çocuğu okul forması',
    appliesTo: 'male',
    appliesAge: 'child',
    prompt: 'klasik okul üniforması, beyaz gömlek ve lacivert şort ve pantolon',
  },
  // ── Tüm (unisex) ──
  {
    id: 'all-sport',
    label: 'Sport',
    labelTr: 'Spor Kıyafeti',
    description: 'Aktif spor giyim',
    appliesTo: 'all',
    appliesAge: 'all',
    prompt: 'spor kıyafeti, eşofman veya aktif giyim',
  },
  {
    id: 'all-formal',
    label: 'Formal',
    labelTr: 'Resmi Kıyafet',
    description: 'Ciddi resmi kıyafet',
    appliesTo: 'all',
    appliesAge: 'all',
    prompt: 'resmi şık kıyafet, smokin veya gece elbisesi',
  },
  {
    id: 'all-pajama',
    label: 'Casual Home',
    labelTr: 'Ev Kıyafeti',
    description: 'Rahat ev kıyafeti',
    appliesTo: 'all',
    appliesAge: 'all',
    prompt: 'rahat ev kıyafeti, pijama veya sweatshirt',
  },
  {
    id: 'all-historical',
    label: 'Historical',
    labelTr: 'Tarihî Kıyafet',
    description: 'Dönemsel kıyafet',
    appliesTo: 'all',
    appliesAge: 'all',
    prompt: 'tarihi dönem kıyafeti, döneme uygun',
  },
];

/** Yas + cinsiyete uygun outfit presets listele */
export function getOutfitPresets(age: number, gender: Gender): OutfitPreset[] {
  const group = ageToGroup(age);
  const ageBucket: 'child' | 'adult' = group === 'child' ? 'child' : 'adult';
  return OUTFIT_PRESETS.filter((p) => {
    const genderMatch = p.appliesTo === 'all' || p.appliesTo === gender;
    const ageMatch = p.appliesAge === 'all' || p.appliesAge === ageBucket;
    return genderMatch && ageMatch;
  });
}

/** Default outfit ID (cinsiyet + yasa gore ilk uygun) */
export function getDefaultOutfitId(age: number, gender: Gender): string {
  const presets = getOutfitPresets(age, gender);
  if (presets.length === 0) return 'all-sport';
  if (gender === 'female') {
    if (age < 13) return 'female-child-school';
    return 'female-dress';
  }
  if (gender === 'male') {
    if (age < 13) return 'male-child-school';
    return 'male-suit';
  }
  return presets[0]?.id ?? 'all-sport';
}

/** Outfit ID'den prompt text'i getir */
export function getOutfitPrompt(outfitId: string): string | null {
  const preset = OUTFIT_PRESETS.find((p) => p.id === outfitId);
  return preset ? preset.prompt : null;
}

/** Yeni karakter icin tum default degerleri uret */
export function getCharacterDefaults(name: string, age: number, gender: Gender): {
  name: string;
  age: number;
  gender: Gender;
  measurements: PresetMeasurements;
  appearance: PresetAppearance;
  outfit_preset: string;
} {
  return {
    name,
    age,
    gender,
    measurements: getDefaultMeasurements(age, gender),
    appearance: getDefaultAppearance(age, gender),
    outfit_preset: getDefaultOutfitId(age, gender),
  };
}

Logger.debug('[CharacterPresets] Module loaded');
