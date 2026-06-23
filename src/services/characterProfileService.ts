/**
 * CharacterProfileService — fiziksel detaylari yonet + prompt injection.
 *
 * - CRUD: job bazinda karakter ekle/guncelle/sil
 * - toText: profil JSON'undan AI prompt icin dogal dil aciklamasi uretir
 * - integrate: video_jobs.character_features metnine detaylari otomatik enjekte eder
 */

import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import {
  type CharacterProfile,
  type CharacterProfiles,
  CharacterProfilesSchema,
  emptyProfile,
  validateProfile,
} from '../types/characterProfile.js';

// (Logger is used as static class below)

/** DB'den karakter profillerini oku (JSON parse + validate) */
export function getProfiles(job: { character_profiles?: string | null }): CharacterProfiles {
  if (!job.character_profiles) return [];
  try {
    const parsed = JSON.parse(job.character_profiles);
    const validated = CharacterProfilesSchema.safeParse(parsed);
    if (validated.success) return validated.data;
    Logger.warn(`[CharacterProfile] Gecersiz JSON, fallback bos liste`);
    return [];
  } catch {
    return [];
  }
}

/** Profilleri JSON string olarak DB'ye yaz */
export function setProfiles(profiles: CharacterProfiles): string {
  const validated = CharacterProfilesSchema.safeParse(profiles);
  if (!validated.success) {
    const err = validated.error as { issues?: { path: (string | number)[]; message: string }[] };
    const issues = err.issues ?? [];
    Logger.error(`[CharacterProfile] Profil validasyon hatasi: ${JSON.stringify(issues)}`);
    throw new Error('Invalid character profiles');
  }
  return JSON.stringify(validated.data);
}

/** Tek profil ekle (job id uzerinden) */
export async function addProfile(jobId: number, profile: CharacterProfile): Promise<CharacterProfiles> {
  const validated = validateProfile(profile);
  if (!validated.ok) {
    throw new Error(`Invalid profile: ${validated.errors.join(', ')}`);
  }
  const row = await db.get('SELECT character_profiles FROM video_jobs WHERE id = ?', [jobId]);
  const profiles = getProfiles(row ?? {});
  const next = [...profiles, validated.profile!].slice(0, 10);
  await db.run('UPDATE video_jobs SET character_profiles = ? WHERE id = ?', [
    setProfiles(next),
    jobId,
  ]);
  return next;
}

/** Profili index ile guncelle */
export async function updateProfile(
  jobId: number,
  index: number,
  profile: CharacterProfile,
): Promise<CharacterProfiles> {
  const validated = validateProfile(profile);
  if (!validated.ok) {
    throw new Error(`Invalid profile: ${validated.errors.join(', ')}`);
  }
  const row = await db.get('SELECT character_profiles FROM video_jobs WHERE id = ?', [jobId]);
  const profiles = getProfiles(row ?? {});
  if (index < 0 || index >= profiles.length) {
    throw new Error(`Profile index out of range: ${index}`);
  }
  const next = [...profiles];
  next[index] = validated.profile!;
  await db.run('UPDATE video_jobs SET character_profiles = ? WHERE id = ?', [
    setProfiles(next),
    jobId,
  ]);
  return next;
}

/** Profili index ile sil */
export async function removeProfile(jobId: number, index: number): Promise<CharacterProfiles> {
  const row = await db.get('SELECT character_profiles FROM video_jobs WHERE id = ?', [jobId]);
  const profiles = getProfiles(row ?? {});
  if (index < 0 || index >= profiles.length) {
    throw new Error(`Profile index out of range: ${index}`);
  }
  const next = profiles.filter((_, i) => i !== index);
  await db.run('UPDATE video_jobs SET character_profiles = ? WHERE id = ?', [
    setProfiles(next),
    jobId,
  ]);
  return next;
}

// ── Text Formatlama ────────────────────────────────────────────

/** Olculeri dogal dil aciklamasina cevir */
function formatMeasurements(m: NonNullable<CharacterProfile['measurements']>): string {
  const parts: string[] = [];
  if (m.heightCm !== undefined) {
    const ft = Math.floor(m.heightCm / 30.48);
    const inch = Math.round((m.heightCm / 2.54) - ft * 12);
    parts.push(`${m.heightCm}cm (${ft}'${inch}") boyunda`);
  }
  if (m.weightKg !== undefined) parts.push(`${m.weightKg}kg`);
  if (m.chestCm || m.waistCm || m.hipsCm) {
    // BMI ipucu vermeden fiziksel yapi
    if (m.chestCm !== undefined) parts.push(`gogus ${m.chestCm}cm`);
    if (m.waistCm !== undefined) parts.push(`bel ${m.waistCm}cm`);
    if (m.hipsCm !== undefined) parts.push(`kalca ${m.hipsCm}cm`);
    if (m.shoulderCm !== undefined) parts.push(`omuz ${m.shoulderCm}cm`);
    if (m.inseamCm !== undefined) parts.push(`ic bacak ${m.inseamCm}cm`);
  }
  if (m.bicepCm !== undefined) parts.push(`biceps ${m.bicepCm}cm`);
  if (m.thighCm !== undefined) parts.push(`uyluk ${m.thighCm}cm`);
  if (m.shoeSize !== undefined) parts.push(`ayakkabi ${m.shoeSize} EU`);
  return parts.join(', ');
}

function formatAppearance(a: NonNullable<CharacterProfile['appearance']>): string {
  const parts: string[] = [];
  if (a.age !== undefined) parts.push(`${a.age} yasinda`);
  if (a.gender && a.gender !== 'unspecified') {
    const genderMap: Record<string, string> = {
      male: 'erkek',
      female: 'kadin',
      'non-binary': 'non-binary',
      other: 'diger',
    };
    parts.push(genderMap[a.gender] || a.gender);
  }
  if (a.ethnicity) parts.push(a.ethnicity);
  if (a.skinTone) {
    const skinMap: Record<string, string> = {
      porcelain: 'porselen ten',
      fair: 'acik ten',
      light: 'aydin ten',
      medium: 'orta ten',
      olive: 'zeytin ten',
      tan: 'bronz ten',
      dark: 'koyu ten',
      'very-dark': 'cok koyu ten',
    };
    parts.push(skinMap[a.skinTone] || a.skinTone);
  }
  if (a.bodyType) {
    const bodyMap: Record<string, string> = {
      slim: 'ince yapili',
      lean: 'zayif ama sert',
      athletic: 'atletik',
      average: 'ortalama',
      muscular: 'kasli',
      curvy: 'kavunlu',
      heavyset: 'dolgun',
      'plus-size': 'buyuk beden',
    };
    parts.push(bodyMap[a.bodyType] || a.bodyType);
  } else if (a.heightImpression) {
    const hMap: Record<string, string> = {
      petite: 'minyon',
      short: 'kisa boylu',
      average: 'ortalama boylu',
      tall: 'uzun boylu',
      'very-tall': 'cok uzun boylu',
    };
    parts.push(hMap[a.heightImpression] || a.heightImpression);
  }
  if (a.hairColor) {
    parts.push(`${a.hairColor} sacli`);
  }
  if (a.hairStyle) parts.push(a.hairStyle);
  if (a.hairLength) {
    const lenMap: Record<string, string> = {
      bald: 'kel',
      buzzcut: 'cok kisa sacli',
      short: 'kisa sacli',
      medium: 'orta uzunlukta sacli',
      long: 'uzun sacli',
      'very-long': 'cok uzun sacli',
    };
    parts.push(lenMap[a.hairLength] || a.hairLength);
  }
  if (a.eyeColor) parts.push(`${a.eyeColor} gozlu`);
  if (a.facialHair && a.facialHair !== 'none') {
    const fhMap: Record<string, string> = {
      stubble: 'kirli sakalli',
      mustache: 'bıyikli',
      goatee: 'goatee sakalli',
      beard: 'sakalli',
      'long-beard': 'uzun sakalli',
    };
    parts.push(fhMap[a.facialHair] || a.facialHair);
  }
  if (a.distinguishingFeatures?.length) {
    parts.push(`ayirt edici: ${a.distinguishingFeatures.join(', ')}`);
  }
  return parts.join(', ');
}

function formatStyle(s: NonNullable<CharacterProfile['style']>): string {
  const parts: string[] = [];
  if (s.clothingStyle) parts.push(s.clothingStyle);
  if (s.outfitDescription) parts.push(s.outfitDescription);
  if (s.accessories?.length) parts.push(`aksesuar: ${s.accessories.join(', ')}`);
  if (s.typicalColors?.length) parts.push(`renk paleti: ${s.typicalColors.join(', ')}`);
  if (s.personality) parts.push(`kisilik: ${s.personality}`);
  if (s.voice) parts.push(`ses tonu: ${s.voice}`);
  if (s.pose) parts.push(`tipik poz: ${s.pose}`);
  return parts.join('. ');
}

/** Tek profili AI prompt icin dogal dil paragrafina cevir */
export function profileToText(profile: CharacterProfile): string {
  const lines: string[] = [];
  const header = profile.role
    ? `${profile.name} (${profile.role})`
    : profile.name;
  lines.push(header + ':');

  const allDesc: string[] = [];
  if (profile.measurements) {
    const m = formatMeasurements(profile.measurements);
    if (m) allDesc.push(m);
  }
  if (profile.appearance) {
    const a = formatAppearance(profile.appearance);
    if (a) allDesc.push(a);
  }
  if (profile.style) {
    const s = formatStyle(profile.style);
    if (s) allDesc.push(s);
  }
  if (profile.freeformDescription) {
    allDesc.push(profile.freeformDescription);
  }
  if (allDesc.length === 0) return header;
  lines.push('  ' + allDesc.join('. '));
  return lines.join('\n');
}

/** Tum profilleri tek metin blogunda birlestir (AI prompt icin) */
export function profilesToText(profiles: CharacterProfiles): string {
  if (profiles.length === 0) return '';
  return profiles.map(profileToText).join('\n\n');
}

/** character_features text'ini al, profillere gore zenginlestir, dondur. */
export function integrateWithFeatures(
  characterFeatures: string | null | undefined,
  profiles: CharacterProfiles,
): string {
  const profileText = profilesToText(profiles);
  if (!profileText) return characterFeatures ?? '';
  if (!characterFeatures) return profileText;
  // Eger character_features zaten profilleri iceriyorsa tekrarlama
  if (characterFeatures.includes(profiles[0]?.name ?? '__none__')) {
    return characterFeatures;
  }
  return `${characterFeatures}\n\n--- Detayli Fiziksel Ozellikler ---\n${profileText}`;
}

/** Default profil: minimum gerekli alanlarla ornek */
export function exampleProfile(name = 'Ana Karakter'): CharacterProfile {
  return {
    name,
    role: 'protagonist',
    measurements: {
      heightCm: 175,
      weightKg: 70,
      chestCm: 95,
      waistCm: 80,
      hipsCm: 95,
      shoulderCm: 45,
    },
    appearance: {
      age: 32,
      gender: 'female',
      skinTone: 'medium',
      hairColor: 'dark brown',
      hairLength: 'long',
      eyeColor: 'brown',
      bodyType: 'athletic',
    },
    style: {
      personality: 'guvenli, sicak kanli, karizmatik',
      voice: 'kalin, melodik, net',
    },
  };
}

export { emptyProfile, validateProfile };
