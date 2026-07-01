/**
 * CharacterGenerationService — full body + photo-to-character.
 *
 * Iki ana islem:
 * 1. textToCharacterReference: profil bilgisinden SD/Flux ile full body
 *    referans gorseli uretir (portrait, full body, 3/4 view)
 * 2. photoToCharacterProfile: yuklenen fotoyu vision model ile analiz edip
 *    profil alanlarini doldurur (age, gender, measurements estimate, vb.)
 *
 * Ayrica prompt'larda @CharName referansini zenginlestiren
 * buildCharacterReferencePrompt() helper'i.
 */

import { Logger } from '../lib/logger.js';
import { dockerHost } from '../lib/docker-host.js';
import axios from 'axios';
import {
  type CharacterProfile,
  CharacterProfileSchema,
} from '../types/characterProfile.js';
import {
  getOutfitPrompt,
  type Gender,
} from './characterPresets.js';
import { profileToText } from './characterProfileService.js';
import { TIMEOUT } from '../constants.js';

// ── 1. Prompt Builder ──────────────────────────────────────────

/** Visual style'a gore stil cumlesi */
const STYLE_INSTRUCTIONS: Record<string, string> = {
  realistic: 'photorealistic, real human, natural skin texture, 8k uhd, soft natural lighting',
  photorealistic: 'hyperrealistic photograph, sharp focus, professional photography',
  cinematic: 'cinematic still, dramatic lighting, film grain, anamorphic lens',
  anime: 'anime style, vibrant colors, large expressive eyes, clean linework',
  '3d-render': '3d render, pixar style, smooth shading, studio lighting',
  cartoon: 'cartoon style, bold outlines, simplified features, bright colors',
  'oil-painting': 'oil painting, visible brushstrokes, classical composition, rich colors',
  watercolor: 'watercolor illustration, soft edges, translucent washes, hand-painted',
  illustration: 'digital illustration, clean lines, vibrant colors, modern style',
  'comic-book': 'comic book style, halftone dots, bold inking, cel-shaded',
  'pixel-art': 'pixel art, 16-bit retro style, limited color palette',
} as const;

/** Full body karakter referans gorseli icin SD/Flux prompt'u olusturur */
export function buildCharacterReferencePrompt(profile: CharacterProfile, view: 'portrait' | 'fullbody' | 'three-quarter' = 'fullbody'): string {
  const m = profile.measurements;
  const a = profile.appearance;
  const visualStyle = profile.visualStyle || 'realistic';
  const styleBase: string = STYLE_INSTRUCTIONS[visualStyle] ?? STYLE_INSTRUCTIONS.realistic ?? 'realistic style';

  // Fiziksel detaylari prompt'a gom
  const parts: string[] = [];

  if (view === 'portrait') {
    parts.push('close-up portrait, head and shoulders shot, face focus');
  } else if (view === 'three-quarter') {
    parts.push('three-quarter body view, slight angle showing face and body proportions');
  } else {
    parts.push('full body character reference sheet, standing pose, head to toe visible, full proportions, head-to-body ratio 1:7');
  }

  // Yas + cinsiyet
  if (a?.age) parts.push(`${a.age} years old`);
  if (a?.gender && a.gender !== 'unspecified') {
    const g = a.gender === 'male' ? 'man' : a.gender === 'female' ? 'woman' : 'person';
    parts.push(g);
  }

  // Fiziksel olculer (tam body icin onemli)
  if (m) {
    if (m.heightCm) parts.push(`${m.heightCm}cm tall, ${Math.floor(m.heightCm / 30.48)}'${Math.round((m.heightCm / 2.54) - Math.floor(m.heightCm / 30.48) * 12)}" stature`);
    if (m.weightKg) parts.push(`${m.weightKg}kg`);
    if (m.chestCm) parts.push(`${m.chestCm}cm chest`);
    if (m.waistCm) parts.push(`${m.waistCm}cm waist`);
    if (m.hipsCm) parts.push(`${m.hipsCm}cm hips`);
    if (m.shoulderCm) parts.push(`${m.shoulderCm}cm shoulders`);
    if (m.shoeSize) parts.push(`shoe size ${m.shoeSize} EU`);
  }

  // Görünüm
  if (a?.bodyType) parts.push(`${a.bodyType} build`);
  if (a?.skinTone) parts.push(`${a.skinTone} skin`);
  if (a?.hairColor) parts.push(`${a.hairColor} hair`);
  if (a?.hairStyle) parts.push(a.hairStyle);
  if (a?.hairLength) parts.push(`${a.hairLength} hair length`);
  if (a?.eyeColor) parts.push(`${a.eyeColor} eyes`);
  if (a?.facialHair && a.facialHair !== 'none') parts.push(a.facialHair);
  if (a?.distinguishingFeatures?.length) parts.push(`distinctive: ${a.distinguishingFeatures.join(', ')}`);

  // Kıyafet
  const outfitDesc = profile.style?.outfitDescription;
  const outfitFromPreset = outfitDesc ? getOutfitPrompt(outfitDesc) : null;
  const outfitText: string = outfitFromPreset ?? outfitDesc ?? 'casual clothing';
  parts.push(`wearing: ${outfitText}`);

  // Stil
  parts.push(styleBase);

  // Kalite
  parts.push('masterpiece, high quality, sharp details, character sheet reference');

  return parts.join(', ');
}

// ── 2. textToCharacterReference (SD/Flux) ──────────────────────

export interface GenerationResult {
  imageBase64: string;
  prompt: string;
  view: string;
  model: string;
}

export interface FullBodyGenerationOptions {
  width?: number;
  height?: number;
  model?: 'flux-schnell' | 'sdxl' | 'dreamshaper';
  /** Negative prompt (istenmeyen ogeler) */
  negativePrompt?: string;
}

/** Metin + profil bilgisinden full body karakter referans gorseli uretir (SD/Flux) */
export async function textToCharacterReference(
  profile: CharacterProfile,
  options: FullBodyGenerationOptions = {},
): Promise<GenerationResult> {
  const validated = CharacterProfileSchema.parse(profile);
  const view = options.model === 'flux-schnell' ? 'fullbody' : 'fullbody';
  const prompt = buildCharacterReferencePrompt(validated, view);
  const negativePrompt = options.negativePrompt
    ?? 'blurry, low quality, distorted, deformed, ugly, bad anatomy, bad hands, missing fingers, extra fingers, watermark, signature, text, logo';

  // Once SD/Flux'a gonder, yoksa stablediffusion service'a fallback
  const model = options.model ?? 'flux-schnell';
  const url = dockerHost.getServiceUrl('stablediffusion', '/generate-image');

  try {
    const response = await axios.post(
      url,
      {
        prompt,
        negative_prompt: negativePrompt,
        model_type: model,
        width: options.width ?? 1024,
        height: options.height ?? 1024,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
      { timeout: TIMEOUT.FFMPEG, responseType: 'json' },
    );
    if (response.data?.status === 'success' && response.data?.image_base64) {
      return {
        imageBase64: response.data.image_base64,
        prompt,
        view,
        model,
      };
    }
    throw new Error(response.data?.error || 'Stablediffusion response basarisiz');
  } catch (error: any) {
    Logger.error('[CharacterGen] SD generation failed:', error.message);
    throw new Error(`Full body karakter uretilemedi: ${error.message}`);
  }
}

// ── 3. photoToCharacterProfile (vision AI) ─────────────────────

export interface PhotoAnalysisResult {
  age: number;
  ageConfidence: 'low' | 'medium' | 'high';
  gender: Gender;
  bodyType?: string;
  estimatedHeightCm: { value: number; confidence: 'low' | 'medium' | 'high' };
  estimatedWeightKg?: { value: number; confidence: 'low' | 'medium' | 'high' };
  hairColor: string;
  hairStyle: string;
  hairLength: string;
  eyeColor: string;
  skinTone: string;
  bodyCharacteristics: string[];
  outfitDescription: string;
  distinguishingFeatures: string[];
  /** Tum analizi ozetleyen ingilizce prompt parcacigi */
  visualPrompt: string;
  /** confidence 0-1 */
  overallConfidence: number;
}

/** Vision AI sistem promptu (karakter analizi icin) */
const VISION_SYSTEM_PROMPT = `Sen bir gorsel karakter analiz uzmanisin. Fotograftaki kisinin fiziksel ozelliklerini analiz et ve asagidaki JSON formatinda don:

{
  "age": 30,                    // sayi (1-120), tahmini yas
  "ageConfidence": "high",      // low/medium/high
  "gender": "female",           // male/female/non-binary/other
  "bodyType": "average",        // slim/lean/athletic/average/muscular/curvy/heavyset/plus-size
  "estimatedHeightCm": 165,     // tahmini boy (cm)
  "heightConfidence": "medium", // low/medium/high
  "estimatedWeightKg": 60,      // tahmini kilo (kg)
  "weightConfidence": "low",    // low/medium/high
  "hairColor": "kahverengi",    // sac rengi
  "hairStyle": "duz",           // sac stili
  "hairLength": "long",         // bald/buzzcut/short/medium/long/very-long
  "eyeColor": "kahverengi",     // goz rengi
  "skinTone": "medium",         // ten rengi
  "bodyCharacteristics": ["fit"], // dikkat ceken vucut ozellikleri
  "outfitDescription": "klasik is kiyaseti", // aciklamali
  "distinguishingFeatures": ["ben"], // benler, izler, vb.
  "visualPrompt": "30 yasinda, 165cm boyunda, kadin, kahverengi uzun sacli, kahverengi gozlu, klasik is kiyasetli profesyonel",
  "overallConfidence": 0.85     // 0-1 arasinda
}

Sadece JSON don, baska aciklama yapma.`;

/** Fotograftan karakter profili cikarir (Gemini 2.5 Flash vision) */
export async function photoToCharacterProfile(
  imageBase64: string,
  hints?: { name?: string; knownAge?: number; knownGender?: Gender },
): Promise<PhotoAnalysisResult> {
  if (!imageBase64) {
    throw new Error('Fotograf gerekli (base64).');
  }

  // Gemini 2.5 Flash vision'i dogrudan cagir
  const { google } = await import('@ai-sdk/google');
  const { generateText } = await import('ai');

  const userPrompt = hints
    ? `Kullanici ipuclari: isim="${hints.name ?? 'bilinmiyor'}", yas=${hints.knownAge ?? 'bilinmiyor'}, cinsiyet=${hints.knownGender ?? 'bilinmiyor'}. Bu ipuclarini da goz onunde bulundurarak analiz yap.`
    : 'Fotograftaki karakteri analiz et.';

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
    });

    // JSON parse
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Vision AI gecerli JSON dondurmedi');
    }
    const parsed = JSON.parse(jsonMatch[0]) as PhotoAnalysisResult;
    Logger.info('[CharacterGen] Photo analysis:', parsed);
    return parsed;
  } catch (error: any) {
    Logger.error('[CharacterGen] Vision AI failed:', error.message);
    throw new Error(`Fotograf analizi basarisiz: ${error.message}`);
  }
}

/** Vision analizini CharacterProfile'a donusturur */
export function analysisToProfile(
  analysis: PhotoAnalysisResult,
  name: string,
  role?: string,
): CharacterProfile {
  return {
    name,
    role,
    visualStyle: 'realistic',
    measurements: {
      heightCm: analysis.estimatedHeightCm.value,
      weightKg: analysis.estimatedWeightKg?.value,
    },
    appearance: {
      age: analysis.age,
      gender: analysis.gender,
      skinTone: analysis.skinTone as NonNullable<CharacterProfile['appearance']>['skinTone'],
      hairColor: analysis.hairColor,
      hairStyle: analysis.hairStyle,
      hairLength: analysis.hairLength as NonNullable<CharacterProfile['appearance']>['hairLength'],
      eyeColor: analysis.eyeColor,
      bodyType: analysis.bodyType as NonNullable<CharacterProfile['appearance']>['bodyType'],
      distinguishingFeatures: analysis.distinguishingFeatures,
    },
    style: {
      outfitDescription: analysis.outfitDescription,
    },
    freeformDescription: analysis.visualPrompt,
  };
}

// ── 4. @CharName Reference Helper ──────────────────────────────

/**
 * Karakter profilini prompt icin @-referansli zenginlestirilmis metin haline getirir.
 * Ornek cikti: "@Elif: 175cm boyunda, atletik, sac rengi kahverengi... (referans: 95cm gogus, 80cm bel)"
 */
export function buildCharacterReferenceText(profile: CharacterProfile, includeMeasurements = true): string {
  const baseText = profileToText(profile);
  const handle = `@${profile.name.replace(/\s+/g, '')}`;
  let ref = `${handle}: ${baseText.split('\n').slice(1).join(' ').trim()}`;

  if (includeMeasurements && profile.measurements) {
    const m = profile.measurements;
    const parts: string[] = [];
    if (m.heightCm) parts.push(`${m.heightCm}cm boy`);
    if (m.weightKg) parts.push(`${m.weightKg}kg`);
    if (m.chestCm) parts.push(`${m.chestCm}cm göğüs`);
    if (m.waistCm) parts.push(`${m.waistCm}cm bel`);
    if (m.hipsCm) parts.push(`${m.hipsCm}cm kalça`);
    ref += ` | fiziksel referans: ${parts.join(', ')}`;
  }
  return ref;
}

/** Tum profil listesini tek metin olarak birlestir (@-referansli) */
export function buildAllCharacterReferences(profiles: CharacterProfile[]): string {
  if (profiles.length === 0) return '';
  return profiles.map((p) => buildCharacterReferenceText(p)).join('\n\n');
}
