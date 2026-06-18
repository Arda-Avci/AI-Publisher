/**
 * Eye Contact Correction Service
 *
 * Calls Colab endpoint `/api/v1/eye-contact` to correct eye contact in videos.
 * Falls back to returning the original video path on error.
 *
 * @module services/eyeContact
 */
/**
 * Input options for eye contact correction.
 */
export interface EyeContactOptions {
    /** Video file path to process */
    videoPath: string;
    /** Output path for the corrected video */
    outputPath: string;
    /** Enable smooth transition blend (default: true) */
    smoothTransition?: boolean;
}
/**
 * Result of eye contact correction.
 */
export interface EyeContactResult {
    /** Path to the processed video (original path on fallback) */
    processedVideoPath: string;
    /** Whether fallback was used */
    usedFallback: boolean;
    /** Error message if any */
    error?: string;
}
/**
 * Corrects eye contact in a video using Colab AI processing.
 *
 * @param videoPath - Absolute path to the input video
 * @param outputPath - Absolute path for the output video
 * @returns Result with processed path or fallback
 */
export declare function correctEyeContact(videoPath: string, outputPath: string): Promise<EyeContactResult>;
/**
 * Convenience wrapper that copies input to output if fallback is used.
 * Ensures the caller always has a valid processed video at outputPath.
 */
export declare function enhanceEyeContact(videoPath: string, outputPath: string): Promise<string>;
//# sourceMappingURL=eyeContact.d.ts.map