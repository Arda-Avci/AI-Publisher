import axios from 'axios';
import dotenv from 'dotenv';
import { Logger } from '../lib/logger.js';

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const BASE_URL = 'https://api.runpod.ai/v2';

if (!RUNPOD_API_KEY) {
  Logger.warn('RUNPOD_API_KEY env variable is not set. RunPod requests will fail.');
}

export interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: any;
  error?: string;
  elapsed?: number;
  remaining?: number;
  executionTime?: number;
}

export interface RunPodHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  jobs: {
    running: number;
    queued: number;
    completed: number;
    failed: number;
  };
  workers: {
    active: number;
    idle: number;
    total: number;
  };
  gpu: {
    model: string;
    memory_total: number;
    memory_used: number;
    utilization: number;
  };
}

export interface RunPodJobStatus {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  input: any;
  output?: any;
  error?: string;
  elapsed?: number;
  remaining?: number;
  executionTime?: number;
  workerId?: string;
  queuePosition?: number;
}

export interface RunPodEndpointInfo {
  id: string;
  name: string;
  type: 'serverless' | 'secure_gateway';
  status: 'active' | 'inactive' | 'error';
  workers: {
    idle: number;
    running: number;
    max: number;
    warm: number;
  };
  gpu: string;
  gpu_count: number;
}

export class RunPodClient {
  private static getHeaders() {
    if (!RUNPOD_API_KEY) {
      throw new Error('RUNPOD_API_KEY is not defined in environment variables.');
    }
    return {
      Authorization: `Bearer ${RUNPOD_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  static async runJob(
    endpointId: string,
    input: any,
    webhookUrl?: string,
  ): Promise<RunPodJobResponse> {
    const url = `${BASE_URL}/${endpointId}/run`;
    const payload: any = { input };

    if (webhookUrl) {
      payload.webhook = webhookUrl;
    }

    Logger.info(`[RunPod] Triggering async job on endpoint: ${endpointId}`);
    try {
      const response = await axios.post(url, payload, { headers: this.getHeaders() });

      if (response.data && response.data.id) {
        Logger.info(`[RunPod] Job triggered successfully. ID: ${response.data.id}`);
        return {
          id: response.data.id,
          status: response.data.status || 'IN_QUEUE',
        };
      }
      throw new Error(`Invalid response from RunPod: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      Logger.error(`[RunPod] Error triggering job on endpoint ${endpointId}: ${error.message}`);
      if (error.response) {
        Logger.error(`[RunPod] API Response details: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  static async runSync(
    endpointId: string,
    input: any,
    timeoutMs = 120000,
  ): Promise<RunPodJobResponse> {
    const url = `${BASE_URL}/${endpointId}/runsync`;

    Logger.info(`[RunPod] Running sync job on endpoint: ${endpointId}`);
    try {
      const response = await axios.post(
        url,
        { input },
        {
          headers: this.getHeaders(),
          timeout: timeoutMs,
        },
      );

      if (response.data) {
        Logger.info(`[RunPod] Sync job completed. ID: ${response.data.id}, status: ${response.data.status}`);
        return {
          id: response.data.id,
          status: response.data.status || 'COMPLETED',
          output: response.data.output,
          error: response.data.error,
        };
      }
      throw new Error(`Invalid sync response from RunPod: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 408) {
        Logger.warn(`[RunPod] Sync job timed out on endpoint ${endpointId}`);
      }
      Logger.error(`[RunPod] Error in sync job on endpoint ${endpointId}: ${error.message}`);
      throw error;
    }
  }

  static async getJobStatus(endpointId: string, jobId: string): Promise<RunPodJobStatus> {
    const url = `${BASE_URL}/${endpointId}/status/${jobId}`;

    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      return {
        id: response.data.id,
        status: response.data.status,
        input: response.data.input,
        output: response.data.output,
        error: response.data.error,
        elapsed: response.data.elapsed,
        remaining: response.data.remaining,
        executionTime: response.data.executionTime,
        workerId: response.data.workerId,
        queuePosition: response.data.queuePosition,
      };
    } catch (error: any) {
      Logger.error(`[RunPod] Error fetching job status for ${jobId}: ${error.message}`);
      throw error;
    }
  }

  static async cancelJob(endpointId: string, jobId: string): Promise<{ id: string; status: string }> {
    const url = `${BASE_URL}/${endpointId}/cancel/${jobId}`;

    try {
      const response = await axios.post(url, {}, { headers: this.getHeaders() });
      return { id: response.data.id, status: response.data.status || 'CANCELLED' };
    } catch (error: any) {
      Logger.error(`[RunPod] Error cancelling job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  static async healthCheck(endpointId: string): Promise<RunPodHealthResponse> {
    const url = `${BASE_URL}/${endpointId}/health`;

    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      return {
        status: response.data.status || 'healthy',
        jobs: response.data.jobs || { running: 0, queued: 0, completed: 0, failed: 0 },
        workers: response.data.workers || { active: 0, idle: 0, total: 0 },
        gpu: response.data.gpu || { model: 'unknown', memory_total: 0, memory_used: 0, utilization: 0 },
      };
    } catch (error: any) {
      Logger.error(`[RunPod] Health check failed for endpoint ${endpointId}: ${error.message}`);
      return {
        status: 'unhealthy',
        jobs: { running: 0, queued: 0, completed: 0, failed: 0 },
        workers: { active: 0, idle: 0, total: 0 },
        gpu: { model: 'unknown', memory_total: 0, memory_used: 0, utilization: 0 },
      };
    }
  }

  static async streamLogs(
    endpointId: string,
    jobId: string,
    onLog: (line: string) => void,
    onError: (err: Error) => void,
  ): Promise<void> {
    const url = `${BASE_URL}/${endpointId}/stream/${jobId}`;

    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: this.getHeaders(),
          responseType: 'stream',
          timeout: 300000,
        },
      );

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          onLog(line);
        }
      });

      response.data.on('error', (err: Error) => {
        onError(err);
      });

      response.data.on('end', () => {
        Logger.info(`[RunPod] Stream ended for job ${jobId}`);
      });
    } catch (error: any) {
      Logger.error(`[RunPod] Error streaming logs for job ${jobId}: ${error.message}`);
      onError(error);
    }
  }

  static async listEndpoints(): Promise<RunPodEndpointInfo[]> {
    const url = 'https://api.runpod.ai/v2/endpoints';

    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      return (response.data || []).map((ep: any) => ({
        id: ep.id,
        name: ep.name,
        type: ep.type || 'serverless',
        status: ep.status || 'inactive',
        workers: ep.workers || { idle: 0, running: 0, max: 0, warm: 0 },
        gpu: ep.gpu || 'unknown',
        gpu_count: ep.gpu_count || 0,
      }));
    } catch (error: any) {
      Logger.error(`[RunPod] Error listing endpoints: ${error.message}`);
      throw error;
    }
  }

  static async pollUntilComplete(
    endpointId: string,
    jobId: string,
    intervalMs = 5000,
    timeoutMs = 600000,
    onProgress?: (status: RunPodJobStatus) => void,
  ): Promise<RunPodJobStatus> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const status = await this.getJobStatus(endpointId, jobId);

      if (onProgress) {
        onProgress(status);
      }

      switch (status.status) {
        case 'COMPLETED':
          Logger.info(`[RunPod] Job ${jobId} completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
          return status;

        case 'FAILED':
          Logger.error(`[RunPod] Job ${jobId} failed: ${status.error}`);
          throw new Error(`RunPod job ${jobId} failed: ${status.error || 'Unknown error'}`);

        case 'CANCELLED':
          Logger.warn(`[RunPod] Job ${jobId} was cancelled`);
          throw new Error(`RunPod job ${jobId} was cancelled`);

        default:
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error(`RunPod job ${jobId} timed out after ${timeoutMs / 1000}s`);
  }
}
