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
import { Logger } from '../lib/logger.js';
import { extractReferenceFrame } from './videoService.js';

/**
 * Supported social media platforms.
 */
export type Platform = 'youtube' | 'tiktok' | 'x' | 'meta';

/**
 * Hook quality analysis result.
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
  improvementTips: z.array(z.string())
});

/**
 * Viral title suggestion.
 */
export const ViralTitlesSchema = z.object({
  titles: z.array(z.object({
    title: z.string(),
    style: z.enum(['curiosity', 'controversial', 'stat-driven', 'emotional', 'how-to', 'listicle']),
    ctaIncluded: z.boolean(),
    emojiCount: z.number()
  }))
});

/**
 * Hashtag suggestion result.
 */
export const HashtagsSchema = z.object({
  hashtags: z.array(z.object({
    tag: z.string(),
    platform: z.string(),
    category: z.enum(['niche', 'trend', 'brand', 'community', 'generic']),
    estimatedReach: z.string()
  })),
  trendingTopics: z.array(z.string()).optional()
});

/**
 * Analyzes the first 3 seconds of a video for hook quality.
 *
 * Extracts a reference frame and sends it to LLM for analysis of:
 * - Visual hook appeal
 * - Text/graphic presence
 * - Emotional trigger effectiveness
 *
 * @param videoPath - Absolute path to the video file
 * @returns Hook quality analysis
 */
export async function analyzeHookQuality(videoPath: string): Promise<z.infer<typeof HookQualitySchema>> {
  Logger.info('[viralHook] Analyzing hook quality', { videoPath });

  // Extract first 3-second frame for visual analysis
  const frameBase64 = await extractReferenceFrame(videoPath);

  const models = getAIModelChain();

  const result = await withFallbackAndRetry((model) => {
    const contentParts: any[] = [];

    if (frameBase64) {
      const cleanB64 = frameBase64.replace(/^data:image\/\w+;base64,/, '');
      const frameBuffer = Buffer.from(cleanB64, 'base64');
      contentParts.push({
        type: 'image' as const,
        image: frameBuffer,
        mimeType: 'image/jpeg'
      });
    }

    contentParts.push({
      type: 'text' as const,
      text: `Analyze the first 3 seconds of this video for hook quality.
Rate the following (0-10):
1. Overall hook quality (does it grab attention immediately?)
2. Pacing (is there immediate movement/action/text?)
3. Visual appeal (colors, composition, graphics)
4. Audio clarity (is there speech or sound that hooks?)
5. Attention retention potential (will viewer stay?)

Also identify:
- Hook type (question, statistic, controversy, story, shock, other)
- Strengths and weaknesses
- Concrete improvement tips

Respond in Turkish.`
    });

    return generateObject({
      model,
      schema: HookQualitySchema,
      abortSignal: AbortSignal.timeout(45000),
      messages: [{ role: 'user', content: contentParts }]
    });
  }, models, 2, 2000, true);

  Logger.info('[viralHook] Hook analysis complete', { score: result.object.score });
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
  count = 5
): Promise<z.infer<typeof ViralTitlesSchema>> {
  Logger.info('[viralHook] Generating viral titles', { topic, count });

  const models = getAIModelChain();

  const result = await withFallbackAndRetry((model) => {
    return generateObject({
      model,
      schema: ViralTitlesSchema,
      abortSignal: AbortSignal.timeout(30000),
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
6. Sadece JSON array döndür, açıklama yazma`
    });
  }, models, 2, 2000, true);

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
  platform: Platform
): Promise<z.infer<typeof HashtagsSchema>> {
  Logger.info('[viralHook] Generating hashtags', { platform, contentLength: content.length });

  const platformLabel: Record<Platform, string> = {
    youtube: 'YouTube Shorts',
    tiktok: 'TikTok',
    x: 'X (Twitter)',
    meta: 'Meta Reels'
  };

  const models = getAIModelChain();

  const result = await withFallbackAndRetry((model) => {
    return generateObject({
      model,
      schema: HashtagsSchema,
      abortSignal: AbortSignal.timeout(30000),
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
- Sadece JSON döndür, açıklama yazma`
    });
  }, models, 2, 2000, true);

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
  platform: Platform = 'youtube'
): Promise<ViralOptimizationResult> {
  Logger.info('[viralHook] Running full viral optimization', { videoPath, topic, platform });

  const [hookAnalysis, titles, hashtags] = await Promise.all([
    analyzeHookQuality(videoPath).catch(err => {
      Logger.warn('[viralHook] Hook analysis failed, using defaults', { error: err.message });
      return { score: 5, hookType: 'other' } as any;
    }),
    generateViralTitles(topic, 5),
    generateHashtags(topic, platform)
  ]);

  return {
    hookScore: hookAnalysis.score,
    titles: titles.titles,
    hashtags: hashtags.hashtags
  };
}