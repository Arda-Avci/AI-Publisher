/**
 * Per-Frame Dynamic Cropper Service
 * Yüz takibi verisine göre kare kare dinamik kırpma.
 * faceTracker'dan gelen CropFrame[] verisini alır,
 * interpolasyon ile yumuşak keyframe'ler oluşturur,
 * her chunk'ı ayrı ayrı FFmpeg ile kırpar ve birleştirir.
 */
import type { CropAspectRatio } from '../../types/clipper.js';
export interface PerFrameCropOptions {
    /** Hedef en-boy oranı */
    aspectRatio?: CropAspectRatio;
    /** Çıkış genişliği (varsayılan 1080) */
    outputWidth?: number;
    /** Çıkış yüksekliği (varsayılan 1920) */
    outputHeight?: number;
    /** Chunk süresi saniye cinsinden (varsayılan 0.5) */
    chunkDuration?: number;
    /** Yüz bulunamadığında merkez kırpma kullan */
    fallbackToCenter?: boolean;
    /** Yüz konumu yumuşatma penceresi (kaç keyframe) */
    smoothingWindow?: number;
}
export interface PerFrameCropResult {
    outputPath: string;
    totalChunks: number;
    faceTrackedChunks: number;
    centerFallbackChunks: number;
    duration: number;
    keyframeCount: number;
}
/**
 * Videoyu yüz takibi verisine göre kare kare dinamik olarak kırpar.
 *
 * akış:
 * 1. faceTracker ile per-frame yüz konumlarını al
 * 2. Yüz konumlarını yumuşat (moving average)
 * 3. Chunk'ları oluştur (her biri chunkDuration saniye)
 * 4. Her chunk için interpolasyonlu crop uygula
 * 5. Tüm chunk'ları birleştir
 */
export declare function cropPerFrame(inputPath: string, outputPath: string, options?: PerFrameCropOptions): Promise<PerFrameCropResult>;
//# sourceMappingURL=perFrameCropper.d.ts.map