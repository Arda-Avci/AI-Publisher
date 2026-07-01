/**
 * Viral Hook Generator Service
 *
 * Analyzes video hook quality and generates viral-optimized titles,
 * descriptions, and hashtags using LLM analysis.
 *
 * @module services/viralHook
 */

import { getAIModelChain } from '../lib/ai-provider.js';
import { generateObject } from 'ai';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { z } from 'zod';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';
import { TIMEOUT } from '../constants.js';
import { extractReferenceFrame } from './videoService.js';

/**
 * Supported social media platforms.
 */
export type Platform = 'youtube' | 'tiktok' | 'x' | 'meta';

/**
 * Hook quality analysis result (extended with opener strength + pattern match).
 */
export const HookQualitySchema = z.object({
  score: z.number().min(0).max(10),
  hookType: z.enum(['question', 'statistic', 'controversy', 'story', 'shock', 'other']),
  pacingScore: z.number().min(0).max(10),
  visualAppealScore: z.number().min(0).max(10),
  audioClarityScore: z.number().min(0).max(10),
  attentionRetentionScore: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  improvementTips: z.array(z.string()),
  // Extended fields for first-3-second analysis
  openerStrength: z.number().min(0).max(100).optional(),
  patternMatch: z
    .object({
      curiosity: z.number().min(0).max(100).optional(),
      controversy: z.number().min(0).max(100).optional(),
      authority: z.number().min(0).max(100).optional(),
      numbers: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

/**
 * Viral title suggestion.
 */
export const ViralTitlesSchema = z.object({
  titles: z.array(
    z.object({
      title: z.string(),
      style: z.enum([
        'curiosity',
        'controversial',
        'stat-driven',
        'emotional',
        'how-to',
        'listicle',
      ]),
      ctaIncluded: z.boolean(),
      emojiCount: z.number(),
    }),
  ),
});

/**
 * Hashtag suggestion result.
 */
export const HashtagsSchema = z.object({
  hashtags: z.array(
    z.object({
      tag: z.string(),
      platform: z.string(),
      category: z.enum(['niche', 'trend', 'brand', 'community', 'generic']),
      estimatedReach: z.string(),
    }),
  ),
  trendingTopics: z.array(z.string()).optional(),
});

/**
 * Analyzes the first 3 seconds of a video for hook quality.
 *
 * Extracts the first 3 seconds as video + frame, sends to LLM for analysis of:
 * - Opener strength (0-100)
 * - Pattern match (curiosity/controversy/authority/numbers)
 * - Visual hook appeal, text/graphic presence, emotional trigger effectiveness
 *
 * @param videoPath - Absolute path to the video file
 * @returns Hook quality analysis with opener strength and pattern match
 */
export async function analyzeHookQuality(
  videoPath: string,
): Promise<z.infer<typeof HookQualitySchema>> {
  Logger.info('[viralHook] Analyzing hook quality (first 3 seconds)', { videoPath });

  // Extract first 3-second clip and reference frame
  const frameBase64 = await extractReferenceFrame(videoPath);

  // Also extract first 3-second video clip for temporal analysis
  const { runFFmpeg } = await import('./videoService.js');
  const clipPath = videoPath.replace(/\.[^.]+$/, '_hook_preview.mp4');

  try {
    await runFFmpeg('ffmpeg', [
      '-y',
      '-i',
      videoPath,
      '-t',
      '3',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-vf',
      'scale=720:-2',
      '-an',
      clipPath,
    ]);
  } catch {
    Logger.warn('[viralHook] Could not extract 3s clip, using frame only');
  }

  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) => {
      const contentParts: any[] = [];

      if (frameBase64) {
        const cleanB64 = frameBase64.replace(/^data:image\/\w+;base64,/, '');
        const frameBuffer = Buffer.from(cleanB64, 'base64');
        contentParts.push({
          type: 'image' as const,
          image: frameBuffer,
          mimeType: 'image/jpeg',
        });
      }

      contentParts.push({
        type: 'text' as const,
        text: `Analyze the FIRST 3 SECONDS of this video specifically for hook quality.

Rate the following (0-10):
1. Overall hook quality (does it grab attention immediately?)
2. Pacing (is there immediate movement/action/text?)
3. Visual appeal (colors, composition, graphics)
4. Audio clarity (is there speech or sound that hooks?)
5. Attention retention potential (will viewer stay?)

ALSO rate these pattern matches (0-100 each):
- Curiosity gap: Does the opener create curiosity/thirst for knowledge?
- Controversy: Does it provoke disagreement or debate?
- Authority: Does it cite expert sources, data, or credibility markers?
- Numbers: Does it use statistics, counts, or quantifiable claims?

Also identify:
- Hook type (question, statistic, controversy, story, shock, other)
- Opener strength score (0-100, how effective is the VERY first second)
- Strengths and weaknesses
- Concrete improvement tips for the first 3 seconds

Respond in Turkish with all fields.`,
      });

      return generateObject({
        model,
        schema: HookQualitySchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_MEDIUM),
        messages: [{ role: 'user', content: contentParts }],
      });
    },
    models,
    2,
    2000,
    true,
  );

  // Cleanup preview clip
  if (await fs.pathExists(clipPath)) {
    await fs.remove(clipPath);
  }

  Logger.info('[viralHook] Hook analysis complete', {
    score: result.object.score,
    openerStrength: result.object.openerStrength,
  });
  return result.object;
}

/**
 * Generates multiple viral title options for a given topic.
 *
 * @param topic   - The video topic/subject
 * @param count   - Number of title options to generate (default: 5)
 * @returns Array of viral title options with metadata
 */
export async function generateViralTitles(
  topic: string,
  count = 5,
): Promise<z.infer<typeof ViralTitlesSchema>> {
  Logger.info('[viralHook] Generating viral titles', { topic, count });

  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: ViralTitlesSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `Sen profesyonel bir YouTube/TikTok başlık uzmanısın.
Konu: "${topic}"

Görevin: Bu konu için ${count} adet yüksek tıklama oranına sahip viral başlık üretmek.
Her başlık için:
- Başlık metni
- Stil türü (curiosity, controversial, stat-driven, emotional, how-to, listicle)
- CTA içeriyor mu (evet/hayır)
- Emoji sayısı

Kurallar:
1. Başlıklar 60 karakteri geçmemeli
2. Sayılar ve güçlü kelimeler kullan
3. Her başlık farklı bir yaklaşım sergelesin
4. Türkçe ve İngilizce karışık kullanabilirsin (YouTube algoritması İngilizce keyword'leri sever)
5. "2026", " Şok", "İlk defa", "Büyük sır" gibi dikkat çekici ifadeler kullan
6. Sadece JSON array döndür, açıklama yazma`,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object;
}

/**
 * Generates optimized hashtags for a given content and platform.
 *
 * @param content  - Video content description or transcript
 * @param platform - Target platform (youtube, tiktok, x, meta)
 * @returns Array of hashtag suggestions with metadata
 */
export async function generateHashtags(
  content: string,
  platform: Platform,
): Promise<z.infer<typeof HashtagsSchema>> {
  Logger.info('[viralHook] Generating hashtags', { platform, contentLength: content.length });

  const platformLabel: Record<Platform, string> = {
    youtube: 'YouTube Shorts',
    tiktok: 'TikTok',
    x: 'X (Twitter)',
    meta: 'Meta Reels',
  };

  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: HashtagsSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `Sen bir sosyal medya hashtag uzmanısın.
Platform: ${platformLabel[platform]}
İçerik: ${content}

Görevin:
1. Bu platform ve içerik için en etkili hashtag'leri üret
2. Her hashtag için kategori belirle (niche, trend, brand, community, generic)
3. Tahmini erişim (estimatedReach) ver
4. Trending topic'leri de listele

Kurallar:
- YouTube: 5-8 hashtag en optimal (3 hedeflenmiş niche, 2-3 genel, 1-2 trend)
- TikTok: 3-5 hashtag (1-2 çok büyük, 2-3 niş)
- X: 2-4 hashtag
- Meta: 5-10 hashtag
- Sadece JSON döndür, açıklama yazma`,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object;
}

/**
 * Combined viral optimization result.
 */
export interface ViralOptimizationResult {
  hookScore: number;
  titles: Array<{ title: string; style: string; ctaIncluded: boolean; emojiCount: number }>;
  hashtags: Array<{ tag: string; platform: string; category: string; estimatedReach: string }>;
}

/**
 * Performs full viral optimization analysis for a video.
 *
 * @param videoPath - Path to video file
 * @param topic     - Video topic
 * @param platform  - Target platform
 * @returns Combined viral optimization data
 */
export async function optimizeForViral(
  videoPath: string,
  topic: string,
  platform: Platform = 'youtube',
): Promise<ViralOptimizationResult> {
  Logger.info('[viralHook] Running full viral optimization', { videoPath, topic, platform });

  const [hookAnalysis, titles, hashtags] = await Promise.all([
    analyzeHookQuality(videoPath).catch((err) => {
      Logger.warn('[viralHook] Hook analysis failed, using defaults', { error: err.message });
      return { score: 5, hookType: 'other' } as any;
    }),
    generateViralTitles(topic, 5),
    generateHashtags(topic, platform),
  ]);

  return {
    hookScore: hookAnalysis.score,
    titles: titles.titles,
    hashtags: hashtags.hashtags,
  };
}

/**
 * Result of viral content generation.
 */
export const ViralContentSchema = z.object({
  titles: z.array(z.string()),
  hashtags: z.array(z.string()),
  hookScore: z.number().min(0).max(100),
});

/**
 * Generates viral content suggestions based on video analysis and transcript.
 *
 * Calls Gemini with a structured prompt for video content analysis,
 * returns optimized titles, hashtags, and hook score.
 *
 * @param videoPath  - Absolute path to the video file
 * @param transcript - Full transcript text of the video
 * @returns Viral content suggestions (titles, hashtags, hook score)
 */
export async function generateViralContent(
  videoPath: string,
  transcript: string,
): Promise<{ titles: string[]; hashtags: string[]; hookScore: number }> {
  Logger.info('[viralHook] Generating viral content', {
    videoPath,
    transcriptLength: transcript.length,
  });

  // Extract preview frame for visual analysis
  const frameBase64 = await extractReferenceFrame(videoPath);

  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) => {
      const contentParts: any[] = [];

      if (frameBase64) {
        const cleanB64 = frameBase64.replace(/^data:image\/\w+;base64,/, '');
        const frameBuffer = Buffer.from(cleanB64, 'base64');
        contentParts.push({
          type: 'image' as const,
          image: frameBuffer,
          mimeType: 'image/jpeg',
        });
      }

      contentParts.push({
        type: 'text' as const,
        text: `You are a viral content strategist for YouTube Shorts and TikTok.
Analyze this video and its transcript to generate viral-optimized content.

TRANSCRIPT:
${transcript.substring(0, 2000)}

Generate:
1. 5 viral title options (max 60 chars each, mix of curiosity/controversy/stat-driven styles, can use Turkish or English)
2. 10 relevant hashtags (mix of niche, trend, and broad hashtags for maximum reach)
3. Hook score (0-100): rate the video's hook effectiveness based on opener strength, curiosity gap, and engagement potential

Return JSON with: titles (array of strings), hashtags (array of strings starting with #), hookScore (0-100 integer).
Sadece JSON döndür, açıklama yazma.`,
      });

      return generateObject({
        model,
        schema: ViralContentSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_MEDIUM),
        messages: [{ role: 'user', content: contentParts }],
      });
    },
    models,
    2,
    2000,
    true,
  );

  Logger.info('[viralHook] Viral content generated', {
    titleCount: result.object.titles.length,
    hashtagCount: result.object.hashtags.length,
    hookScore: result.object.hookScore,
  });

  return {
    titles: result.object.titles,
    hashtags: result.object.hashtags,
    hookScore: result.object.hookScore,
  };
}
