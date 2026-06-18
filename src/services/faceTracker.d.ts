/**
 * Face Tracker Service
 * TypeScript wrapper for the Python face tracking worker
 */
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
    videoWidth?: number;
    videoHeight?: number;
    fps?: number;
    error?: string;
}
export interface FaceTrackOptions {
    inputPath: string;
    startTime?: number;
    duration?: number;
    sampleInterval?: number;
}
interface StableSegment {
    startTime: number;
    endTime: number;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
    avgConfidence: number;
}
/**
 * Chunk frames into stable segments where face position doesn't change significantly
 */
export declare function chunkStableSegments(frames: CropFrame[], threshold?: number, minDuration?: number): StableSegment[];
/**
 * Face Tracker Service
 */
export declare class FaceTrackerService {
    private sampleInterval;
    constructor(sampleInterval?: number);
    /**
     * Track faces in a video segment
     */
    trackFaces(inputPath: string, options?: {
        startTime?: number;
        duration?: number;
    }): Promise<FaceTrackResult>;
    /**
     * Get stable face tracking segments for FFmpeg processing
     */
    getStableSegments(inputPath: string, options?: {
        startTime?: number;
        duration?: number;
        stabilityThreshold?: number;
        minSegmentDuration?: number;
    }): Promise<StableSegment[]>;
    /**
     * Build FFmpeg crop filter for a single segment based on face position
     */
    buildSegmentCropFilter(segment: StableSegment, videoWidth: number, videoHeight: number, targetWidth?: number, targetHeight?: number): string;
}
export declare const faceTracker: FaceTrackerService;
export {};
//# sourceMappingURL=faceTracker.d.ts.map