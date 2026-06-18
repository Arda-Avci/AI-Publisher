/**
 * Viral Hook Generator Service
 *
 * Analyzes video hook quality and generates viral-optimized titles,
 * descriptions, and hashtags using LLM analysis.
 *
 * @module services/viralHook
 */
import { z } from 'zod';
/**
 * Supported social media platforms.
 */
export type Platform = 'youtube' | 'tiktok' | 'x' | 'meta';
/**
 * Hook quality analysis result (extended with opener strength + pattern match).
 */
export declare const HookQualitySchema: z.ZodObject<{
    score: z.ZodNumber;
    hookType: z.ZodEnum<{
        other: "other";
        question: "question";
        statistic: "statistic";
        controversy: "controversy";
        story: "story";
        shock: "shock";
    }>;
    pacingScore: z.ZodNumber;
    visualAppealScore: z.ZodNumber;
    audioClarityScore: z.ZodNumber;
    attentionRetentionScore: z.ZodNumber;
    strengths: z.ZodArray<z.ZodString>;
    weaknesses: z.ZodArray<z.ZodString>;
    improvementTips: z.ZodArray<z.ZodString>;
    openerStrength: z.ZodOptional<z.ZodNumber>;
    patternMatch: z.ZodOptional<z.ZodObject<{
        curiosity: z.ZodOptional<z.ZodNumber>;
        controversy: z.ZodOptional<z.ZodNumber>;
        authority: z.ZodOptional<z.ZodNumber>;
        numbers: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Viral title suggestion.
 */
export declare const ViralTitlesSchema: z.ZodObject<{
    titles: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        style: z.ZodEnum<{
            curiosity: "curiosity";
            controversial: "controversial";
            "stat-driven": "stat-driven";
            emotional: "emotional";
            "how-to": "how-to";
            listicle: "listicle";
        }>;
        ctaIncluded: z.ZodBoolean;
        emojiCount: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Hashtag suggestion result.
 */
export declare const HashtagsSchema: z.ZodObject<{
    hashtags: z.ZodArray<z.ZodObject<{
        tag: z.ZodString;
        platform: z.ZodString;
        category: z.ZodEnum<{
            niche: "niche";
            trend: "trend";
            brand: "brand";
            community: "community";
            generic: "generic";
        }>;
        estimatedReach: z.ZodString;
    }, z.core.$strip>>;
    trendingTopics: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
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
export declare function analyzeHookQuality(videoPath: string): Promise<z.infer<typeof HookQualitySchema>>;
/**
 * Generates multiple viral title options for a given topic.
 *
 * @param topic   - The video topic/subject
 * @param count   - Number of title options to generate (default: 5)
 * @returns Array of viral title options with metadata
 */
export declare function generateViralTitles(topic: string, count?: number): Promise<z.infer<typeof ViralTitlesSchema>>;
/**
 * Generates optimized hashtags for a given content and platform.
 *
 * @param content  - Video content description or transcript
 * @param platform - Target platform (youtube, tiktok, x, meta)
 * @returns Array of hashtag suggestions with metadata
 */
export declare function generateHashtags(content: string, platform: Platform): Promise<z.infer<typeof HashtagsSchema>>;
/**
 * Combined viral optimization result.
 */
export interface ViralOptimizationResult {
    hookScore: number;
    titles: Array<{
        title: string;
        style: string;
        ctaIncluded: boolean;
        emojiCount: number;
    }>;
    hashtags: Array<{
        tag: string;
        platform: string;
        category: string;
        estimatedReach: string;
    }>;
}
/**
 * Performs full viral optimization analysis for a video.
 *
 * @param videoPath - Path to video file
 * @param topic     - Video topic
 * @param platform  - Target platform
 * @returns Combined viral optimization data
 */
export declare function optimizeForViral(videoPath: string, topic: string, platform?: Platform): Promise<ViralOptimizationResult>;
/**
 * Result of viral content generation.
 */
export declare const ViralContentSchema: z.ZodObject<{
    titles: z.ZodArray<z.ZodString>;
    hashtags: z.ZodArray<z.ZodString>;
    hookScore: z.ZodNumber;
}, z.core.$strip>;
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
export declare function generateViralContent(videoPath: string, transcript: string): Promise<{
    titles: string[];
    hashtags: string[];
    hookScore: number;
}>;
//# sourceMappingURL=viralHook.d.ts.map