/**
 * Post-Crop Service
 * Orchestrates the post-crop pipeline: subtitle burning + audio ducking/music mixing
 */
import type { ClipSegment } from './types.js';
export interface SubtitleOptions {
    enabled: boolean;
    primaryColor?: string;
    secondaryColor?: string;
    fontPath?: string;
    style?: 'kinetic' | 'static' | 'caption';
}
export interface MusicOptions {
    enabled: boolean;
    musicPath: string;
    volume?: number;
    duckingEnabled?: boolean;
}
export interface PostCropOptions {
    croppedVideoPath: string;
    outputPath: string;
    clipSegment: ClipSegment;
    subtitleOptions?: SubtitleOptions;
    musicOptions?: MusicOptions;
}
/**
 * Format time for SRT subtitles (HH:MM:SS,mmm)
 */
export declare function formatSRTTime(seconds: number): string;
/**
 * Process post-crop pipeline:
 * 1. Generate SRT from clip segments
 * 2. Burn subtitles using applyKineticSubtitles
 * 3. Mix background music with smart ducking using applySmartAudioDucking
 */
export declare function processPostCrop(options: PostCropOptions): Promise<string>;
//# sourceMappingURL=postCropService.d.ts.map