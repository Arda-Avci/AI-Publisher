/**
 * Video Clipper Service
 * Handles video cropping, face tracking, and clip generation
 */
import { ClipSegment, ClipperConfig } from './types.js';
export declare class VideoClipper {
    private config;
    constructor(config?: Partial<ClipperConfig>);
    /**
     * Crop a video segment to target aspect ratio with optional face tracking
     */
    cropSegment(inputPath: string, outputPath: string, segment: ClipSegment, options?: {
        aspectRatio?: '9:16' | '16:9' | '1:1';
        faceTracking?: boolean;
        trackCenter?: {
            x: number;
            y: number;
        };
    }): Promise<string>;
    /**
     * Crop a video segment using adaptive face tracking v2
     * Multi-face support, confidence-based smoothing, scene change detection
     */
    cropSegmentWithFaceTracking(inputPath: string, outputPath: string, segment: ClipSegment, options?: {
        aspectRatio?: '9:16' | '16:9' | '1:1';
        outputWidth?: number;
        outputHeight?: number;
        multiFace?: boolean;
        smoothWindow?: number;
        sceneChangeThreshold?: number;
    }): Promise<string>;
    /**
     * Apply moving average smoothing to face tracking frames
     */
    private smoothCropFrames;
    /**
     * Detect scene changes by analyzing face position jumps
     */
    private detectSceneChanges;
    /**
     * Merge face-tracking stable segments with scene change boundaries
     */
    private mergeSceneChanges;
    /**
     * Build crop filter with adaptive padding based on face confidence
     */
    private buildMultiFaceCropFilter;
    /**
     * Build FFmpeg crop filter centered on face position
     */
    private buildFaceCropFilter;
    /**
     * Run a crop FFmpeg command
     */
    private runCropCommand;
    /**
     * Calculate FFmpeg crop filter based on aspect ratio and face tracking
     */
    private calculateCropFilter;
    /**
     * Get video dimensions using ffprobe
     */
    private getVideoDimensions;
    /**
     * Generate subtitles for a clip
     */
    generateSubtitles(inputPath: string, outputPath: string, segments: {
        start: number;
        end: number;
        text: string;
    }[]): Promise<string>;
    /**
     * Format time for SRT subtitles (HH:MM:SS,mmm)
     */
    private formatSRTTime;
    /**
     * Mix background music into clip
     */
    mixMusic(inputPath: string, musicPath: string, outputPath: string, musicVolume?: number): Promise<string>;
    /**
     * Create split-screen (A/B) layout
     */
    createSplitScreen(topVideoPath: string, bottomVideoPath: string, outputPath: string, layout?: 'horizontal' | 'vertical'): Promise<string>;
    /**
     * Add watermark/mascot overlay
     */
    addWatermark(inputPath: string, watermarkPath: string, outputPath: string, position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'): Promise<string>;
}
export declare const videoClipper: VideoClipper;
//# sourceMappingURL=videoClipper.d.ts.map