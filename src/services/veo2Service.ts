/**
 * Google Veo 2 (Vertex AI) video generation service.
 * Docs: https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview
 */
import axios from 'axios';
import { Logger } from '../lib/logger.js';
import { IVideoAPIService, VideoGenOptions, VideoResult } from './apiVideoService.js';

const API_KEY = process.env.GOOGLE_VERTEX_API_KEY || '';
const LOCATION = process.env.GOOGLE_VEO_LOCATION || 'us-central1';
const PROJECT = process.env.GOOGLE_VEO_PROJECT || '';
const TIMEOUT_MS = parseInt(process.env.VEO_TIMEOUT_MS || '300000', 10);
const POLL_INTERVAL_MS = parseInt(process.env.VEO_POLL_INTERVAL || '5000', 10);

interface VertexAIResponse {
  name: string;
  done: boolean;
  response?: { predictions?: Array<{ gcsUri?: string }> };
  error?: { message: string };
}

export class Veo2Service implements IVideoAPIService {
  getModelType() { return 'Veo 2 (Vertex AI'; }

  isConfigured(): boolean { return !!(API_KEY && PROJECT); }

  estimateCost(durationSec: number): number {
    return Math.ceil(durationSec * 30);
  }

  async generate(opts: VideoGenOptions): Promise<VideoResult> {
    const { prompt, imageUrl, duration = 5, aspectRatio = '16:9' } = opts;

    const endpoint =
      `https://${LOCATION}-aiplatform.googleapis.com/v1` +
      `/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/veo-2:predict`;

    const instances: Record<string, unknown>[] = [{
      prompt,
      duration_seconds: duration,
      aspect_ratio: aspectRatio,
    }];
    if (imageUrl) {
      (instances[0] as Record<string, unknown>).image = { gcsUri: imageUrl };
    }

    const payload = { instances, parameters: { sample_count: 1 } };

    Logger.info('[Veo2] Starting generation', { prompt: prompt.substring(0, 80) });

    const opRes = await axios.post<VertexAIResponse>(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60_000,
    });

    const opName = opRes.data.name;
    if (!opRes.data.done) {
      return this.pollOperation(opName);
    }
    return this.extractResult(opRes.data);
  }

  private async pollOperation(opName: string): Promise<VideoResult> {
    const baseUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1`;
    const deadline = Date.now() + TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const statusRes = await axios.get<VertexAIResponse>(
        `${baseUrl}/${opName}`,
        { headers: { Authorization: `Bearer ${API_KEY}` }, timeout: 10_000 },
      );

      if (statusRes.data.done) {
        return this.extractResult(statusRes.data);
      }
      Logger.info(`[Veo2] Polling operation: ${opName}`);
    }

    throw new Error('Veo 2 operation timed out');
  }

  private extractResult(op: VertexAIResponse): VideoResult {
    const uri = op.response?.predictions?.[0]?.gcsUri;
    if (!uri) throw new Error('Veo 2 response missing video URI');
    return { videoUrl: uri, duration: 5 };
  }
}

export default new Veo2Service();
