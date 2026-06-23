/**
 * Pika Labs video generation API service.
 * Docs: https://api.pika.art/
 */
import axios from 'axios';
import { Logger } from '../lib/logger.js';
import { IVideoAPIService, VideoGenOptions, VideoResult } from './apiVideoService.js';

const API_KEY = process.env.PIKA_API_KEY || '';
const BASE_URL = 'https://api.pika.art/v1';

export class PikaService implements IVideoAPIService {
  getModelType() { return 'Pika 2.5'; }

  isConfigured(): boolean { return !!API_KEY; }

  estimateCost(durationSec: number): number {
    // ~4.8 credits/sec × 1.5 markup
    return Math.ceil(durationSec * 7);
  }

  async generate(opts: VideoGenOptions): Promise<VideoResult> {
    const { prompt, imageUrl, duration = 5 } = opts;

    const payload: Record<string, unknown> = {
      model: 'pika-2.5',
      prompt,
      duration,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    };

    const createRes = await axios.post(`${BASE_URL}/videos/generate`, payload, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });

    const taskId: string = createRes.data.id;
    Logger.info(`[Pika] Task queued: ${taskId}`);

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
      if (task.status === 'succeeded' || task.status === 'completed') {
        return {
          videoUrl: task.video_url || task.output?.video_url || '',
          duration: task.duration || 5,
        };
      }
      if (task.status === 'failed') {
        throw new Error(`Pika task failed: ${task.error}`);
      }
      Logger.info(`[Pika] Poll ${taskId}: ${task.status}`);
    }
    throw new Error('Pika polling timed out');
  }
}

export default new PikaService();
