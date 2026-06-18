/**
 * Subtitle Renderer — SRT/JSON parse + word-level timestamp generator
 * Powers DynamicCaptions with Hormozi-style word-by-word animated subtitles
 */
/**
 * Represents a single word with its timing information
 */
export interface WordTiming {
    word: string;
    start: number;
    end: number;
}
/**
 * Parses SRT content into word-level timings
 * @param srtContent - Raw SRT file content
 * @returns Array of word timings with start/end in seconds
 */
export declare function parseSrtToWords(srtContent: string): WordTiming[];
/**
 * Generates approximate word-level timings for plain text
 * Used when Whisper word timings are not available
 * @param text - Full subtitle text
 * @param duration - Total duration in seconds
 * @param wpm - Words per minute rate (default 150 for normal speech)
 * @returns Array of word timings
 */
export declare function generateWordTimings(text: string, duration: number, wpm?: number): WordTiming[];
/**
 * Aligns subtitle words to audio using a transcription file with word timings
 * Falls back to generateWordTimings if alignment data unavailable
 * @param srtContent - SRT subtitle content
 * @param _audioPath - Path to audio file (reserved for future ffmpeg/Whisper integration)
 * @returns Array of word timings aligned to audio
 */
export declare function alignSubtitlesToAudio(srtContent: string, _audioPath: string): WordTiming[];
/**
 * Parses a JSON subtitle format (e.g., from Whisper) into word timings
 * Expected format: { words: [{ word: string, start: number, end: number }] }
 * @param jsonContent - JSON subtitle content
 * @returns Array of word timings
 */
export declare function parseJsonSubtitles(jsonContent: string): WordTiming[];
/**
 * Merges multiple word timing arrays into a single timeline
 * Used when combining multiple subtitle sources
 * @param arrays - Multiple word timing arrays
 * @returns Merged and sorted word timings
 */
export declare function mergeWordTimings(arrays: WordTiming[][]): WordTiming[];
/**
 * Extracts clean text from SRT content (no timing data)
 * @param srtContent - Raw SRT content
 * @returns Plain text of all subtitles
 */
export declare function extractTextFromSrt(srtContent: string): string;
//# sourceMappingURL=subtitleRenderer.d.ts.map