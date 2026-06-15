// src/lib/translation.ts
// AI-powered helpers for the Video Differentiation pipeline.
//
// All three functions (cleanText, translateText, generateScenePrompts) use
// the project's dynamic AI model fallback chain. Structured scene output uses
// `generateObject` with a Zod schema, matching the pattern in queue.ts.

import { getAIModelChain } from './ai-provider.js';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { withFallbackAndRetry } from './ai-utils.js';
import { Logger } from './logger.js';

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
  const { text } = await withFallbackAndRetry((model) => generateText({
    model,
    maxTokens: 1500,
    abortSignal: AbortSignal.timeout(45000), // 45 saniye zaman aşımı
    prompt:
      'Görevin: Bir YouTube videosunun ham transkriptini temizlemek ve kusursuzlaştırmaktır. ' +
      'Yazım hatalarını düzelt, dolgu kelimelerini at. Fikrin özüne ve iskeletine %100 sadık kal. ' +
      'Ancak AI tespiti (AI detection) yazılımlarına yakalanmamak için: kelimelerin yerlerini hafifçe değiştir, ' +
      'eş anlamlılar kullan ve cümle yapılarını anlamı bozmadan yeniden kurgula (Eşsizleştirme). ' +
      'Dili daha doğal bir hale getir. ' +
      'Return ONLY the cleaned text. No preamble, no quotes.\n\n' +
      raw
  } as any), getAIModelChain());
  return text.trim();
}

// ── 2. Translate to the target language ───────────────────────────────────
export async function translateText(text: string, targetLang: SupportedLang): Promise<string> {
  if (!text || !text.trim()) return '';
  if (!isSupportedLang(targetLang)) {
    throw new Error('translateText: unsupported target language: ' + targetLang);
  }

  // Metin uzunsa (2000 karakterden fazla), parçalara bölerek çeviriyoruz.
  const MAX_CHUNK_SIZE = 2000;
  if (text.length > MAX_CHUNK_SIZE) {
    Logger.info(`[AI] Text too long (${text.length} chars). Splitting for translation...`);
    const chunks = splitTextIntoChunks(text, MAX_CHUNK_SIZE);
    const translatedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      Logger.info(`[AI] Translating chunk ${i + 1}/${chunks.length}...`);
      const translated = await translateText(chunks[i], targetLang);
      translatedChunks.push(translated);
    }
    return translatedChunks.join(' ');
  }

  const { text: out } = await withFallbackAndRetry((model) => generateText({
    model,
    maxTokens: 1500,
    abortSignal: AbortSignal.timeout(45000), // 45 saniye zaman aşımı
    prompt:
      'Translate the following text to ' + LANG_NAMES[targetLang] + ' (' + targetLang + '). ' +
      'ÖNEMLİ KURAL: Orijinal metin akademik, resmi veya soğuk olsa bile, sen bunu her zaman ' +
      '"samimi, arkadaş canlısı bir hikaye anlatımı (storytelling)" formuna dönüştürerek çevirmelisin. ' +
      'İzleyicinin ekranda kalmasını sağlayacak bir duygu kat. ' +
      'Hedef dilin kültürel kullanım alışkanlıklarına göre lokalize et (Yerelleştir). ' +
      'Return ONLY the translated text without any explanations.\n\n' +
      text
  } as any), getAIModelChain());
  return out.trim();
}

// ── 2b. Translate original title and description ──────────────────────────
export async function translateTitleAndDesc(
  title: string,
  desc: string,
  targetLang: SupportedLang
): Promise<{ title: string; desc: string }> {
  if (!title && !desc) return { title: '', desc: '' };

  const prompt =
    `Görevin: Aşağıdaki YouTube videosu başlığını ve açıklamasını ${LANG_NAMES[targetLang]} (${targetLang}) diline çevirmektir.\n` +
    `Başlık: ${title}\n` +
    `Açıklama: ${desc}\n\n` +
    `Lütfen sadece şu JSON formatında yanıt dön:\n` +
    `{\n` +
    `  "title": "çevrilmiş başlık",\n` +
    `  "desc": "çevrilmiş açıklama"\n` +
    `}`;

  try {
    const { object } = await withFallbackAndRetry((model) => generateObject({
      model,
      maxTokens: 500,
      schema: z.object({
        title: z.string(),
        desc: z.string()
      }),
      abortSignal: AbortSignal.timeout(30000), // 30 saniye zaman aşımı
      prompt
    } as any), getAIModelChain()) as any;
    return object;
  } catch (err) {
    Logger.warn('translateTitleAndDesc failed, falling back to sequential translateText', err);
    const tTitle = await translateText(title, targetLang);
    const tDesc = await translateText(desc, targetLang);
    return { title: tTitle, desc: tDesc };
  }
}

// ── 2c. Rewrite and Differentiate translated transcript ───────────────────
export async function rewriteTranscript(
  translatedTranscript: string,
  targetLang: SupportedLang
): Promise<string> {
  if (!translatedTranscript || !translatedTranscript.trim()) return '';

  // Metin uzunsa (2000 karakterden fazla), parçalara bölerek özgünleştiriyoruz.
  const MAX_CHUNK_SIZE = 2000;
  if (translatedTranscript.length > MAX_CHUNK_SIZE) {
    Logger.info(`[AI] Text too long (${translatedTranscript.length} chars). Splitting for rewrite...`);
    const chunks = splitTextIntoChunks(translatedTranscript, MAX_CHUNK_SIZE);
    const rewrittenChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      Logger.info(`[AI] Rewriting chunk ${i + 1}/${chunks.length}...`);
      const rewritten = await rewriteTranscript(chunks[i], targetLang);
      rewrittenChunks.push(rewritten);
    }
    return rewrittenChunks.join(' ');
  }

  const prompt =
    `Görevin: Aşağıdaki ${LANG_NAMES[targetLang]} dilindeki video transkriptini alıp, ` +
    `sosyal medyada (YouTube Shorts, TikTok, Reels vb.) paylaşılmaya uygun, ilgi çekici, ` +
    `özgün ve akıcı yeni bir video anlatım metni (script) olarak yeniden yazmaktır.\n` +
    `Kurallar:\n` +
    `1. AI tespit araçlarına (AI detection) yakalanmamak için cümle yapılarını ve kelimeleri tamamen özgünleştir.\n` +
    `2. Giriş kısmını son derece kanca (hook) etkisi yaratacak şekilde kurgula, izleyicinin hemen ilgisini çeksin.\n` +
    `3. Dili son derece samimi, akıcı ve heyecan verici yap.\n` +
    `4. Orijinal bilginin doğruluğuna sadık kal fakat anlatımı tamamen özgünleştir.\n` +
    `Yalnızca yeni oluşturulan video metnini dön. Açıklama, tırnak işareti veya ek bilgi ekleme.\n\n` +
    `Metin:\n${translatedTranscript}`;

  const { text } = await withFallbackAndRetry((model) => generateText({
    model,
    maxTokens: 1500,
    abortSignal: AbortSignal.timeout(45000), // 45 saniye zaman aşımı
    prompt
  } as any), getAIModelChain());
  return text.trim();
}

// ── Yardımcı Fonksiyon: Metni mantıklı cümle sınırlarından parçalara ayırma ──
function splitTextIntoChunks(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLen) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Eğer tek bir cümle bile maxLen'den uzunsa veya bölme başarısızsa kaba kesim yap
  if (chunks.length === 0 || (chunks.length === 1 && chunks[0].length > maxLen * 1.5)) {
    const rawChunks: string[] = [];
    let idx = 0;
    while (idx < text.length) {
      rawChunks.push(text.substring(idx, idx + maxLen));
      idx += maxLen;
    }
    return rawChunks;
  }

  return chunks;
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
  const { object } = await withFallbackAndRetry((model) => generateObject({
    model,
    maxTokens: 2000,
    schema: SceneSchema,
    abortSignal: AbortSignal.timeout(60000), // Sahneler için 60 saniye zaman aşımı
    prompt:
      'Based on this content, generate 3-5 video scenes. Each scene has: ' +
      'videoPrompt (for AI video gen, English, cinematic), ' +
      'speechText (narrator line in ' + LANG_NAMES[targetLang] + '), ' +
      'sfxPrompt (background sound effect). ' +
      'Return JSON array of scenes.\n\n' +
      content
  } as any), getAIModelChain()) as any;
  return object.scenes.map((s: any) => ({
    sceneNumber: s.sceneNumber,
    videoPrompt: s.videoPrompt,
    speechText: s.speechText,
    sfxPrompt: s.sfxPrompt
  }));
}
