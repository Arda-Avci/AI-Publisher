// src/lib/translation.ts
// Gemini-powered helpers for the Video Differentiation pipeline.
//
// All three functions (cleanText, translateText, generateScenePrompts) use
// the project's existing @ai-sdk/google model. Structured scene output uses
// `generateObject` with a Zod schema, matching the pattern in queue.ts.

import { google } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

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
  const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    prompt:
      'Fix grammar, punctuation, remove filler words, improve flow. Keep meaning intact. ' +
      'Return ONLY the cleaned text. No preamble, no quotes, no language tag.\n\n' +
      raw
  });
  return text.trim();
}

// ── 2. Translate to the target language ───────────────────────────────────
export async function translateText(text: string, targetLang: SupportedLang): Promise<string> {
  if (!text || !text.trim()) return '';
  if (!isSupportedLang(targetLang)) {
    throw new Error('translateText: unsupported target language: ' + targetLang);
  }
  const { text: out } = await generateText({
    model: google('gemini-2.5-flash'),
    prompt:
      'Translate this text to ' + LANG_NAMES[targetLang] + ' (' + targetLang + '). ' +
      'Keep technical terms in original language. Maintain tone and style. ' +
      'Return ONLY the translated text.\n\n' +
      text
  });
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
  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: SceneSchema,
    prompt:
      'Based on this content, generate 3-5 video scenes. Each scene has: ' +
      'videoPrompt (for AI video gen, English, cinematic), ' +
      'speechText (narrator line in ' + LANG_NAMES[targetLang] + '), ' +
      'sfxPrompt (background sound effect). ' +
      'Return JSON array of scenes.\n\n' +
      content
  });
  return object.scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    videoPrompt: s.videoPrompt,
    speechText: s.speechText,
    sfxPrompt: s.sfxPrompt
  }));
}
