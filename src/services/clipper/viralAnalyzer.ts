import { z } from 'zod';
import { ClipSegment, ViralAnalysisResult, TranscriptionResult } from './types.js';
import { Logger } from '../../lib/logger.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { generateObject, generateText } from 'ai';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { tokenTracker } from '../../lib/token-tracker.js';

// ── Zod Şemaları ──────────────────────────────────────────────────────────────

const ViralSegmentSchema = z.object({
  index: z.number().describe('Transkripsiyon segment indeksi'),
  score: z.number().min(0).max(100).describe('Viral potansiyel skoru (0-100)'),
  reason: z.string().describe('Bu segmentin neden viral olduğunu açıklayan 2-3 cümlelik analiz'),
  highlights: z.array(z.string()).describe('Segmentteki anahtar anlar'),
  caption: z.string().describe('Maksimum 150 karakterlik çekici Türkçe başlık'),
  hashtags: z.array(z.string()).describe('5 adet Türkçe viral hashtag'),
});

const ViralAnalysisSchema = z.object({
  segments: z.array(ViralSegmentSchema).describe('Viral segmentler (puan sırasına göre)'),
  overallScore: z.number().min(0).max(100).describe('Genel viral skor ortalaması'),
  topReason: z.string().describe('En yüksek puanlı segmentin neden seçildiği'),
});

type ViralSegmentResult = z.infer<typeof ViralSegmentSchema>;

// ── ViralAnalyzer v2 ──────────────────────────────────────────────────────────

export class ViralAnalyzer {
  private lastUsage: {
    model: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  } | null = null;

  /**
   * Son AI çağrısının token kullanım bilgisini döndürür.
   */
  getLastTokenUsage(): {
    model: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  } | null {
    return this.lastUsage;
  }

  async analyze(
    transcription: TranscriptionResult,
    options: {
      minDuration?: number;
      maxDuration?: number;
      targetCount?: number;
      title?: string;
    } = {},
  ): Promise<ViralAnalysisResult> {
    const { minDuration = 30, maxDuration = 90, targetCount = 5, title = '' } = options;

    Logger.info(
      `[ViralAnalyzer-v2] ${transcription.segments.length} segment analiz ediliyor (Gemini structured)`,
    );

    const scoredSegments = await this.llmScoreSegments(
      transcription,
      minDuration,
      maxDuration,
      targetCount,
      title,
    );

    scoredSegments.sort((a, b) => b.score - a.score);
    const topSegments = scoredSegments.slice(0, targetCount);
    const nonOverlapping = this.removeOverlaps(topSegments);

    const overallScore =
      nonOverlapping.length > 0
        ? Math.round(nonOverlapping.reduce((sum, s) => sum + s.score, 0) / nonOverlapping.length)
        : 0;

    tokenTracker.logSummary();

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
    title: string,
  ): Promise<ClipSegment[]> {
    const eligibleSegments = transcription.segments
      .filter((s) => {
        const dur = s.end - s.start;
        return dur >= minDuration && dur <= maxDuration;
      })
      .map((s, i) => ({
        index: i,
        start: s.start,
        end: s.end,
        text: s.text.substring(0, 300),
      }));

    if (eligibleSegments.length === 0) {
      Logger.warn('[ViralAnalyzer-v2] Uygun segment bulunamadı, keyword fallback kullanılıyor');
      return this.keywordScoreFallback(transcription.segments, minDuration, maxDuration);
    }

    const prompt = `Sen Türk YouTube Shorts ve TikTok için viral içerik analistisin. Bu video transkripsiyon segmentlerini analiz et ve her birini viral potansiyeline göre değerlendir.

Video başlığı: "${title}"

ÖNEMLİ: Konuşmacılar Türkçe. Şunlara dikkat et:
- Türkçe duygusal ifadeler (şok, bomba, inanılmaz, sürpriz, acayip, felaket, efsane)
- Türkçe kültürel referanslar ve mizah kalıpları
- Kısa formatta dikkat çekici hook'lar ("bakalım", "ne olacak", "sizce", "şimdi bak")
- Merak uyandıran sorular ve tartışmalı ifadeler
- Paylaşılabilirlik potansiyeli

Segmentler (indeks | başlangıç-bitis | metin):
${eligibleSegments.map((s) => `[${s.index}] ${s.start}s-${s.end}s | "${s.text}"`).join('\n')}

Her segmenti 0-100 arasında puanla. Değerlendirme kriterleri:
- Hook Kalitesi: İlk 3 saniyede dikkat çekiyor mu? Güçlü Türkçe hook kelimeleri: "şimdi", "bak", "süprize bak", "inanılmaz" (%30)
- Duygusal Etki: Mizah, şok, ilham, tartışmalı içerik (%25)
- Paylaşılabilirlik: Türk izleyiciler bunu arkadaşlarına gönderir mi? (%20)
- Trend Uyumu: Güncel Türk viral formatlarıyla uyumlu mu? (%15)
- Tutanma: Kısa formatta sıkı kurgu mu var? (%10)

Kurallar:
- Skor 0-100 arasında tam sayı olmalı
- Açık hook'lar, duygusal doruk anları veya şaşırtıcı anlar içeren segmentlere yüksek skor ver
- Yavaş, uzun konuşmalı veya bağlama ihtiyaç duyan segmentlere düşük skor ver
- caption: Maksimum 150 karakterlik çekici Türkçe başlık (hook kelimesi içersin)
- hashtags: #viral #şok #keşfet #tiktok #youtube gibi 5 adet hashtag
- highlights: Segmentteki 3 anahtar anı belirt`;

    try {
      const models = getAIModelChain();

      // generateObject ile structured output al (regex parsing yok)
      const result = await withFallbackAndRetry(
        async (model: any) => {
          const modelId = model?.modelId || model?.model || 'unknown';
          const response = await generateObject({
            model,
            schema: ViralAnalysisSchema,
            prompt,
            system:
              'Sen Türk YouTube Shorts ve TikTok viral içerik analistisin. SADECE geçerli JSON döndür.',
            abortSignal: AbortSignal.timeout(45000),
          });

          // Token usage'ı kaydet
          if (response.usage) {
            const u = response.usage as any;
            const usageData = {
              promptTokens: u.promptTokens ?? u.prompt_tokens ?? 0,
              completionTokens: u.completionTokens ?? u.completion_tokens ?? 0,
              totalTokens: u.totalTokens ?? u.total_tokens ?? 0,
            };
            this.lastUsage = { model: modelId, usage: usageData };
            tokenTracker.track(modelId, usageData);
          }

          return response;
        },
        models,
        2,
        2000,
        true, // skipZenModels — Zen modelleri structured output desteklemez
      );

      const analysis = result.object;

      // Uygun segmentleri ClipSegment[] formatına dönüştür
      return analysis.segments
        .map((seg) => {
          const eligible = eligibleSegments[seg.index];
          if (!eligible) return null;
          return {
            id: `seg-${seg.index}-${Date.now()}`,
            startTime: eligible.start,
            endTime: eligible.end,
            duration: eligible.end - eligible.start,
            score: Math.min(100, Math.max(0, seg.score)),
            reason: seg.reason || 'AI-identified viral segment',
            highlights: seg.highlights || [],
            suggestedCaption: seg.caption || '',
            suggestedHashtags: seg.hashtags || [],
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
    } catch (error) {
      Logger.error(
        '[ViralAnalyzer-v2] Gemini structured output başarısız, keyword fallback kullanılıyor:',
        error,
      );
    }

    return this.keywordScoreFallback(transcription.segments, minDuration, maxDuration);
  }

  private keywordScoreFallback(
    segments: TranscriptionResult['segments'],
    minDuration: number,
    maxDuration: number,
  ): ClipSegment[] {
    const VIRAL_KEYWORDS: Record<string, number> = {
      // Türkçe güçlü hook kelimeleri (+15)
      şok: 15,
      bomba: 15,
      efsane: 15,
      acayip: 12,
      sürpriz: 12,
      inanılmaz: 15,
      felaket: 12,
      kral: 10,
      harika: 10,
      muhteşem: 12,
      sarsıcı: 12,
      dehşet: 12,
      çılgınlık: 10,
      skandal: 15,
      bombabomba: 15,
      // Türkçe soru/hook ifadeleri (+10)
      'bak şimdi': 10,
      'dinle bak': 10,
      'bu ne böyle': 10,
      'olanlar oldu': 12,
      'gerçekten mi': 10,
      sizce: 8,
      'ne olacak': 10,
      bakalım: 8,
      şimdi: 8,
      dikkat: 10,
      'son dakika': 15,
      flaş: 12,
      // İngilizce viral kelimeler (+8)
      amazing: 8,
      incredible: 8,
      unbelievable: 8,
      shocking: 10,
      breaking: 10,
      exclusive: 8,
      viral: 8,
      omg: 8,
    };

    const clipSegments: ClipSegment[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;
      const duration = segment.end - segment.start;
      if (duration < minDuration || duration > maxDuration) continue;

      let score = 40; // Baz skor
      const text = segment.text.toLowerCase();

      // Keyword taraması
      for (const [keyword, points] of Object.entries(VIRAL_KEYWORDS)) {
        if (text.includes(keyword)) score += points;
      }

      // Soru işareti bonusu
      if (segment.text.includes('?')) score += 10;

      // Kısa ve öz segment bonusu (ilk 3 saniye hook için ideal)
      if (duration <= 45) score += 5;
      if (duration <= 30) score += 5;

      // Kelime yoğunluğu bonusu (az kelime = öz = dikkat çekici)
      const words = text.split(/\s+/);
      if (words.length < 15) score += 8;
      if (words.length < 8) score += 5;

      score = Math.min(100, Math.round(score));

      clipSegments.push({
        id: `seg-${i}-${Date.now()}`,
        startTime: segment.start,
        endTime: segment.end,
        duration,
        score,
        reason: 'Keyword-matched viral segment (fallback)',
        highlights: ['Potansiyel viral an'],
        suggestedCaption: 'Bu an kaçmaz! #viral #şok #keşfet',
        suggestedHashtags: ['#viral', '#şok', '#keşfet', '#tiktok', '#youtube'],
      });
    }
    return clipSegments;
  }

  private removeOverlaps(segments: ClipSegment[]): ClipSegment[] {
    const result: ClipSegment[] = [];
    for (const segment of segments) {
      const overlaps = result.some(
        (existing) =>
          (segment.startTime >= existing.startTime && segment.startTime < existing.endTime) ||
          (segment.endTime > existing.startTime && segment.endTime <= existing.endTime),
      );
      if (!overlaps) result.push(segment);
    }
    return result;
  }
}

export const viralAnalyzer = new ViralAnalyzer();
