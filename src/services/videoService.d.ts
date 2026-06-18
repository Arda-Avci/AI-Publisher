import type { BeatCutPoint } from './beatSyncEditor.js';
export interface FFmpegCommand {
    cmd: string;
    args: string[];
    timeoutMs?: number;
}
export interface WorkerResult {
    status: 'success' | 'error' | 'timeout';
    stdout?: string;
    stderr?: string;
    error?: string;
}
export declare function runInWorker<T = WorkerResult>(cmd: string, args: string[], timeoutMs?: number): Promise<T>;
export declare function runFFmpeg(cmd: string, args: string[], timeoutMs?: number): Promise<{
    stdout: string;
    stderr: string;
}>;
export declare function runFFmpegWithFallback(commands: FFmpegCommand[]): Promise<void>;
export declare function ensurePingSound(): Promise<string>;
export declare function addCalloutPings(videoPath: string, outputPath: string): Promise<void>;
export declare function generateEndScreenImage(avatarBase64: string | null, outPath: string, isVertical: boolean): Promise<void>;
export declare function applyEndScreen(videoPath: string, endScreenPath: string, outputPath: string, isVertical: boolean): Promise<void>;
export declare function getOrBuildEndScreen(userId: number, avatarBase64: string | null, isVertical: boolean): Promise<string>;
export declare function renderAvatarHelper(avatarBase64: string, outputPath: string): Promise<void>;
export declare function getGridCoordinates(position: string, videoWidth: number, videoHeight: number, overlayWidth: number, overlayHeight: number): {
    x: number;
    y: number;
};
export declare function extractReferenceFrame(videoPath: string): Promise<string>;
export declare function applyVideoDifferentiationFilters(inputPath: string, outputPath: string, isVertical: boolean): Promise<void>;
export declare function extractReferenceFrameAtTime(videoPath: string, timestampSeconds: number): Promise<string>;
export declare function extractLastFrame(videoPath: string): Promise<string>;
export declare function getVideoDuration(videoPath: string): Promise<number>;
export declare function concatVideosWithCrossfade(videoPaths: string[], outputPath: string, transDur?: number): Promise<void>;
export declare function applySmartAudioDucking(videoPath: string, speechAudioPath: string, bgMusicPath: string, outputPath: string): Promise<void>;
export declare function convertSrtToKineticAss(srtPath: string, assPath: string, primaryColor?: string, secondaryColor?: string, fontName?: string, animStyle?: 'bounce' | 'pulse' | 'shake' | 'pop' | 'wave', videoWidth?: number, videoHeight?: number): Promise<void>;
export declare function applyKineticSubtitles(videoPath: string, srtPath: string, outputPath: string, primaryColor?: string, secondaryColor?: string, fontPath?: string): Promise<void>;
export declare function applyBrandKit(videoPath: string, logoBase64: string, positionGrid: string, // örn: 'top_right', 'bottom_left'
outputPath: string): Promise<void>;
export declare function applySpatialAudioMix(videoPath: string, sfxPath: string, positionX: number, // -1 (tam sol) ile +1 (tam sağ) arası
outputPath: string): Promise<void>;
export declare function applyColorGradeFilter(inputPath: string, outputPath: string, presetName: string): Promise<void>;
export type { BeatCutPoint } from './beatSyncEditor.js';
/**
 * Apply beat-synced cuts to video using FFmpeg fps()/select() filters + crossfade at cut points.
 *
 * @param videoPath  - Input video path
 * @param beatCutPoints - Array of BeatCutPoint timestamps (in seconds)
 * @param outputPath - Output video path
 * @returns Promise<string> output path
 */
export declare function applyBeatSyncCuts(videoPath: string, beatCutPoints: BeatCutPoint[], outputPath: string): Promise<string>;
/**
 * Apply beat-sync cuts using FFmpeg fps/select filter approach for frame-exact cuts.
 * Preserves original audio and applies crossfade transitions at cut points.
 *
 * @param videoPath    - Input video path
 * @param cutTimestamps - Array of cut timestamps in seconds
 * @param outputPath   - Output video path
 */
export declare function applyBeatSyncCutsWithFilters(videoPath: string, cutTimestamps: number[], outputPath: string): Promise<string>;
//# sourceMappingURL=videoService.d.ts.map