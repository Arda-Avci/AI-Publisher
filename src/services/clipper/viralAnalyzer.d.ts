import { ViralAnalysisResult, TranscriptionResult } from './types.js';
export declare class ViralAnalyzer {
    private lastUsage;
    /**
     * Son AI çağrısının token kullanım bilgisini döndürür.
     */
    getLastTokenUsage(): {
        model: string;
        usage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    } | null;
    analyze(transcription: TranscriptionResult, options?: {
        minDuration?: number;
        maxDuration?: number;
        targetCount?: number;
        title?: string;
    }): Promise<ViralAnalysisResult>;
    private llmScoreSegments;
    private keywordScoreFallback;
    private removeOverlaps;
}
export declare const viralAnalyzer: ViralAnalyzer;
//# sourceMappingURL=viralAnalyzer.d.ts.map