/**
 * Beat Analyzer Service
 * Analyzes audio BPM and beat peaks for beat-synced video editing
 */
export interface BeatMarker {
    timestamp: number;
    strength: number;
    beatNumber: number;
    bar: number;
}
export interface BeatAnalysisResult {
    bpm: number;
    beats: BeatMarker[];
    duration: number;
}
/**
 * Detect BPM from audio file using FFmpeg's astats filter
 * This is a simplified BPM detection that uses audio peak analysis
 */
export declare function detectBPM(audioPath: string): Promise<number>;
/**
 * Find beat peaks in audio file based on detected BPM
 * Generates beat markers at each beat position
 */
export declare function findBeatPeaks(audioPath: string, bpm: number): Promise<BeatMarker[]>;
/**
 * Build complete beat markers analysis result
 * This is the main entry point for beat analysis
 */
export declare function buildBeatMarkers(audioPath: string): Promise<BeatAnalysisResult>;
/**
 * Get BPM of audio file using Python librosa subprocess.
 *
 * @param audioPath - Path to audio file
 * @returns BPM value
 */
export declare function getBpm(audioPath: string): Promise<number>;
/**
 * Get energy peaks from audio file.
 *
 * @param audioPath - Path to audio file
 * @param threshold - Minimum energy threshold (0-1), default 0.3
 * @returns Array of peak timestamps in seconds
 */
export declare function getEnergyPeaks(audioPath: string, threshold?: number): Promise<number[]>;
/**
 * Synchronize cuts to beats — main orchestrator for beat-synced editing.
 *
 * Analyzes the audio to find beat positions, then cuts the video at those positions.
 *
 * @param videoPath - Path to video file
 * @param audioPath - Path to audio file (if different from video)
 * @param outputPath - Output path for beat-synced video
 * @param options - Optional beat sync options
 * @returns BeatAnalysisResult with BPM and cut points
 */
export declare function syncCutsToBeats(videoPath: string, audioPath: string, outputPath: string, options?: {
    crossfadeDur?: number;
    minSegmentDur?: number;
    alignToBeats?: boolean;
}): Promise<BeatAnalysisResult>;
//# sourceMappingURL=beatAnalyzer.d.ts.map