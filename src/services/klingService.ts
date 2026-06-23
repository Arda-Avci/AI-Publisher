/**
 * Kling AI video generation API service.
 * Docs: https://api.klingai.com/
 */
import axios from 'axios';
import { Logger } from '../lib/logger.js';
import { IVideoAPIService, VideoGenOptions, VideoResult } from './apiVideoService.js';

const API_KEY = process.env.KLING_API_KEY || '';
const BASE_URL = 'https://api.klingai.com/v1';

export class KlingService implements IVideoAPIService {
  getModelType() { return 'Kling AI 2.0'; }

  isConfigured(): boolean { return !!API_KEY; }

  estimateCost(durationSec: number): number {
    // ~$0.10/sec × ~150 credits/$ = 15 credits/sec × 1.5 markup
    return Math.ceil(durationSec * 15);
  }

  async generate(opts: VideoGenOptions): Promise<VideoResult> {
    const { prompt, imageUrl, duration = 5 } = opts;

    const payload: Record<string, unknown> = {
      model_version: 'kling-2.0',
      prompt,
      duration,
      aspect_ratio: '16:9',
    };
    if (imageUrl) payload.image_url = imageUrl;

    const createRes = await axios.post(`${BASE_URL}/videos/generate`, payload, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });

    const videoId: string = createRes.data.video_id;
    Logger.info(`[Kling] Video queued: ${videoId}`);

    return this.pollVideo(videoId, duration * 1000 + 120_000);
  }

  private async pollVideo(videoId: string, timeoutMs: number): Promise<VideoResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 8_000));

      const statusRes = await axios.get(`${BASE_URL}/videos/generate/${videoId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        timeout: 10_000,
      });

      const video = statusRes.data;
      if (video.status === 'completed') {
        return {
          videoUrl: video.video_url || video.output?.url || '',
          duration: video.duration || 5,
        };
      }
      if (video.status === 'failed') {
        throw new Error(`Kling video failed: ${video.error}`);
      }
      Logger.info(`[Kling] Poll ${videoId}: ${video.status}`);
    }
    throw new Error('Kling polling timed out');
  }
}

export default new KlingService();
