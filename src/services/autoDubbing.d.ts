/**

 * Auto-Dubbing Service — Multilingual dubbing using Whisper + XTTS-v2.

 *

 * Pipeline:

 *   1. Transcribe video audio with Whisper (word-level timestamps)

 *   2. Translate transcript text (Gemini/Zen fallback chain)

 *   3. Synthesize dubbed audio with XTTS-v2 (Colab endpoint)

 *   4. Stretch audio to match original duration (rubberband)

 *   5. Replace audio track in video

 *   6. Optional lip-sync with Wav2Lip (Colab endpoint)

 *

 * @module services/autoDubbing

 */
import { TranscriptionSegment } from '../lib/audio-transcriber.js';
export interface DubbingOptions {
    sourceLang?: string;
    targetLang: string;
    voice?: string;
    outputPath: string;
}
export interface DubbingResult {
    outputPath: string;
    originalDuration: number;
    dubbedDuration: number;
    transcript: string;
    translatedText: string;
    lipSyncApplied: boolean;
}
/**

 * Transcribe video audio with Whisper using existing audio-transcriber.

 *

 * @param videoPath - Path to video file

 * @param targetLang - Language code for transcription

 * @returns TranscriptionSegment[] with word-level timestamps

 */
export declare function transcribeWithWhisper(videoPath: string, targetLang: string): Promise<TranscriptionSegment[]>;
/**

 * Translate transcript text using AI service (Gemini/Zen fallback chain).

 *

 * @param text - Source transcript text

 * @param sourceLang - Source language code

 * @param targetLang - Target language code

 * @returns Translated text

 */
export declare function translateTranscript(text: string, sourceLang: string, targetLang: string): Promise<string>;
/**

 * Synthesize dubbed audio using Colab XTTS-v2 endpoint.

 *

 * @param text - Text to synthesize

 * @param voice - XTTS voice name

 * @param outputPath - Output audio path

 * @param targetLang - Language code

 */
export declare function synthesizeDubbingAudio(text: string, voice: string, outputPath: string, targetLang: string): Promise<void>;
/**

 * Stretch audio to target duration using FFmpeg rubberband filter.

 *

 * @param audioPath - Source audio path

 * @param targetDuration - Target duration in seconds

 * @param outputPath - Output audio path

 */
export declare function stretchAudioToDuration(audioPath: string, targetDuration: number, outputPath: string): Promise<void>;
/**

 * Replace audio track in video with new dubbed audio.

 *

 * @param videoPath - Source video path

 * @param newAudioPath - New dubbed audio path

 * @param outputPath - Output video path

 */
export declare function replaceAudioTrack(videoPath: string, newAudioPath: string, outputPath: string): Promise<void>;
/**

 * Apply lip-sync to video using Colab Wav2Lip endpoint.

 *

 * @param videoPath - Source video path

 * @param dubAudioPath - Dubbed audio path

 * @param outputPath - Output video path

 */
export declare function lipSyncDubbing(videoPath: string, dubAudioPath: string, outputPath: string): Promise<void>;
/**

 * Main auto-dubbing orchestrator.

 *

 * @param videoPath - Source video path

 * @param options - Dubbing options (targetLang, voice, etc.)

 * @returns DubbingResult with output path and statistics

 */
export declare function autoDub(videoPath: string, options: DubbingOptions): Promise<DubbingResult>;
//# sourceMappingURL=autoDubbing.d.ts.map