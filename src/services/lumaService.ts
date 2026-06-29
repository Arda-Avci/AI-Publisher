/**
 * Luma AI Dream Machine API service.
 * Docs: https://docs.lumaai.com/
 */
import axios from 'axios';
import { Logger } from '../lib/logger.js';
import { IVideoAPIService, VideoGenOptions, VideoResult } from './apiVideoService.js';

const API_KEY = process.env.LUMA_API_KEY || '';
const BASE_URL = 'https://api.lumaai.com/v1';

export class LumaService implements IVideoAPIService {
  getModelType() { return 'Luma Dream Machine 1.6'; }

  isConfigured(): boolean { return !!API_KEY; }

  estimateCost(durationSec: number): number {
    const creditsPerSecond = Number(process.env.LUMA_CREDITS_PER_SECOND) || 10;
    const multiplier = Number(process.env.LUMA_COST_MULTIPLIER) || 1.5;
    return Math.ceil(durationSec * creditsPerSecond * multiplier);
  }

  async generate(opts: VideoGenOptions): Promise<VideoResult> {
    const { prompt, imageUrl, duration = 5 } = opts;

    const payload: Record<string, unknown> = {
      model: 'dream-machine-1.6',
      prompt,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      loop: false,
    };

    const createRes = await axios.post(`${BASE_URL}/videos/generate`, payload, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });

    const taskId: string = createRes.data.id;
    Logger.info(`[Luma] Task queued: ${taskId}`);

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
        throw new Error(`Luma task failed: ${task.error}`);
      }
      Logger.info(`[Luma] Poll ${taskId}: ${task.status}`);
    }
    throw new Error('Luma polling timed out');
  }
}

export default new LumaService();
