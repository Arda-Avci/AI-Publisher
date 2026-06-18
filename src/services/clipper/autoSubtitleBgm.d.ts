/**
 * Auto Subtitle & BGM Service
 * Otomatik altyazı üretimi ve BGM miksajı.
 * ClipSegment'in suggestedCaption'ından kelime bazlı SRT oluşturur,
 * BGM yoksa sessiz loop üretir, audio ducking ile miksler.
 */
import type { ClipSegment } from './types.js';
import type { SubtitleStyleOptions } from '../../types/clipper.js';
export interface AutoSubtitleOptions {
    /** Altyazı stili */
    subtitleStyle?: SubtitleStyleOptions;
    /** Maksimum karakter satır başına (varsayılan 35 — short-form için ideal) */
    maxCharsPerLine?: number;
    /** Altyazı pozisyonu */
    position?: 'bottom' | 'top' | 'center';
}
export interface AutoBgmOptions {
    /** Özel BGM dosya yolu. Verilmezse sessiz loop üretilir */
    musicPath?: string;
    /** BGM ses seviyesi (0.0-1.0, varsayılan 0.12 — short-form için düşük) */
    musicVolume?: number;
    /** Audio ducking etkin mi (varsayılan true) */
    duckingEnabled?: boolean;
    /** Ducking eşik değeri dB cinsinden (varsayılan -18) */
    duckingThresholdDb?: number;
}
export interface AutoProcessOptions {
    /** Altyazı seçenekleri */
    subtitle?: AutoSubtitleOptions;
    /** BGM seçenekleri */
    bgm?: AutoBgmOptions;
}
export interface AutoProcessResult {
    outputPath: string;
    srtPath: string;
    subtitlesEmbedded: boolean;
    bgmMixed: boolean;
    duckingApplied: boolean;
    duration: number;
}
/**
 * Videoyu otomatik olarak altyazı ve BGM ile işler.
 *
 * Akış:
 * 1. suggestedCaption'dan kelime bazlı SRT üret
 * 2. SRT'yi videoya göm (burn-in subtitles)
 * 3. BGM yoksa sessiz loop üret
 * 4. Audio ducking ile BGM miksle
 * 5. Temizlik ve sonuç
 */
export declare function autoProcessClip(videoPath: string, outputPath: string, segment: ClipSegment, options?: AutoProcessOptions): Promise<AutoProcessResult>;
//# sourceMappingURL=autoSubtitleBgm.d.ts.map