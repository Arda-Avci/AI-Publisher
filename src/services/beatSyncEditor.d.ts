/**
 * Beat Sync Editor Service
 * Applies beat-synced cuts and transitions to videos
 */
import { BeatMarker } from './beatAnalyzer';
export interface BeatSyncOptions {
    videoPath: string;
    audioPath?: string;
    crossfadeDur?: number;
    minSegmentDur?: number;
    alignToBeats?: boolean;
}
/**
 * Apply beat-synced editing to a video
 *
 * The editor cuts the video at beat boundaries and optionally applies
 * crossfade transitions between segments for smooth beat-aligned cuts.
 */
export declare function applyBeatSync(options: BeatSyncOptions, beatMarkers: BeatMarker[], outputPath: string): Promise<void>;
/**
 * Quick beat-sync apply with default settings
 * Convenience function for simple use cases
 */
export declare function quickBeatSync(videoPath: string, outputPath: string, bpm?: number): Promise<void>;
export interface AudioSegment {
    start: number;
    end: number;
    energy: number;
}
export interface BeatCutPoint {
    timestamp: number;
    beatNumber: number;
    strength: number;
}
export interface BeatCutOptions {
    bpm?: number;
    energyThreshold?: number;
    minSegmentDuration?: number;
    crossfadeDuration?: number;
    onsetsOnly?: boolean;
}
/**
 * Analyze audio BPM using Python librosa subprocess.
 *
 * @param audioPath - Path to audio file
 * @returns Object with bpm, peaks array, and segments array
 */
export declare function analyzeAudioBPM(audioPath: string): Promise<{
    bpm: number;
    peaks: number[];
    segments: AudioSegment[];
}>;
/**
 * Find beat cut points from audio based on BPM.
 *
 * @param audioPath - Path to audio file
 * @param videoPath - Path to video file (for duration reference)
 * @param options - Beat cut options
 * @returns Array of BeatCutPoint objects
 */
export declare function findBeatCutPoints(audioPath: string, videoPath: string, options?: BeatCutOptions): Promise<BeatCutPoint[]>;
/**
 * Apply beat-sync cuts to video using FFmpeg segment + concat.
 *
 * @param videoPath - Input video path
 * @param cutPoints - Array of BeatCutPoint from findBeatCutPoints
 * @param outputPath - Output video path
 */
export declare function applyBeatSyncCuts(videoPath: string, cutPoints: BeatCutPoint[], outputPath: string): Promise<void>;
/**
 * Add motion blur between cuts using FFmpeg frame blending.
 *
 * @param videoPath - Input video path
 * @param outputPath - Output video path
 * @param blurAmount - Blur amount (0-1, default 0.5)
 */
export declare function addMotionBlurBetweenCuts(videoPath: string, outputPath: string, blurAmount?: number): Promise<void>;
//# sourceMappingURL=beatSyncEditor.d.ts.map