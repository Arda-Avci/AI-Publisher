/**
 * Clipper Service Types
 * Autonomous video clipping and short-form content extraction
 */
export interface ClipSegment {
    id: string;
    startTime: number;
    endTime: number;
    duration: number;
    score: number;
    reason: string;
    highlights: string[];
    suggestedCaption?: string;
    suggestedHashtags?: string[];
}
export interface ClipJob {
    id: string;
    videoId: number;
    userId: number;
    sourceVideoPath: string;
    segments: ClipSegment[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
    outputPaths?: string[];
}
export interface ClipperConfig {
    minSegmentDuration: number;
    maxSegmentDuration: number;
    targetAspectRatio: '9:16' | '16:9' | '1:1';
    faceTracking: boolean;
    autoSubtitles: boolean;
    autoMusic: boolean;
    outputFormat: 'mp4' | 'webm';
}
export interface TranscriptionResult {
    text: string;
    segments: Array<{
        start: number;
        end: number;
        text: string;
        words?: Array<{
            word: string;
            start: number;
            end: number;
            confidence: number;
        }>;
    }>;
    language: string;
}
export interface ViralAnalysisResult {
    segments: ClipSegment[];
    overallScore: number;
    topReason: string;
    transcriptSegments: number;
}
export interface FaceCropOptions {
    inputPath: string;
    outputPath: string;
    segment: ClipSegment;
    trackingMode: 'face' | 'motion' | 'center';
    outputWidth?: number;
    outputHeight?: number;
}
export interface CropFrame {
    timestamp: number;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
    confidence: number;
}
export interface FaceTrackResult {
    frames: CropFrame[];
    duration: number;
    mode: string;
}
export interface SplitScreenOptions {
    gapPx?: number;
    borderColor?: string;
    borderWidth?: number;
    transitionType?: 'none' | 'dissolve' | 'wipe';
    outputWidth?: number;
    outputHeight?: number;
}
export interface OverlayPosition {
    x: number | string;
    y: number | string;
    scale?: number;
    opacity?: number;
}
export type AnimationType = 'float' | 'bounce' | 'blink';
export type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
//# sourceMappingURL=types.d.ts.map