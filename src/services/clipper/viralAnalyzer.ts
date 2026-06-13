import { ClipSegment, ViralAnalysisResult, TranscriptionResult } from './types.js';
import { Logger } from '../../lib/logger.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { generateText } from 'ai';
import { getAIModelChain } from '../../lib/ai-provider.js';

export class ViralAnalyzer {
  async analyze(
    transcription: TranscriptionResult,
    options: {
      minDuration?: number;
      maxDuration?: number;
      targetCount?: number;
      title?: string;
    } = {}
  ): Promise<ViralAnalysisResult> {
    const { minDuration = 30, maxDuration = 90, targetCount = 5, title = '' } = options;

    Logger.info(`[ViralAnalyzer-v2] LLM scoring ${transcription.segments.length} segments`);

    const scoredSegments = await this.llmScoreSegments(transcription, minDuration, maxDuration, targetCount, title);

    scoredSegments.sort((a, b) => b.score - a.score);
    const topSegments = scoredSegments.slice(0, targetCount);
    const nonOverlapping = this.removeOverlaps(topSegments);

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

  private async llmScoreSegments(
    transcription: TranscriptionResult,
    minDuration: number,
    maxDuration: number,
    targetCount: number,
    title: string
  ): Promise<ClipSegment[]> {
    const segmentsJson = transcription.segments
      .filter(s => {
        const dur = s.end - s.start;
        return dur >= minDuration && dur <= maxDuration;
      })
      .map((s, i) => ({
        index: i,
        start: s.start,
        end: s.end,
        text: s.text.substring(0, 300),
      }));

    if (segmentsJson.length === 0) return [];

    const prompt = `You are a viral content analyst. Analyze these video transcript segments and score each for viral potential on YouTube Shorts / TikTok.

Video title: "${title}"

Segments (start-end | text):
${segmentsJson.map(s => `[${s.index}] ${s.start}s-${s.end}s | "${s.text}"`).join('\n')}

Score each segment 0-100 based on:
- Hook Quality: Does it grab attention in first 3 seconds? (30%)
- Emotional Impact: Humor, shock, inspiration, controversy (25%)
- Shareability: Would people send this to friends? (20%)
- Trend Fit: Does it match current viral formats? (15%)
- Retention: Is the pacing tight enough for short-form? (10%)

Return ONLY valid JSON array (no markdown):
[
  {
    "index": <number>,
    "score": <0-100>,
    "reason": "<2-3 sentence viral analysis explaining why this segment works>",
    "highlights": ["<key moment>", "<key moment>", "<key moment>"]
  }
]

Rules:
- Score MUST be 0-100 integer
- Higher scores for segments with clear hooks, emotional peaks, or surprising moments
- Lower scores for slow, rambling, or context-dependent segments
- Return exactly ${targetCount} highest-potential segments
- If fewer than ${targetCount} segments qualify, return what's available`;

    try {
      const response = await withFallbackAndRetry(
        (model: any) => generateText({ model, prompt, system: 'You are a viral content analyst. Respond only with valid JSON arrays.', maxTokens: 2000 } as any),
        getAIModelChain()
      );

      const jsonMatch = response.text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{ index: number; score: number; reason: string; highlights: string[] }>;
        return parsed.map(p => {
          const seg = segmentsJson[p.index];
          return {
            id: `seg-${p.index}-${Date.now()}`,
            startTime: seg.start,
            endTime: seg.end,
            duration: seg.end - seg.start,
            score: Math.min(100, Math.max(0, p.score)),
            reason: p.reason || 'AI-identified viral segment',
            highlights: p.highlights || [],
          };
        });
      }
    } catch (error) {
      Logger.error('[ViralAnalyzer-v2] LLM scoring failed, falling back to keyword scoring:', error);
    }

    return this.keywordScoreFallback(transcription.segments, minDuration, maxDuration);
  }

  private keywordScoreFallback(
    segments: TranscriptionResult['segments'],
    minDuration: number,
    maxDuration: number
  ): ClipSegment[] {
    const VIRAL_KEYWORDS = [
      'amazing', 'incredible', 'unbelievable', 'wow', 'shocking',
      'breaking', 'exclusive', 'first', 'revealed', 'secret',
      'funny', 'hilarious', 'crazy', 'insane', 'viral',
      'best', 'worst', 'top', 'must see', 'trending',
    ];

    const clipSegments: ClipSegment[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const duration = segment.end - segment.start;
      if (duration < minDuration || duration > maxDuration) continue;

      let score = 50;
      const text = segment.text.toLowerCase();
      for (const keyword of VIRAL_KEYWORDS) {
        if (text.includes(keyword)) score += 10;
      }
      const words = text.split(/\s+/);
      if (words.length < 15) score += 10;
      if (segment.text.includes('?')) score += 8;
      if (duration <= 45) score += 5;
      score = Math.min(100, Math.round(score));

      clipSegments.push({
        id: `seg-${i}-${Date.now()}`,
        startTime: segment.start,
        endTime: segment.end,
        duration,
        score,
        reason: 'Keyword-matched viral segment (fallback)',
        highlights: ['Potential viral moment'],
      });
    }
    return clipSegments;
  }

  private removeOverlaps(segments: ClipSegment[]): ClipSegment[] {
    const result: ClipSegment[] = [];
    for (const segment of segments) {
      const overlaps = result.some(
        existing =>
          (segment.startTime >= existing.startTime && segment.startTime < existing.endTime) ||
          (segment.endTime > existing.startTime && segment.endTime <= existing.endTime)
      );
      if (!overlaps) result.push(segment);
    }
    return result;
  }

  private async generateSegmentMeta(
    segment: ClipSegment,
    transcription: TranscriptionResult
  ): Promise<{ caption: string; hashtags: string[]; highlights: string[] }> {
    try {
      const transcriptText = transcription.segments
        .filter(s => s.start >= segment.startTime && s.end <= segment.endTime)
        .map(s => s.text)
        .join(' ');

      const prompt = `Generate viral social media content for this video segment:
Transcript: "${transcriptText.substring(0, 500)}"
Score: ${segment.score}/100

Return JSON:
{
  "caption": "max 150 chars catchy caption",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "highlights": ["key highlight 1", "key highlight 2", "key highlight 3"]
}`;

      const response = await withFallbackAndRetry(
        (model: any) => generateText({ model, prompt, system: 'You are a viral content expert. Respond only with valid JSON.', maxTokens: 300 } as any),
        getAIModelChain()
      );

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
      Logger.warn('[ViralAnalyzer] AI generation failed');
    }

    return {
      caption: 'Check out this amazing moment! #viral #fyp',
      hashtags: ['#viral', '#fyp', '#trending', '#mustsee', '#wow'],
      highlights: ['Viral moment', 'Must watch', 'Amazing content'],
    };
  }
}

export const viralAnalyzer = new ViralAnalyzer();
