/**
 * Smart Auto-Reframe Service
 *
 * Converts horizontal 16:9 videos to vertical 9:16 format using face/object tracking.
 * Supports two tracking modes:
 * - `face`: Detects and tracks faces using OpenCV Haar cascades
 * - `center`: Centers the crop on the video center (static crop)
 *
 * Output is always 1080x1920 (9:16 portrait).
 *
 * @module services/autoReframe
 */
/**
 * Tracking mode for auto-reframing.
 */
export type TrackingMode = 'face' | 'center';
/**
 * Auto-reframe options.
 */
export interface AutoReframeOptions {
    /** Tracking mode: 'face' or 'center' (default: 'face') */
    trackingMode?: TrackingMode;
    /** Target output height in pixels (default: 1920) */
    targetHeight?: number;
    /** Target output width in pixels (default: 1080) */
    targetWidth?: number;
    /** Face tracking confidence threshold 0-1 (default: 0.5) */
    faceConfidence?: number;
}
/**
 * Converts a horizontal 16:9 video to vertical 9:16 using smart face/object tracking.
 *
 * Process:
 * 1. Extract reference frame from video
 * 2. Detect faces in the frame (face mode) or use center point (center mode)
 * 3. Build FFmpeg crop filter based on detected region
 * 4. Apply crop + scale + blur background for pillarbox
 *
 * @param videoPath        - Absolute path to input 16:9 video
 * @param outputPath       - Absolute path for output 9:16 video
 * @param trackingMode     - 'face' (detect and follow faces) or 'center' (static center crop)
 * @param options          - Additional options
 */
export declare function autoReframeHorizontalToVertical(videoPath: string, outputPath: string, trackingMode?: TrackingMode, options?: AutoReframeOptions): Promise<string>;
/**
 * Detects faces across the video and reframes to 9:16 keeping the primary
 * face centered using OpenCV cascade detection + FFmpeg crop.
 *
 * @param videoPath  - Absolute path to input 16:9 video
 * @param outputPath - Absolute path for output 9:16 video
 * @returns Path to the reframed video
 */
export declare function trackFaceAndReframe(videoPath: string, outputPath: string): Promise<string>;
//# sourceMappingURL=autoReframe.d.ts.map