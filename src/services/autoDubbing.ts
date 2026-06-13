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

import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { runFFmpeg, runFFmpegWithFallback, getVideoDuration } from './videoService.js';
import { transcribeVideoAudioWithTimestamps, TranscriptionSegment } from '../lib/audio-transcriber.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { getAIModelChain } from '../lib/ai-provider.js';
import { generateObject } from 'ai';
import { z } from 'zod';
import { colab } from '../lib/colab-manager.js';
import { Logger } from '../lib/logger.js';

export interface DubbingOptions {
  sourceLang?: string;       // Default 'tr'
  targetLang: string;       // e.g., 'en', 'es', 'fr', 'ar'
  voice?: string;           // XTTS voice name
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
export async function transcribeWithWhisper(
  videoPath: string,
  targetLang: string
): Promise<TranscriptionSegment[]> {
  const result = await transcribeVideoAudioWithTimestamps(videoPath, targetLang);
  return result.segments;
}

/**
 * Translate transcript text using AI service (Gemini/Zen fallback chain).
 *
 * @param text - Source transcript text
 * @param sourceLang - Source language code
 * @param targetLang - Target language code
 * @returns Translated text
 */
export async function translateTranscript(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const langNames: Record<string, string> = {
    tr: 'Turkish', en: 'English', es: 'Spanish', fr: 'French',
    de: 'German', ar: 'Arabic', ja: 'Japanese', ko: 'Korean',
    pt: 'Portuguese', it: 'Italian', ru: 'Russian', zh: 'Chinese'
  };

  const sourceName = langNames[sourceLang] || sourceLang;
  const targetName = langNames[targetLang] || targetLang;

  const TranslateSchema = z.object({
    translatedText: z.string()
  });

  const models = getAIModelChain();
  const result = await withFallbackAndRetry((model) => {
    return generateObject({
      model,
      schema: TranslateSchema,
      abortSignal: AbortSignal.timeout(60000),
      prompt: `Translate the following ${sourceName} text to ${targetName}.
Only provide the translation, nothing else.
Text: ${text}`
    });
  }, models, 2, 2000, true);

  return result.object.translatedText;
}

/**
 * Synthesize dubbed audio using Colab XTTS-v2 endpoint.
 *
 * @param text - Text to synthesize
 * @param voice - XTTS voice name
 * @param outputPath - Output audio path
 * @param targetLang - Language code
 */
export async function synthesizeDubbingAudio(
  text: string,
  voice: string,
  outputPath: string,
  targetLang: string
): Promise<void> {
  const colabUrl = process.env.COLAB_URL;
  if (!colabUrl || colabUrl === 'https://ngrok-free.app') {
    throw new Error('Colab sunucusu aktif değil. XTTS sesi sentezlenemez.');
  }

  try {
    const response = await axios.post(`${colabUrl}/generate-media`, {
      mode: 'xtts',
      text,
      voice,
      language: targetLang,
      job_id: `dubbing_${Date.now()}`
    }, { timeout: 300000 });

    if (response.data?.task_id) {
      // Poll for completion
      const taskId = response.data.task_id;
      let status = 'processing';
      while (status === 'processing' || status === 'accepted') {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await axios.get(`${colabUrl}/status/${taskId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          timeout: 10000
        });
        status = statusRes.data?.status || 'processing';
        if (status === 'success' || status === 'error') break;
      }

      if (status === 'success') {
        // Download the generated audio
        const audioRes = await axios({
          method: 'GET',
          url: `${colabUrl}/download/speech`,
          responseType: 'stream',
          timeout: 120000
        });
        const writer = fs.createWriteStream(outputPath);
        audioRes.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        return;
      }
    }

    throw new Error(`XTTS synthesis failed: ${response.data?.message || 'Unknown error'}`);
  } catch (err: any) {
    Logger.error('[autoDubbing] XTTS synthesis error', err);
    throw err;
  }
}

/**
 * Stretch audio to target duration using FFmpeg rubberband filter.
 *
 * @param audioPath - Source audio path
 * @param targetDuration - Target duration in seconds
 * @param outputPath - Output audio path
 */
export async function stretchAudioToDuration(
  audioPath: string,
  targetDuration: number,
  outputPath: string
): Promise<void> {
  const { stdout: durStr } = await runFFmpeg('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioPath
  ]);
  const currentDuration = parseFloat(durStr.trim()) || 1;

  if (Math.abs(currentDuration - targetDuration) < 0.1) {
    await fs.copy(audioPath, outputPath);
    return;
  }

  // Use FFmpeg rubberband filter (pitch-preserving time stretch)
  // Supports 0.25x–4.0x range unlike atempo which changes pitch
  const tempoRatio = Math.max(0.25, Math.min(4.0, currentDuration / targetDuration));
  const filter = `rubberband=tempo=${tempoRatio.toFixed(3)}`;

  await runFFmpeg('ffmpeg', [
    '-y',
    '-i', audioPath,
    '-af', filter,
    '-c:a', 'pcm_s16le',
    outputPath
  ]);

  Logger.info('[autoDubbing] Audio stretched (pitch-preserving rubberband)', {
    originalDuration: currentDuration,
    targetDuration,
    outputPath
  });
}

/**
 * Replace audio track in video with new dubbed audio.
 *
 * @param videoPath - Source video path
 * @param newAudioPath - New dubbed audio path
 * @param outputPath - Output video path
 */
export async function replaceAudioTrack(
  videoPath: string,
  newAudioPath: string,
  outputPath: string
): Promise<void> {
  const args = [
    '-y',
    '-i', videoPath,
    '-i', newAudioPath,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outputPath
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info('[autoDubbing] Audio track replaced', { outputPath });
}

/**
 * Apply lip-sync to video using Colab Wav2Lip endpoint.
 *
 * @param videoPath - Source video path
 * @param dubAudioPath - Dubbed audio path
 * @param outputPath - Output video path
 */
export async function lipSyncDubbing(
  videoPath: string,
  dubAudioPath: string,
  outputPath: string
): Promise<void> {
  const colabUrl = process.env.COLAB_URL;
  if (!colabUrl || colabUrl === 'https://ngrok-free.app') {
    throw new Error('Colab sunucusu aktif değil. Lip-sync uygulanamaz.');
  }

  try {
    // Upload video and audio to Colab
    const videoBuffer = await fs.readFile(videoPath);
    const audioBuffer = await fs.readFile(dubAudioPath);

    const formData = new FormData();
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('video', videoBlob, path.basename(videoPath));
    formData.append('audio', audioBlob, path.basename(dubAudioPath));

    const response = await axios.post(`${colabUrl}/lip-sync`, formData, {
      headers: {
        'ngrok-skip-browser-warning': 'any-value',
        'bypass-tunnel-reminder': 'true'
      },
      timeout: 600000
    });

    if (response.data?.task_id) {
      const taskId = response.data.task_id;
      let status = 'processing';
      while (status === 'processing' || status === 'accepted') {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await axios.get(`${colabUrl}/status/${taskId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          timeout: 10000
        });
        status = statusRes.data?.status || 'processing';
        if (status === 'success' || status === 'error') break;
      }

      if (status === 'success') {
        // Download lip-synced video
        const videoRes = await axios({
          method: 'GET',
          url: `${colabUrl}/download/video`,
          responseType: 'stream',
          timeout: 300000
        });
        const writer = fs.createWriteStream(outputPath);
        videoRes.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        return;
      }
    }

    throw new Error(`Lip-sync failed: ${response.data?.message || 'Unknown error'}`);
  } catch (err: any) {
    Logger.error('[autoDubbing] Lip-sync error', err);
    throw err;
  }
}

/**
 * Main auto-dubbing orchestrator.
 *
 * @param videoPath - Source video path
 * @param options - Dubbing options (targetLang, voice, etc.)
 * @returns DubbingResult with output path and statistics
 */
export async function autoDub(
  videoPath: string,
  options: DubbingOptions
): Promise<DubbingResult> {
  const {
    sourceLang = 'tr',
    targetLang,
    voice = 'Claribel Dervla',
    outputPath
  } = options;

  Logger.info('[autoDubbing] Starting dubbing pipeline', { videoPath, sourceLang, targetLang, voice });

  const originalDuration = await getVideoDuration(videoPath);

  // Step 1: Transcribe with Whisper
  Logger.info('[autoDubbing] Step 1: Transcribing...');
  const segments = await transcribeWithWhisper(videoPath, sourceLang);
  const transcript = segments.map(s => s.text).join(' ');
  Logger.info(`[autoDubbing] Transcript length: ${transcript.length} chars`);

  // Step 2: Translate
  Logger.info('[autoDubbing] Step 2: Translating...');
  const translatedText = await translateTranscript(transcript, sourceLang, targetLang);
  Logger.info(`[autoDubbing] Translated text length: ${translatedText.length} chars`);

  // Step 3: Synthesize dubbed audio
  const tempAudioDir = path.join(process.cwd(), 'videolar', `dubbing_${Date.now()}`);
  await fs.ensureDir(tempAudioDir);
  const rawAudioPath = path.join(tempAudioDir, 'raw_audio.wav');

  try {
    Logger.info('[autoDubbing] Step 3: Synthesizing audio with XTTS...');
    await synthesizeDubbingAudio(translatedText, voice, rawAudioPath, targetLang);

    // Step 4: Stretch audio to match original duration
    const stretchedAudioPath = path.join(tempAudioDir, 'stretched_audio.wav');
    Logger.info('[autoDubbing] Step 4: Stretching audio to match original duration...');
    await stretchAudioToDuration(rawAudioPath, originalDuration, stretchedAudioPath);

    // Step 5: Replace audio track
    Logger.info('[autoDubbing] Step 5: Replacing audio track...');
    const videoWithAudioPath = path.join(tempAudioDir, 'video_with_audio.mp4');
    await replaceAudioTrack(videoPath, stretchedAudioPath, videoWithAudioPath);

    // Step 6: Lip-sync (optional, try Colab endpoint)
    let lipSyncApplied = false;
    let finalOutputPath = videoWithAudioPath;

    try {
      if (colab.isHealthy()) {
        Logger.info('[autoDubbing] Step 6: Applying lip-sync...');
        const lipSyncedPath = path.join(tempAudioDir, 'lipsynced_video.mp4');
        await lipSyncDubbing(videoWithAudioPath, stretchedAudioPath, lipSyncedPath);
        finalOutputPath = lipSyncedPath;
        lipSyncApplied = true;
      }
    } catch (lipErr) {
      Logger.warn('[autoDubbing] Lip-sync not available, using video without lip-sync', lipErr);
    }

    // Copy final result to output path
    await fs.copy(finalOutputPath, outputPath);

    const dubbedDuration = await getVideoDuration(outputPath);

    Logger.info('[autoDubbing] Dubbing complete', {
      outputPath,
      originalDuration,
      dubbedDuration,
      lipSyncApplied
    });

    return {
      outputPath,
      originalDuration,
      dubbedDuration,
      transcript,
      translatedText,
      lipSyncApplied
    };
  } finally {
    await fs.remove(tempAudioDir);
  }
}
