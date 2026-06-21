/**
 * AI B-Roll Synthesis Service
 *
 * Generates contextual B-Roll clips using CogVideoX based on keyword analysis,
 * and inserts them into main videos at semantically appropriate moments.
 *
 * @module services/aiBroll
 */
/**
 * Represents a single B-Roll clip to be inserted.
 */
export interface BrollClip {
    /** Keywords describing the B-Roll content */
    keywords: string[];
    /** Duration in seconds */
    duration: number;
    /** Output path where the generated B-Roll video is saved */
    outputPath: string;
    /** Timestamp in main video (seconds) where this B-Roll should be inserted */
    insertAtSeconds: number;
}
/**
 * Result of B-Roll generation.
 */
export interface GenerateBrollResult {
    /** Path to the generated B-Roll video */
    outputPath: string;
    /** Whether generation succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
}
/**
 * Generates a keyword-based 3-4 second B-Roll clip using CogVideoX via Docker.
 *
 * Calls Docker endpoint: /generate-media?mode=cogvideo_broll&prompt={keyword}&duration={duration}
 *
 * @param keyword     - Single keyword or short phrase describing the B-Roll
 * @param duration    - Duration in seconds (3-4 typical)
 * @param outputPath  - Absolute path to save the generated B-Roll video
 * @returns Path to generated video on success
 */
export declare function generateCogVideoXBroll(keyword: string, duration: number, outputPath: string): Promise<string>;
/**
 * Generates a B-Roll clip using CogVideoX via Docker.
 *
 * @param keywords     - Keywords describing the B-Roll content
 * @param duration     - Duration in seconds (3-4 typical)
 * @param outputPath   - Absolute path to save the generated B-Roll
 * @returns Result with output path
 */
export declare function generateBroll(keywords: string[], duration: number, outputPath: string): Promise<GenerateBrollResult>;
/**
 * Inserts B-Roll clips into a main video at specified timestamps using FFmpeg.
 *
 * Uses the libavfilter complex filtergraph to:
 * 1. Trim main video around each B-Roll insertion point
 * 2. Concatenate segments with B-Roll clips in between
 *
 * @param mainVideo    - Absolute path to the main video
 * @param brollClips   - Array of BrollClip objects to insert
 * @param output       - Absolute path for the final video with B-Rolls
 */
export declare function insertBroll(mainVideo: string, brollClips: BrollClip[], output: string): Promise<void>;
//# sourceMappingURL=aiBroll.d.ts.map