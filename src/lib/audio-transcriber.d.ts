export interface TranscriptionSegment {
    start: number;
    end: number;
    text: string;
    words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
    }>;
}
export interface TranscriptionResult {
    text: string;
    segments: TranscriptionSegment[];
    language?: string;
}
/**
 * Zaman damgalı deşifre motoru.
 * Öncelikli olarak Google Colab sunucusundaki /transcribe endpoint'ini kullanır (faster-whisper & whisper fallback).
 * Colab kapalı ise Gemini 2.5 Flash structured JSON fallback altyapısını tetikler.
 */
export declare function transcribeVideoAudioWithTimestamps(videoPath: string, language?: string): Promise<TranscriptionResult>;
/**
 * Geriye dönük uyumluluk için düz metin deşifre fonksiyonu
 */
export declare function transcribeVideoAudio(videoPath: string): Promise<string>;
//# sourceMappingURL=audio-transcriber.d.ts.map