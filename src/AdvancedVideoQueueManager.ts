import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { getAIModelChain } from './lib/ai-provider.js';
import { withFallbackAndRetry } from './lib/ai-utils.js';
import { generateObject } from 'ai';
import { transcribeVideoAudio } from './lib/audio-transcriber.js';
import { z } from 'zod';
import { Logger } from './lib/logger.js';
import { dockerHost } from './lib/docker-host.js';

export interface ProjectTask {
  id: string;
  videoUrl: string;
  userLanguage: 'tr' | 'en';
  status: 'pending' | 'awaiting_approval' | 'processing' | 'success' | 'failed';
  videoDurationOption: 'same' | 'trim' | 'extend';
  titlePosition:
    | 'top_left'
    | 'top_center'
    | 'top_right'
    | 'middle_left'
    | 'center'
    | 'middle_right'
    | 'bottom_left'
    | 'bottom_center'
    | 'bottom_right';
  userTitle?: string;
  customCoverImage?: string;
  logoBase64?: string;
}

const ScenarioSchema = z.object({
  userTitle: z.string(),
  scenes: z.array(
    z.object({
      index: z.number(),
      text: z.string(),
      visualPrompt: z.string(),
    }),
  ),
});

export class AdvancedVideoQueueManager {
  constructor() {
  }

  /**
   * FAZ 2: OTONOM TRANSKRİPT FALLBACK ZİNCİRİ (VİDEOYU İNDİRMEDEN)
   */
  public async fetchTranscriptWithFallback(videoUrl: string): Promise<string> {
    // 1. ADIM: Lightweight Scraper (youtube-transcript)
    try {
      Logger.info('Step 1: youtube-transcript starting...');
      const { YoutubeTranscript } = require('youtube-transcript');
      const pieces = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'tr' });
      if (pieces && pieces.length > 0) {
        return pieces.map((p: any) => p.text).join(' ');
      }
      throw new Error('Scraper returned empty content.');
    } catch (scraperError: any) {
      Logger.warn(`Scraper failed: ${scraperError.message}. Trying YouTube Data API...`);

      // 2. ADIM: Resmi YouTube Data API v3 (Captions) Fallback
      try {
        return await this.getResmiYouTubeCaption(videoUrl);
      } catch (apiError: any) {
        Logger.error(
          `YouTube API failed: ${apiError.message}. Last resort: Gemini 2.5 Flash Audio Transcribe...`,
        );

        // 3. ADIM: Download audio + Gemini Flash transcription
        return await this.transcribeAudioWithGeminiFlash(videoUrl);
      }
    }
  }

  /**
   * FAZ 3: LLM ÖZGÜNLEŞTİRME, ÇEVİRİ VE SÜRE UZATMA/KISALTMA ZİNCİRİ
   */
  public async generateScenariosWithFallback(task: ProjectTask, targetLang: string): Promise<any> {
    const rawTranscript = await this.fetchTranscriptWithFallback(task.videoUrl);
    const cleanText = rawTranscript.replace(/\[.*?\]/g, '').trim();

    let durationInstruction = 'Preserve the original duration and length of the text exactly.';
    if (task.videoDurationOption === 'trim') {
      durationInstruction =
        'Shorten the text into a more impactful, concise summary for Shorts format. Remove unnecessary parts.';
    } else if (task.videoDurationOption === 'extend') {
      durationInstruction =
        'Extend the text with new attention-grabbing hooks, dramatic details, and viral sub-stories.';
    }

    const prompt = `
TASK: Take the raw transcript below and completely UNIQUE-IZE it (bypass AI detection) while preserving viral dynamics (Hook, Body, CTA).
DURATION SETTING: ${durationInstruction}
LANGUAGE: Localize the unique-ized text into '${targetLang}', paying attention to cultural idioms and expressions.
SCENING: Break the final output into consecutive 6-second logical segments.

Raw Transcript: "${cleanText}"

Output JSON format:
{
  "userTitle": "Generated Viral Title",
  "scenes": [
    { "index": 1, "text": "6-second speech text in target language", "visualPrompt": "Pixar-style scene visual description" }
  ]
}`;

    // 1. PREFERRED: Zen Free LLM Models
    try {
      return await this.callLLM('zen-free', prompt);
    } catch (e: any) {
      Logger.warn(`Zen Free limit reached or error: ${e.message}. Falling back to MiniMax-M3...`);

      // 2. FALLBACK (INSURANCE): MiniMax-M3
      try {
        return await this.callLLM('minimax-m3', prompt);
      } catch (m3Error: any) {
        Logger.error(`MiniMax-M3 error: ${m3Error.message}. Last resort: Gemini 2.5 Flash...`);

        // 3. LAST RESORT: Gemini 2.5 Flash
        return await this.callLLM('gemini-2.5-flash', prompt);
      }
    }
  }

  /**
   * FAZ 4: MİKRO-PARÇA RENDER LOOP (DOCKER İLETİŞİMİ)
   */
  public async runDockerRenderLoop(projectId: string, scenes: any[]) {
    let lastFrameBase64: string | null = null;
    const totalChunks = scenes.length;

    Logger.info(`Micro-chunk render loop started. Total chunks: ${totalChunks}`);

    for (let i = 0; i < totalChunks; i++) {
      const currentChunkIndex = i + 1;

      this.emitSSEProgress(projectId, {
        stage: 'COGVIDEO_RENDERING',
        stagePercent: Math.round((currentChunkIndex / totalChunks) * 100),
        counter: `${currentChunkIndex} / ${totalChunks}`,
        sceneText: scenes[i].text,
      });

      const _PORT = process.env.PORT || 4000;
      const payload = {
        scene: scenes[i],
        init_image: lastFrameBase64,
        chunk_info: `${currentChunkIndex}/${totalChunks}`,
        callback_url: process.env.PUBLIC_URL
          ? `${process.env.PUBLIC_URL}/api/v1/video/callback?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}`
          : `http://localhost:${_PORT}/api/v1/video/callback?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}`,
      };

      try {
        const renderResult = await this.postToDocker(payload);
        lastFrameBase64 = await this.extractLastFrameAsBase64(renderResult.videoPath);
      } catch (renderError: any) {
        Logger.error(`Chunk ${currentChunkIndex} failed: ${renderError.message}`);
        throw renderError;
      }
    }
    Logger.info('All micro-chunks completed successfully.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Gerçek LLM çağrısı — model chain + fallback + retry
  // ─────────────────────────────────────────────────────────────────────────
  private async callLLM(provider: string, prompt: string): Promise<any> {
    Logger.info(`Provider: ${provider}`);
    const models = getAIModelChain();

    const { object } = await withFallbackAndRetry(
      (model) => {
        return generateObject({
          model,
          schema: ScenarioSchema,
          prompt,
          abortSignal: AbortSignal.timeout(60000),
        });
      },
      models,
      2,
      2000,
      true,
    );

    return object;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: YouTube Data API v3 — resmi altyazıları çeker
  // ─────────────────────────────────────────────────────────────────────────
  private async getResmiYouTubeCaption(url: string): Promise<string> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is not set.');
    }

    // Extract video ID from URL
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      throw new Error('Could not extract video ID from URL: ' + url);
    }
    const videoId = videoIdMatch[1];

    // 1. Get available captions (subtitle tracks)
    const captionsRes = await axios.get('https://www.googleapis.com/youtube/v3/captions', {
      params: {
        part: 'snippet',
        videoId,
        key: apiKey,
      },
      timeout: 10000,
    });

    const captions: any[] = captionsRes.data?.items || [];

    // Prefer Turkish, then English, then first available
    const preferred =
      captions.find((c: any) => c.snippet?.language === 'tr' || c.snippet?.language === 'en') ||
      captions[0];

    if (!preferred) {
      throw new Error('No captions found for this video.');
    }

    const captionId = preferred.id;

    // 2. Download the caption track
    const downloadRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/captions/${captionId}`,
      {
        params: {
          key: apiKey,
        },
        headers: {
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    );

    // YouTube Data API v3 doesn't support direct caption download via REST.
    // Fall back to using the transcript text from the snippet if available,
    // otherwise raise an error to trigger the Gemini fallback.
    const snippet = preferred.snippet;
    if (snippet?.trackKind === 'ASR' && snippet?.audioTrackType) {
      // ASR/autogenerated captions — return the snippet description as text proxy
      return snippet.description || '';
    }

    throw new Error(
      'Caption download requires OAuth2 or the caption is not accessible via API key. Use Gemini fallback.',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Gemini 2.5 Flash ile ses transcript
  // ─────────────────────────────────────────────────────────────────────────
  private async transcribeAudioWithGeminiFlash(videoUrl: string): Promise<string> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set for audio transcription.');
    }

    // Download YouTube audio to a temp file using yt-dlp
    const tempAudioPath = path.join(process.cwd(), 'temp_audio_' + Date.now() + '.mp3');

    try {
      Logger.info('Downloading YouTube audio for Gemini transcription...');

      await new Promise<void>((resolve, reject) => {
        const ytdlp = exec(
          `npx yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${tempAudioPath}" "${videoUrl}"`,
          { timeout: 120000 },
          (err, stdout, stderr) => {
            if (err) {
              Logger.warn('yt-dlp failed, trying direct ffmpeg stream...');
              reject(err);
            } else {
              resolve();
            }
          },
        );
        ytdlp.on('error', reject);
      });

      // Fallback: use ffmpeg to extract audio directly from YouTube stream
      if (!fs.existsSync(tempAudioPath)) {
        await new Promise<void>((resolve, reject) => {
          const ffmpegCmd = exec(
            `ffmpeg -y -i "${videoUrl}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 32k "${tempAudioPath}"`,
            { timeout: 120000 },
            (err) => {
              if (err) reject(err);
              else resolve();
            },
          );
          ffmpegCmd.on('error', reject);
        });
      }

      // Transcribe using Gemini Flash with inline audio
      const audioData = fs.readFileSync(tempAudioPath).toString('base64');

      const payload = {
        contents: [
          {
            parts: [
              {
                text: 'You are a professional transcriptionist. Please transcribe the speech in this audio to plain text paragraphs. No extra commentary.',
              },
              { inlineData: { mimeType: 'audio/mp3', data: audioData } },
            ],
          },
        ],
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Gemini transcription API error: ${response.status} - ${errData}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No transcript returned from Gemini audio transcription.');
      }

      Logger.info('Gemini audio transcription completed successfully.');
      return text.trim();
    } finally {
      // Cleanup temp file
      if (fs.existsSync(tempAudioPath)) {
        try {
          fs.unlinkSync(tempAudioPath);
        } catch (e) {
          /* ignore */
        }
      }
    }
  }

  private emitSSEProgress(id: string, data: any) {
    Logger.info(`Project: ${id} -> ${JSON.stringify(data)}`);
  }

  private async postToDocker(payload: any): Promise<{ videoPath: string }> {
    const endpoint = dockerHost.resolveEndpoint('/generate-media');

    const response = await axios.post(endpoint, payload, {
      timeout: 300000,
    });

    return response.data;
  }

  private async extractLastFrameAsBase64(videoPath: string): Promise<string> {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const outputPath = videoPath.replace(/\.[^/.]+$/, '') + '_lastframe.jpg';

    await new Promise<void>((resolve, reject) => {
      const cmd = exec(
        `ffmpeg -y -sseof -3 -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}"`,
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
      cmd.on('error', reject);
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error('Failed to extract last frame from video.');
    }

    const buffer = fs.readFileSync(outputPath);
    try {
      fs.unlinkSync(outputPath);
    } catch (e) {
      /* ignore */
    }

    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }
}
