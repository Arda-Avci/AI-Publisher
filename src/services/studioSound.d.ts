/**
 * Studio Sound Enhancement Service
 *
 * Applies professional audio enhancement filters using FFmpeg:
 * - High-pass filter (removes low-frequency rumble below 200Hz)
 * - Low-pass filter (removes high-frequency hiss above 3000Hz)
 * - Adaptive denoise (afftdn filter for studio-quality clean audio)
 *
 * @module services/studioSound
 */
/**
 * Audio enhancement options.
 */
export interface StudioSoundOptions {
    /** Apply adaptive denoise filter (default: true) */
    denoise?: boolean;
    /** Apply audio equalization (default: false) */
    equalize?: boolean;
    /** Apply echo/reverb reduction (default: true) */
    deecho?: boolean;
    /** Output level in dB (default: -3) */
    levelDb?: number;
}
/**
 * Enhances audio quality of a video file using FFmpeg filters.
 *
 * Filter chain:
 *   highpass=f=200  - Removes frequencies below 200Hz (rumble, HVAC)
 *   lowpass=f=3000  - Removes frequencies above 3000Hz (hiss, tape noise)
 *   afftdn=nr=10:nf=-20 - Adaptive denoise (noise reduction level 10, floor -20dB)
 *   loudnorm        - EBU R128 loudness normalization
 *
 * @param inputVideo  - Absolute path to input video
 * @param outputVideo - Absolute path to output video
 * @param options     - Enhancement options
 */
export declare function enhanceAudio(inputVideo: string, outputVideo: string, options?: StudioSoundOptions): Promise<void>;
/**
 * Applies studio sound enhancement to a video file (processes both audio and video streams).
 * Video is pass-through, audio is enhanced.
 *
 * @param inputVideo  - Absolute path to input video
 * @param outputVideo - Absolute path to output video
 * @param options     - Enhancement options
 */
export declare function enhanceVideoAudio(inputVideo: string, outputVideo: string, options?: StudioSoundOptions): Promise<void>;
/**
 * Removes background noise from an audio file using FFmpeg afftdn filter.
 *
 * @param audioPath  - Absolute path to input audio/video file
 * @param outputPath - Absolute path for output audio file
 * @returns Path to the noise-reduced audio file
 */
export declare function removeBackgroundNoise(audioPath: string, outputPath: string): Promise<string>;
/**
 * Removes reverb/echo from an audio file using FFmpeg aecho filter.
 *
 * @param audioPath  - Absolute path to input audio/video file
 * @param outputPath - Absolute path for output audio file
 * @returns Path to the reverb-reduced audio file
 */
export declare function removeReverb(audioPath: string, outputPath: string): Promise<string>;
//# sourceMappingURL=studioSound.d.ts.map