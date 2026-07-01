import { Logger } from '../lib/logger.js';
import { env } from '../env.js';
import { MODAL } from '../constants.js';

const MODAL_TOKEN_ID = env.MODAL_TOKEN_ID;
const MODAL_TOKEN_SECRET = env.MODAL_TOKEN_SECRET;

export interface ModalJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result?: any;
  error?: string;
}

export interface ModalJobStatus {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result?: any;
  error?: string;
}

const MODEL_TO_MODAL: Record<string, { app: string; fn: string }> = {
  'Wan2.1': { app: 'ai-publisher-wan', fn: 'generate' },
  'Wan2.5': { app: 'ai-publisher-wan25', fn: 'generate' },
  'CogVideoX-5b': { app: 'ai-publisher-cogvideox', fn: 'generate' },
  'CogVideoX-2b': { app: 'ai-publisher-cogvideox', fn: 'generate' },
  'HunyuanVideo': { app: 'ai-publisher-hunyuan', fn: 'generate' },
  'LTX-Video': { app: 'ai-publisher-ltx', fn: 'generate' },
  'Mochi-1': { app: 'ai-publisher-mochi', fn: 'generate' },
  'AnimateDiff': { app: 'ai-publisher-animatediff', fn: 'generate' },
  'DynamiCrafter': { app: 'ai-publisher-dynamicrafter', fn: 'generate' },
  'Pyramid-Flow': { app: 'ai-publisher-pyramidflow', fn: 'generate' },
  'SVD-XT': { app: 'ai-publisher-svd', fn: 'generate' },
  'VideoCrafter': { app: 'ai-publisher-videocrafter', fn: 'generate' },
  'ZeroScope': { app: 'ai-publisher-zeroscope', fn: 'generate' },
  'Stable Diffusion': { app: 'ai-publisher-stablediffusion', fn: 'generate' },
  'SDXL': { app: 'ai-publisher-stablediffusion', fn: 'generate' },
  'Real-ESRGAN': { app: 'ai-publisher-realesrgan', fn: 'generate' },
  'Kokoro-TTS': { app: 'ai-publisher-kokoro', fn: 'generate' },
  'F5-TTS': { app: 'ai-publisher-f5tts', fn: 'generate' },
  'XTTS-v2': { app: 'ai-publisher-xtts', fn: 'generate' },
  'Whisper': { app: 'ai-publisher-whisper', fn: 'generate' },
  'Wav2Lip': { app: 'ai-publisher-wav2lip', fn: 'generate' },
  'SadTalker': { app: 'ai-publisher-sadtalker', fn: 'generate' },
  'MuseTalk': { app: 'ai-publisher-musetalk', fn: 'generate' },
  'GeneFace++': { app: 'ai-publisher-geneface', fn: 'generate' },
  'Video-ReTalking': { app: 'ai-publisher-videoretalking', fn: 'generate' },
  'AudioLDM2': { app: 'ai-publisher-audioldm2', fn: 'generate' },
  'Browser-Use': { app: 'ai-publisher-browseruse', fn: 'generate' },
};

export function getModalFn(modelType: string): { app: string; fn: string } | undefined {
  const exact = MODEL_TO_MODAL[modelType];
  if (exact) return exact;

  const lower = modelType.toLowerCase();
  for (const [key, val] of Object.entries(MODEL_TO_MODAL)) {
    if (key.toLowerCase() === lower) return val;
    if (lower.includes(key.toLowerCase())) return val;
    if (key.toLowerCase().includes(lower)) return val;
  }
  return undefined;
}

export class ModalClient {
  private static client: any = null;

  private static async getClient(): Promise<any> {
    if (this.client) return this.client;

    if (!MODAL_TOKEN_ID || !MODAL_TOKEN_SECRET) {
      throw new Error('MODAL_TOKEN_ID and MODAL_TOKEN_SECRET must be set');
    }

    const { ModalClient: Modal } = await import('modal');
    this.client = new Modal({
      tokenId: MODAL_TOKEN_ID,
      tokenSecret: MODAL_TOKEN_SECRET,
    });
    return this.client;
  }

  static async runJob(
    modelType: string,
    input: Record<string, any>,
  ): Promise<ModalJobResponse> {
    const mapping = getModalFn(modelType);
    if (!mapping) {
      throw new Error(`No Modal function mapped for model: ${modelType}`);
    }

    const payload: Record<string, any> = {
      ...input,
      b2_key_id: input.b2_key_id || process.env.B2_KEY_ID || '',
      b2_key: input.b2_application_key || input.b2_key || process.env.B2_APPLICATION_KEY || '',
    };

    try {
      const client = await this.getClient();
      const fn = client.functions.fromName(mapping.app, mapping.fn);

      Logger.info(`[ModalClient] Spawning ${mapping.app}/${mapping.fn}`, { modelType, payloadSize: JSON.stringify(payload).length });

      const taskId = `${modelType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fc = await fn.spawn(payload);

      return {
        id: taskId,
        status: 'IN_QUEUE',
        result: { functionCallId: fc._id || fc.id },
      };
    } catch (error: any) {
      Logger.error(`[ModalClient] Error spawning job for ${modelType}:`, error);
      throw error;
    }
  }

  static async getJobStatus(modelType: string, jobId: string): Promise<ModalJobStatus> {
    const mapping = getModalFn(modelType);
    if (!mapping) {
      throw new Error(`No Modal function mapped for model: ${modelType}`);
    }

    try {
      const client = await this.getClient();
      const fn = client.functions.fromName(mapping.app, mapping.fn);
      const fc = await fn.get(jobId);

      return {
        id: jobId,
        status: fc.done ? 'COMPLETED' : 'IN_PROGRESS',
        result: fc.done ? fc.result : undefined,
      };
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        return { id: jobId, status: 'IN_PROGRESS' };
      }
      Logger.error(`[ModalClient] Error polling job ${jobId}:`, error);
      return { id: jobId, status: 'FAILED', error: error.message };
    }
  }

  static async pollUntilComplete(
    modelType: string,
    jobPayload: Record<string, any>,
    timeoutMs = MODAL.TIMEOUT_SEC * 1000,
  ): Promise<ModalJobStatus> {
    const mapping = getModalFn(modelType);
    if (!mapping) {
      throw new Error(`No Modal function mapped for model: ${modelType}`);
    }

    const payload: Record<string, any> = {
      ...jobPayload,
      b2_key_id: jobPayload.b2_key_id || process.env.B2_KEY_ID || '',
      b2_key: jobPayload.b2_key || jobPayload.b2_application_key || process.env.B2_APPLICATION_KEY || '',
    };

    try {
      const client = await this.getClient();
      const fn = client.functions.fromName(mapping.app, mapping.fn);

      Logger.info(`[ModalClient] Running sync ${mapping.app}/${mapping.fn}`, { modelType, timeoutMs });

      const result = await fn.call(payload, { timeout: timeoutMs });

      Logger.info(`[ModalClient] Job completed`, { modelType });
      return {
        id: `sync_${Date.now()}`,
        status: 'COMPLETED',
        result,
      };
    } catch (error: any) {
      Logger.error(`[ModalClient] Error in sync job for ${modelType}:`, error);
      return {
        id: `sync_${Date.now()}`,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  static async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const client = await this.getClient();
      await client.functions.list();
      return { status: 'healthy', message: 'Modal client connected' };
    } catch (error: any) {
      Logger.error('[ModalClient] Health check failed:', error);
      return { status: 'unhealthy', message: error.message };
    }
  }
}

export default ModalClient;
