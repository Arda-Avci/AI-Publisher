/**
 * PixVerse API service.
 */
import axios from 'axios';
import { Logger } from '../lib/logger.js';
import { IVideoAPIService, VideoGenOptions, VideoResult } from './apiVideoService.js';

const API_KEY = process.env.PIXVERSE_API_KEY || '';
const BASE_URL = 'https://api.pixverse.ai/v1';

export class PixVerseService implements IVideoAPIService {
  getModelType() { return 'PixVerse v3'; }

  isConfigured(): boolean { return !!API_KEY; }

  estimateCost(durationSec: number): number {
    return Math.ceil(durationSec * 10);  // conservative
  }

  async generate(opts: VideoGenOptions): Promise<VideoResult> {
    const { prompt, imageUrl, duration = 5 } = opts;

    const payload: Record<string, unknown> = {
      model: 'pixverse-v3',
      prompt,
      ...(imageUrl ? { init_image: imageUrl } : {}),
      duration,
    };

    const createRes = await axios.post(`${BASE_URL}/videos/generate`, payload, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });

    const taskId: string = createRes.data.id;
    Logger.info(`[PixVerse] Task queued: ${taskId}`);

    return this.pollTask(taskId, duration * 1000 + 120_000);
  }

  private async pollTask(taskId: string, timeoutMs: number): Promise<VideoResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 6_000));

      const statusRes = await axios.get(`${BASE_URL}/videos/generate/${taskId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        timeout: 10_000,
      });

      const task = statusRes.data;
      if (task.status === 'completed') {
        return {
          videoUrl: task.video_url || task.output?.url || '',
          duration: task.duration || 5,
        };
      }
      if (task.status === 'failed') {
        throw new Error(`PixVerse task failed: ${task.error}`);
      }
      Logger.info(`[PixVerse] Poll ${taskId}: ${task.status}`);
    }
    throw new Error('PixVerse polling timed out');
  }
}

export default new PixVerseService();
