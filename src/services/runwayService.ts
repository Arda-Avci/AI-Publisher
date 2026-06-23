/**
 * Runway Gen-4.5 Turbo API service.
 * Docs: https://dev.runwayml.com/
 */
import axios from 'axios';
import { Logger } from '../lib/logger.js';
import { IVideoAPIService, VideoGenOptions, VideoResult } from './apiVideoService.js';

const API_KEY = process.env.RUNWAY_API_KEY || '';
const BASE_URL = 'https://api.runwayml.com/v1';

export class RunwayService implements IVideoAPIService {
  getModelType() { return 'Runway Gen-4.5 Turbo'; }

  isConfigured(): boolean { return !!API_KEY; }

  estimateCost(durationSec: number): number {
    // ~6 credits/sec at Standard plan → ×1.5 markup → 9 credits/sec
    return Math.ceil(durationSec * 9);
  }

  async generate(opts: VideoGenOptions): Promise<VideoResult> {
    const { prompt, imageUrl, duration = 5 } = opts;

    // Create task
    const createRes = await axios.post(
      `${BASE_URL}/tasks`,
      {
        model: 'gen4-5-turbo',
        prompt,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        duration,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      },
    );

    const taskId: string = createRes.data.id;
    Logger.info(`[Runway] Task created: ${taskId}`);

    // Poll until done
    const result = await this.pollTask(taskId, duration * 1000 + 60_000);
    return result;
  }

  private async pollTask(taskId: string, timeoutMs: number): Promise<VideoResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5_000));

      const statusRes = await axios.get(`${BASE_URL}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        timeout: 10_000,
      });

      const task = statusRes.data;
      const status = task.status;

      if (status === 'succeeded') {
        return {
          videoUrl: task.output?.video_url || task.output?.predictions?.[0]?.url || '',
          duration: task.duration || 5,
        };
      }
      if (status === 'failed') {
        throw new Error(`Runway task failed: ${task.error}`);
      }
      Logger.info(`[Runway] Poll ${taskId}: ${status}`);
    }
    throw new Error('Runway polling timed out');
  }
}

export default new RunwayService();
