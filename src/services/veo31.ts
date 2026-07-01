import axios from 'axios';
import { Logger } from '../lib/logger.js';
import { TIMEOUT } from '../constants.js';

export interface Veo31Input {
  imageUrl: string;
  prompt: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface Veo31Result {
  videoUrl: string;
  gcsUri: string;
  duration: number;
}

interface Veo31Operation {
  name: string;
  done: boolean;
  response?: {
    predictions?: Array<{
      gcsUri?: string;
      videoUrl?: string;
    }>;
  };
  error?: { message: string };
}

const VEO_API_KEY = process.env.GOOGLE_VEO_API_KEY || '';
const VEO_LOCATION = process.env.GOOGLE_VEO_LOCATION || 'us-central1';
const VEO_PROJECT = process.env.GOOGLE_VEO_PROJECT || '';
const VEO_TIMEOUT_MS = parseInt(process.env.VEO_TIMEOUT_MS || '300000', 10);
const VEO_POLL_INTERVAL = parseInt(process.env.VEO_POLL_INTERVAL || '5000', 10);

export async function generateVideo(input: Veo31Input): Promise<Veo31Result> {
  if (!VEO_API_KEY) {
    throw new Error('GOOGLE_VEO_API_KEY not set');
  }

  const baseUrl = `https://${VEO_LOCATION}-aiplatform.googleapis.com/v1`;
  const endpoint = `${baseUrl}/projects/${VEO_PROJECT}/locations/${VEO_LOCATION}/publishers/google/models/veo-3.1:predict`;

  Logger.info('[Veo31] Generating video', { prompt: input.prompt.substring(0, 100) });

  const payload = {
    instances: [
      {
        image: { gcsUri: input.imageUrl },
        prompt: input.prompt,
        ...(input.duration ? { durationSeconds: input.duration } : {}),
        ...(input.aspectRatio ? { aspectRatio: input.aspectRatio } : {}),
      },
    ],
    parameters: {
      sampleCount: 1,
    },
  };

  const response = await axios.post<Veo31Operation>(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${VEO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: TIMEOUT.AI_FAST,
  });

  const operation = response.data;
  const operationName = operation.name;
  if (!operationName) {
    throw new Error('Veo31: No operation name returned');
  }

  const result = await pollOperation(operationName);
  return result;
}

async function pollOperation(operationName: string): Promise<Veo31Result> {
  const startTime = Date.now();
  const baseUrl = `https://${VEO_LOCATION}-aiplatform.googleapis.com/v1`;

  while (Date.now() - startTime < VEO_TIMEOUT_MS) {
    const opResponse = await axios.get<Veo31Operation>(`${baseUrl}/${operationName}`, {
      headers: { Authorization: `Bearer ${VEO_API_KEY}` },
      timeout: TIMEOUT.API_FETCH,
    });

    const op = opResponse.data;
    if (op.error) {
      throw new Error(`Veo31: ${op.error.message}`);
    }
    if (op.done && op.response?.predictions?.[0]) {
      const pred = op.response.predictions[0];
      const videoUrl = pred.videoUrl || pred.gcsUri || '';
      if (!videoUrl) {
        throw new Error('Veo31: No video URL in response');
      }
      Logger.info('[Veo31] Video generated', { videoUrl });
      return { videoUrl, gcsUri: pred.gcsUri || videoUrl, duration: 5 };
    }

    await sleep(VEO_POLL_INTERVAL);
  }

  throw new Error('Veo31: Video generation timed out');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
