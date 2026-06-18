/**
 * Subtitle Mixer Service
 * Embeds subtitles and mixes background music with optional audio ducking
 *
 * @example
 * const result = await subtitleMixer.embedSubtitles(videoPath, srtPath, outputPath);
 * await subtitleMixer.mixBackgroundMusic(videoPath, musicPath, outputPath, 0.15);
 * await subtitleMixer.applyAudioDuck(musicPath, voicePath, outputPath);
 * await subtitleMixer.generateSrtFromWhisper(transcript, outputPath);
 */
import type { WhisperWord, SubtitleStyleOptions, SubtitleMixerOptions, SubtitleMixerResult } from '../../types/clipper.js';
/**
 * Embed SRT subtitles into a video using FFmpeg subtitles filter.
 * Supports styled subtitles via ASS format conversion.
 *
 * @param videoPath - Source video path
 * @param srtPath - SRT subtitle file path
 * @param outputPath - Destination video path
 * @param styleOptions - Optional subtitle styling
 */
export declare function embedSubtitles(videoPath: string, srtPath: string, outputPath: string, styleOptions?: SubtitleStyleOptions): Promise<void>;
/**
 * Mix background music into video, looping the music to match video duration.
 *
 * @param videoPath - Source video path
 * @param musicPath - Background music file path
 * @param outputPath - Destination video path
 * @param musicVolume - Music volume (0.0-1.0, default 0.15)
 */
export declare function mixBackgroundMusic(videoPath: string, musicPath: string, outputPath: string, musicVolume?: number): Promise<void>;
/**
 * Apply audio ducking: lower background music volume when speech is present.
 * Uses FFmpeg's sidechaincompress filter for voice-activated ducking.
 *
 * @param musicPath - Background music path
 * @param voicePath - Speech/voice audio path
 * @param outputPath - Destination audio path
 * @param threshold - Threshold in dB (default -20)
 * @param attack - Attack time in seconds (default 0.3)
 * @param release - Release time in seconds (default 0.8)
 */
export declare function applyAudioDuck(musicPath: string, voicePath: string, outputPath: string, threshold?: number, attack?: number, release?: number): Promise<void>;
/**
 * Generate an SRT file from Whisper word-level transcript.
 * Performs word-level timing estimation by splitting segment duration evenly.
 *
 * @param transcript - Whisper transcript object with word-level segments
 * @param outputPath - Destination SRT file path
 * @param maxCharsPerLine - Maximum characters per subtitle line (default 42)
 */
export declare function generateSrtFromWhisper(transcript: {
    text: string;
    segments: Array<{
        start: number;
        end: number;
        text: string;
        words?: WhisperWord[];
    }>;
}, outputPath: string, maxCharsPerLine?: number): Promise<string>;
export declare class SubtitleMixer {
    /**
     * Process a video with subtitles and optional background music.
     *
     * @param videoPath - Source video path
     * @param options - Mixer options
     * @returns Mixer result with output paths and flags
     */
    process(videoPath: string, options: SubtitleMixerOptions): Promise<SubtitleMixerResult>;
    /**
     * Generate an SRT file from Whisper transcript.
     * Alias for the standalone generateSrtFromWhisper function.
     */
    generateSrtFromWhisper(transcript: {
        text: string;
        segments: Array<{
            start: number;
            end: number;
            text: string;
            words?: WhisperWord[];
        }>;
    }, outputPath: string, maxCharsPerLine?: number): Promise<string>;
}
export declare const subtitleMixer: SubtitleMixer;
//# sourceMappingURL=subtitleMixer.d.ts.map