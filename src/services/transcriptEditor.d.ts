/**
 * Transcript Editor — Edit videos by deleting words from transcript.
 *
 * Uses Whisper word-level timestamps to identify which video segments to remove,
 * then applies FFmpeg `between()` filter or segment/concat to produce the edited video.
 *
 * @module services/transcriptEditor
 */
import { WhisperWord } from '../types/clipper.js';
export interface TimeRange {
    start: number;
    end: number;
}
export interface VideoSegment {
    start: number;
    end: number;
    path?: string;
}
export interface TranscriptEditResult {
    outputPath: string;
    removedRanges: TimeRange[];
    keptRanges: TimeRange[];
    durationBefore: number;
    durationAfter: number;
}
/**
 * Parse a transcript string and deletions array to compute time ranges to remove.
 *
 * @param transcript - Full transcript text (words separated by whitespace)
 * @param deletions - Array of word indices (0-based) to delete
 * @param wordTimestamps - Whisper word-level timestamps (must match transcript words)
 * @returns Array of TimeRange objects to remove
 */
export declare function parseTranscriptEdits(transcript: string, deletions: number[], wordTimestamps: WhisperWord[]): TimeRange[];
/**
 * Find word timestamps from Whisper transcript output.
 *
 * @param transcript - Full transcript text
 * @param wordTimestamps - Array of WhisperWord objects from Whisper transcription
 * @returns Map of word index to WhisperWord
 */
export declare function findWordTimestamps(transcript: string, wordTimestamps: WhisperWord[]): Map<number, WhisperWord>;
/**
 * Cut video by transcript — removes unwanted time ranges using FFmpeg between() filter.
 *
 * Uses FFmpeg `select` filter with `between()` to KEEP only the desired ranges.
 * This is the inverse of cutting: we keep the good parts and skip the bad parts.
 *
 * @param videoPath - Input video path
 * @param keepRanges - Array of TimeRange to keep (not remove)
 * @param outputPath - Output video path
 */
export declare function cutVideoByTranscript(videoPath: string, keepRanges: TimeRange[], outputPath: string): Promise<void>;
/**
 * Assemble multiple video segments into a single video using FFmpeg concat.
 *
 * @param segments - Array of VideoSegment objects with start/end times
 * @param videoPath - Source video path to extract segments from
 * @param outputPath - Output path for assembled video
 */
export declare function assembleVideoSegments(segments: VideoSegment[], videoPath: string, outputPath: string): Promise<void>;
/**
 * Edit video by removing words from transcript.
 *
 * Main orchestrator: takes a WhisperWord array and deletion indices,
 * computes time ranges to remove, and produces the edited video.
 *
 * @param videoPath - Input video
 * @param wordTimestamps - Whisper word-level timestamps
 * @param deletions - Array of word indices to delete
 * @param outputPath - Output video path
 * @returns TranscriptEditResult with statistics
 */
export declare function editVideoByTranscript(videoPath: string, wordTimestamps: WhisperWord[], deletions: number[], outputPath: string): Promise<TranscriptEditResult>;
//# sourceMappingURL=transcriptEditor.d.ts.map