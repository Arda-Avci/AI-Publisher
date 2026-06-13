/**
 * Viral Analyzer Service
 * Analyzes long-form videos to find viral-worthy short segments
 * Uses Whisper for transcription and Gemini for semantic analysis
 */

import { ClipSegment, ViralAnalysisResult, TranscriptionResult } from './types.js';
import { Logger } from '../../lib/logger.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { generateText } from 'ai';
import { getAIModelChain } from '../../lib/ai-provider.js';

const VIRAL_KEYWORDS = [
  'amazing', 'incredible', 'unbelievable', 'wow', 'omg', 'shocking',
  'breaking', 'exclusive', 'first', 'revealed', 'secret', 'mistake',
  'funny', 'hilarious', 'lol', 'omg', 'crazy', 'insane',
  'best', 'worst', 'top', 'ranking', 'fail', 'win', 'success',
  'tip', 'hack', 'trick', 'secret', 'mistake', 'warning',
  'must see', 'must watch', 'viral', 'trending', 'popular',
];

const ENGAGEMENT_PATTERNS = [
  { pattern: /\?$/, weight: 1.3, reason: 'Question ending increases curiosity' },
  { pattern: /!{2,}/, weight: 1.4, reason: 'Multiple exclamations indicate excitement' },
  { pattern: /^\d+/, weight: 1.2, reason: 'Numbers at start grab attention' },
  { pattern: /(first|finally|now|just|instant)/i, weight: 1.3, reason: 'Urgency words' },
];

export class ViralAnalyzer {
  /**
   * Analyze video transcription and find viral-worthy segments
   */
  async analyze(
    transcription: TranscriptionResult,
    options: {
      minDuration?: number;
      maxDuration?: number;
      targetCount?: number;
    } = {}
  ): Promise<ViralAnalysisResult> {
    const { minDuration = 30, maxDuration = 90, targetCount = 5 } = options;

    Logger.info(`[ViralAnalyzer] Analyzing ${transcription.segments.length} transcript segments`);

    // Score each segment for viral potential
    const scoredSegments = await this.scoreSegments(transcription.segments, minDuration, maxDuration);

    // Sort by score and take top segments
    scoredSegments.sort((a, b) => b.score - a.score);
    const topSegments = scoredSegments.slice(0, targetCount);

    // Ensure no overlapping segments
    const nonOverlapping = this.removeOverlaps(topSegments);

    // Generate captions and hashtags for each segment
    for (const segment of nonOverlapping) {
      const analysis = await this.generateSegmentMeta(segment, transcription);
      segment.suggestedCaption = analysis.caption;
      segment.suggestedHashtags = analysis.hashtags;
      segment.highlights = analysis.highlights;
    }

    const overallScore = nonOverlapping.length > 0
      ? Math.round(nonOverlapping.reduce((sum, s) => sum + s.score, 0) / nonOverlapping.length)
      : 0;

    return {
      segments: nonOverlapping,
      overallScore,
      topReason: nonOverlapping[0]?.reason || 'No viral segments found',
      transcriptSegments: transcription.segments.length,
    };
  }

  /**
   * Score individual transcript segments for viral potential
   */
  private async scoreSegments(
    segments: TranscriptionResult['segments'],
    minDuration: number,
    maxDuration: number
  ): Promise<ClipSegment[]> {
    const clipSegments: ClipSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const duration = segment.end - segment.start;

      // Skip segments outside duration range
      if (duration < minDuration || duration > maxDuration) continue;

      let score = 50; // Base score
      const reasons: string[] = [];
      const highlights: string[] = [];

      const text = segment.text.toLowerCase();
      const words = text.split(/\s+/);

      // Check for viral keywords
      for (const keyword of VIRAL_KEYWORDS) {
        if (text.includes(keyword)) {
          score += 15;
          highlights.push(`Contains viral keyword: "${keyword}"`);
        }
      }

      // Check engagement patterns
      for (const { pattern, weight, reason } of ENGAGEMENT_PATTERNS) {
        if (pattern.test(segment.text)) {
          score *= weight;
          reasons.push(reason);
        }
      }

      // Bonus for shorter, punchy segments (retention optimized)
      if (duration <= 45) {
        score += 10;
        reasons.push('Short format optimal (≤45s)');
      }

      // Bonus for question-based curiosity
      if (segment.text.includes('?')) {
        score += 8;
        reasons.push('Question format drives comments');
      }

      // Penalize very long segments slightly
      if (duration > 60) {
        score -= 5;
      }

      // Cap score at 100
      score = Math.min(100, Math.round(score));

      clipSegments.push({
        id: `seg-${i}-${Date.now()}`,
        startTime: segment.start,
        endTime: segment.end,
        duration,
        score,
        reason: reasons.length > 0 ? reasons.join(', ') : 'General engagement potential',
        highlights,
      });
    }

    return clipSegments;
  }

  /**
   * Remove overlapping segments, keeping higher-scoring ones
   */
  private removeOverlaps(segments: ClipSegment[]): ClipSegment[] {
    const result: ClipSegment[] = [];

    for (const segment of segments) {
      const overlaps = result.some(
        existing =>
          (segment.startTime >= existing.startTime && segment.startTime < existing.endTime) ||
          (segment.endTime > existing.startTime && segment.endTime <= existing.endTime)
      );

      if (!overlaps) {
        result.push(segment);
      }
    }

    return result;
  }

  /**
   * Generate caption, hashtags, and highlights for a segment using AI
   */
  private async generateSegmentMeta(
    segment: ClipSegment,
    transcription: TranscriptionResult
  ): Promise<{ caption: string; hashtags: string[]; highlights: string[] }> {
    try {
      // Find the transcript text for this segment
      const transcriptText = transcription.segments
        .filter(s => s.start >= segment.startTime && s.end <= segment.endTime)
        .map(s => s.text)
        .join(' ');

      const prompt = `Analyze this video segment (${segment.startTime}s - ${segment.endTime}s) and generate:
1. A catchy caption (max 150 chars)
2. 5 relevant hashtags
3. 3 key highlights

Transcript excerpt: "${transcriptText.substring(0, 500)}"

Respond in JSON format:
{
  "caption": "...",
  "hashtags": ["#tag1", "#tag2", ...],
  "highlights": ["highlight1", "highlight2", "highlight3"]
}`;

      const response = await withFallbackAndRetry(
        (model: any) =>
          generateText({
            model,
            prompt,
            system: 'You are a viral content expert. Generate engaging captions and hashtags.',
            maxTokens: 300,
          } as any),
        getAIModelChain()
      );

      // Parse JSON response
      try {
        const jsonMatch = response.text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            caption: parsed.caption || '',
            hashtags: parsed.hashtags || [],
            highlights: parsed.highlights || [],
          };
        }
      } catch {
        Logger.warn('[ViralAnalyzer] Failed to parse AI response');
      }
    } catch (error) {
      Logger.error('[ViralAnalyzer] AI generation failed:', error);
    }

    // Fallback values
    return {
      caption: `Check out this amazing moment!`,
      hashtags: ['#viral', '#fyp', '#trending', '#mustsee', '#wow'],
      highlights: ['Viral moment', 'Must watch', 'Amazing content'],
    };
  }
}

export const viralAnalyzer = new ViralAnalyzer();