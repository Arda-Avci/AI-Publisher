/**
 * Character Profile — fiziksel + görünümsel + karakter detayları.
 *
 * Multi-character destegi: jobs.characters array olarak depolanir.
 * Tum alanlar opsiyonel — sadece doldurulanlar prompt'a enjekte edilir.
 * Full body generation'da (LTX/Wan/CogVideoX) fiziksel olculer direkt yansitilir.
 */

import { z } from 'zod';

// ── Sayisal olculer (cm/kg/numara) ──────────────────────────────
export const MeasurementSchema = z.object({
  heightCm: z.number().int().min(100).max(250).optional(),      // 100cm-250cm
  weightKg: z.number().int().min(30).max(250).optional(),        // 30kg-250kg
  chestCm: z.number().int().min(50).max(180).optional(),         // 50cm-180cm
  waistCm: z.number().int().min(40).max(170).optional(),         // 40cm-170cm
  hipsCm: z.number().int().min(50).max(180).optional(),          // 50cm-180cm
  shoulderCm: z.number().int().min(20).max(80).optional(),      // 20cm-80cm
  inseamCm: z.number().int().min(50).max(120).optional(),        // ic bacak
  shoeSize: z.number().int().min(20).max(60).optional(),         // EU ayakkabi
  bicepCm: z.number().int().min(15).max(70).optional(),
  thighCm: z.number().int().min(20).max(90).optional(),
});

// ── Görünümsel ──────────────────────────────────────────────────
export const AppearanceSchema = z.object({
  age: z.number().int().min(1).max(120).optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'other', 'unspecified']).default('unspecified'),
  ethnicity: z.string().max(80).optional(),                      // "Turkish", "Korean", vb.
  skinTone: z.enum(['porcelain', 'fair', 'light', 'medium', 'olive', 'tan', 'dark', 'very-dark']).optional(),
  hairColor: z.string().max(40).optional(),                      // "dark brown", "platinum blonde"
  hairStyle: z.string().max(60).optional(),                      // "shoulder length wavy"
  hairLength: z.enum(['bald', 'buzzcut', 'short', 'medium', 'long', 'very-long']).optional(),
  eyeColor: z.string().max(40).optional(),
  facialHair: z.enum(['none', 'stubble', 'mustache', 'goatee', 'beard', 'long-beard']).optional(),
  bodyType: z.enum(['slim', 'lean', 'athletic', 'average', 'muscular', 'curvy', 'heavyset', 'plus-size']).optional(),
  heightImpression: z.enum(['petite', 'short', 'average', 'tall', 'very-tall']).optional(),
  distinguishingFeatures: z.array(z.string().max(60)).max(8).optional(),  // "freckles", "scar on cheek"
});

// ── Stil & karakter ──────────────────────────────────────────────
export const StyleSchema = z.object({
  clothingStyle: z.string().max(120).optional(),                // "casual streetwear", "formal business"
  outfitDescription: z.string().max(300).optional(),              // detayli kiyaset tarifi
  accessories: z.array(z.string().max(60)).max(6).optional(),    // "watch", "glasses", "necklace"
  typicalColors: z.array(z.string().max(20)).max(5).optional(),  // "black", "white", "red"
  personality: z.string().max(200).optional(),                   // "confident, friendly, witty"
  voice: z.string().max(80).optional(),                          // "warm, deep, articulate"
  pose: z.string().max(120).optional(),                          // "relaxed, hands in pockets"
});

// ── Birlesik ────────────────────────────────────────────────────
export const CharacterProfileSchema = z.object({
  name: z.string().min(1).max(80),                                // "Elif", "John Doe"
  role: z.string().max(60).optional(),                           // "protagonist", "narrator"
  measurements: MeasurementSchema.optional(),
  appearance: AppearanceSchema.optional(),
  style: StyleSchema.optional(),
  freeformDescription: z.string().max(2000).optional(),          // serbest metin, diger alanlara sigmayan
});

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;
export type CharacterMeasurements = z.infer<typeof MeasurementSchema>;
export type CharacterAppearance = z.infer<typeof AppearanceSchema>;
export type CharacterStyle = z.infer<typeof StyleSchema>;

/** Multi-character wrapper: job basina 1+ karakter olabilir. */
export const CharacterProfilesSchema = z.array(CharacterProfileSchema).max(10);
export type CharacterProfiles = z.infer<typeof CharacterProfilesSchema>;

/** Default profil: minimum gerekli alan */
export function emptyProfile(name: string): CharacterProfile {
  return { name };
}

/** Validation result */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
  profile?: CharacterProfile;
}

export function validateProfile(input: unknown): ValidationResult {
  const result = CharacterProfileSchema.safeParse(input);
  if (result.success) {
    return { ok: true, errors: [], profile: result.data };
  }
  const issues = (result.error as { issues?: { path: (string | number)[]; message: string }[] }).issues
    ?? (result.error as { errors?: { path: (string | number)[]; message: string }[] }).errors
    ?? [];
  const errors = issues.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { ok: false, errors };
}
