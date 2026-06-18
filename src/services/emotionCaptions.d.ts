/**
 * Emotion Highlight Captions Service
 *
 * Detects emotional peaks in audio (high-energy words, voice inflection changes)
 * and generates colored highlight SRT subtitles that emphasize those words.
 *
 * @module services/emotionCaptions
 */
/**
 * Represents an emotional peak detected in audio.
 */
export interface EmotionPeak {
    /** Start time in seconds */
    startSeconds: number;
    /** End time in seconds */
    endSeconds: number;
    /** The word or phrase that has emotional emphasis */
    word: string;
    /** Intensity level 0-1 */
    intensity: number;
    /** Suggested color for highlight (hex) */
    suggestedColor: string;
}
/**
 * Result of emotion peak detection.
 */
export interface EmotionDetectionResult {
    /** Detected peaks */
    peaks: EmotionPeak[];
    /** Audio duration in seconds */
    durationSeconds: number;
    /** Processing error if any */
    error?: string;
}
/**
 * Word-level vocal emphasis detected from audio analysis.
 */
export interface WordEmphasis {
    word: string;
    start: number;
    end: number;
    emphasis: 'high' | 'medium' | 'low';
}
/**
 * Detects vocal emphasis at word-level by analyzing audio frequency peaks via FFmpeg astats.
 *
 * Uses astats to find volume peaks across the audio, then maps them to approximate
 * word positions based on estimated speaking pace. Returns word-level emphasis data
 * suitable for coloring in DynamicCaptions.
 *
 * @param audioPath - Absolute path to audio file (WAV/MP3)
 * @returns Array of word-level emphasis data with timestamps
 */
export declare function detectVocalEmphasis(audioPath: string): Promise<WordEmphasis[]>;
/**
 * SRT caption entry with styling info.
 */
export interface StyledSrtEntry {
    index: number;
    startTime: string;
    endTime: string;
    text: string;
    /** Highlight color for this entry (hex) */
    highlightColor?: string;
    /** Words to highlight within this entry */
    highlightWords?: string[];
}
/**
 * Detects emotional peaks in an audio file by analyzing voice energy.
 *
 * Uses FFmpeg's volumedetect and astats filters to find high-amplitude segments,
 * then maps those to words in the transcript.
 *
 * @param audioPath - Absolute path to audio file (WAV/MP3)
 * @param transcript - Full transcript text with word-level timestamps (optional)
 * @returns Detection result with peaks
 */
export declare function detectEmotionPeaks(audioPath: string): Promise<EmotionDetectionResult>;
/**
 * Generates a styled SRT file that highlights emotionally charged words.
 *
 * @param transcript   - Plain transcript text (sentences separated by periods)
 * @param emotionPeaks - Detected emotion peaks
 * @param options      - Styling options
 * @returns Array of styled SRT entries
 */
export declare function generateHighlightSrt(transcript: string, emotionPeaks: EmotionPeak[]): StyledSrtEntry[];
/**
 * Converts styled SRT entries to actual SRT file content.
 *
 * @param entries      - Styled SRT entries
 * @param startOffset  - Start offset in seconds (for aligning with video timeline)
 * @param wordsPerSecond - Speaking pace for timing (default: 2.5 words/sec)
 * @returns SRT file content string
 */
export declare function formatHighlightSrt(entries: StyledSrtEntry[], startOffset?: number, wordsPerSecond?: number): string;
/**
 * Applies emotion-based colored subtitles to a video.
 *
 * @param videoPath  - Absolute path to input video
 * @param srtPath    - Path to the generated (or provided) SRT file
 * @param outputPath - Absolute path for output video with embedded subtitles
 * @param primaryColor - Default subtitle color (hex)
 */
export declare function applyEmotionCaptionStyle(videoPath: string, srtPath: string, outputPath: string, primaryColor?: string): Promise<void>;
//# sourceMappingURL=emotionCaptions.d.ts.map