// src/lib/translation.ts
// Gemini-powered helpers for the Video Differentiation pipeline.
//
// All three functions (cleanText, translateText, generateScenePrompts) use
// the project's existing @ai-sdk/google model. Structured scene output uses
// `generateObject` with a Zod schema, matching the pattern in queue.ts.

import { getAIModel } from './ai-provider.js';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { withRetry } from './ai-utils.js';

// Languages we expose in the UI. Keep the same set as the front-end.
export const SUPPORTED_LANGS = ['tr', 'en', 'de', 'fr', 'es'] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const LANG_NAMES: Record<SupportedLang, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español'
};

export function isSupportedLang(code: string): code is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(code);
}

// ── 1. Clean the raw transcript ───────────────────────────────────────────
export async function cleanText(raw: string): Promise<string> {
  if (!raw || !raw.trim()) return '';
  const { text } = await withRetry(() => generateText({
    model: getAIModel(),
    prompt:
      'Görevin: Bir YouTube videosunun ham transkriptini temizlemek ve kusursuzlaştırmaktır. ' +
      'Yazım hatalarını düzelt, dolgu kelimelerini at. Fikrin özüne ve iskeletine %100 sadık kal. ' +
      'Ancak AI tespiti (AI detection) yazılımlarına yakalanmamak için: kelimelerin yerlerini hafifçe değiştir, ' +
      'eş anlamlılar kullan ve cümle yapılarını anlamı bozmadan yeniden kurgula (Eşsizleştirme). ' +
      'Dili daha doğal bir hale getir. ' +
      'Return ONLY the cleaned text. No preamble, no quotes.\n\n' +
      raw
  }));
  return text.trim();
}

// ── 2. Translate to the target language ───────────────────────────────────
export async function translateText(text: string, targetLang: SupportedLang): Promise<string> {
  if (!text || !text.trim()) return '';
  if (!isSupportedLang(targetLang)) {
    throw new Error('translateText: unsupported target language: ' + targetLang);
  }
  const { text: out } = await withRetry(() => generateText({
    model: getAIModel(),
    prompt:
      'Translate the following text to ' + LANG_NAMES[targetLang] + ' (' + targetLang + '). ' +
      'ÖNEMLİ KURAL: Orijinal metin akademik, resmi veya soğuk olsa bile, sen bunu her zaman ' +
      '"samimi, arkadaş canlısı bir hikaye anlatımı (storytelling)" formuna dönüştürerek çevirmelisin. ' +
      'İzleyicinin ekranda kalmasını sağlayacak bir duygu kat. ' +
      'Hedef dilin kültürel kullanım alışkanlıklarına göre lokalize et (Yerelleştir). ' +
      'Return ONLY the translated text without any explanations.\n\n' +
      text
  }));
  return out.trim();
}

// ── 3. Generate structured scene prompts ──────────────────────────────────
const SceneSchema = z.object({
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    videoPrompt: z.string().describe('English description for an AI text-to-video model. 30-80 words, visual/cinematic.'),
    speechText: z.string().describe('One narrator line in the target language. 8-25 words.'),
    sfxPrompt: z.string().describe('Short background sound effect description, e.g. "soft rain with distant thunder".')
  })).min(3).max(5)
});

export interface GeneratedScene {
  sceneNumber: number;
  videoPrompt: string;
  speechText: string;
  sfxPrompt: string;
}

export async function generateScenePrompts(
  content: string,
  targetLang: SupportedLang
): Promise<GeneratedScene[]> {
  if (!content || !content.trim()) return [];
  const { object } = await withRetry(() => generateObject({
    model: getAIModel(),
    schema: SceneSchema,
    prompt:
      'Based on this content, generate 3-5 video scenes. Each scene has: ' +
      'videoPrompt (for AI video gen, English, cinematic), ' +
      'speechText (narrator line in ' + LANG_NAMES[targetLang] + '), ' +
      'sfxPrompt (background sound effect). ' +
      'Return JSON array of scenes.\n\n' +
      content
  }));
  return object.scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    videoPrompt: s.videoPrompt,
    speechText: s.speechText,
    sfxPrompt: s.sfxPrompt
  }));
}
