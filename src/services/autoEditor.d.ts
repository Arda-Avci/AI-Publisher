/**
 * Auto Editor Service — Sessizlik & Hareket Tespiti ile Otomatik Kesim
 * @description FFmpeg volumedetect ve OpenCV benzeri frame farkı analizi ile
 * sessiz ve hareketsiz bölümleri tespit edip keser.
 */
export interface TimeRange {
    start: number;
    end: number;
}
export interface AutoCutOptions {
    /** Sessizlik eşiği dB (varsayılan: -40) */
    silenceThresholdDb?: number;
    /** Minimum sessizlik süresi saniye (varsayılan: 0.5) */
    minSilenceSec?: number;
    /** Statik eşik değeri (varsayılan: 0.01) */
    staticThreshold?: number;
    /** Minimum statik süre saniye (varsayılan: 1.0) */
    minStaticSec?: number;
    /** true = agresif kesim (kısa sessizlikleri de keser) */
    aggressive?: boolean;
    /** Geçişler için dissolve efekti ms (varsayılan: 200) */
    addDissolveMs?: number;
}
/**
 * Ses dosyasındaki sessiz bölümleri tespit eder.
 * @param audioPath — Ses dosyası yolu (mp3, wav, vb.)
 * @param thresholdDb — Sessizlik eşiği dB (varsayılan: -40)
 * @param minDurationSec — Minimum sessizlik süresi (varsayılan: 0.5)
 * @returns Sessiz TimeRange[] dizisi
 */
export declare function detectSilenceRanges(audioPath: string, thresholdDb?: number, minDurationSec?: number): Promise<TimeRange[]>;
/**
 * Kareler arası fark analizi ile hareket seviyelerini tespit eder.
 * OpenCV olmadan, ffmpeg ile frame hash benzeri bir yaklaşım kullanır.
 * @param videoPath — Video dosyası yolu
 * @returns Her frame için ortalama piksel farkı dizisi
 */
export declare function detectMotionLevels(videoPath: string): Promise<number[]>;
/**
 * Düşük hareketli (statik) bölümleri tespit eder.
 * @param videoPath — Video dosyası yolu
 * @param threshold — Statik eşik (varsayılan: 0.01)
 * @returns Statik TimeRange[] dizisi
 */
export declare function findStaticRanges(videoPath: string, threshold?: number): Promise<TimeRange[]>;
/**
 * Sessiz ve statik bölümleri keser.
 * @param videoPath — Giriş video yolu
 * @param options — Kesim seçenekleri
 * @returns Kesilmiş video çıktı yolu
 */
export declare function autoCutVideo(videoPath: string, options: AutoCutOptions): Promise<string>;
/**
 * Verilen keep ranges ile videoyu keser ve dissolve geçişleri ekler.
 * @param videoPath — Giriş video
 * @param cutRanges — Tutulacak zaman aralıkları
 * @param outputPath — Çıktı yolu
 */
export declare function applySmartCut(videoPath: string, cutRanges: TimeRange[], outputPath: string): Promise<void>;
export interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
}
/**
 * Belirtilen kelimeleri transkript metninden siler.
 * Kelimeleri cümle içinden cikarir ve segment zamanlarini yeniden hesaplar.
 *
 * @param transcript - Whisper'dan alinan SRT benzeri zamanli metin (satir satirdir: "start end text")
 * @param wordsToRemove - Silinecek kelimeler dizisi
 * @returns {segments} - Guncellenmis segmentler (silinen kelimeler cikarilmistir)
 */
export declare function removeWordsFromTranscript(transcript: string, wordsToRemove: string[]): {
    segments: TranscriptSegment[];
};
/**
 * SRT dosyasindan TranscriptSegment[] dizisi dondurur.
 * @param srtPath - SRT dosya yolu
 */
export declare function parseSrtToSegments(srtPath: string): Promise<TranscriptSegment[]>;
/**
 * Verilen segmentlerden yeni bir video keser (FFmpeg concat demuxer ile).
 * Silinen kelimelerin oldugu zaman araliklari cikarilir.
 *
 * @param videoPath  - Giriş video yolu
 * @param segments   - Tutulacak zaman araliklari {start, end}[]
 * @param outputPath - Cikti yolu
 */
export declare function cutVideoByTranscript(videoPath: string, segments: {
    start: number;
    end: number;
}[], outputPath: string): Promise<string>;
//# sourceMappingURL=autoEditor.d.ts.map