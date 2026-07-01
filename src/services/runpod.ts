/**
 * Backward-compatible RunPodClient → ModalClient shim.
 * All calls now route through Modal. Remove this file after full migration.
 */
import { Logger } from '../lib/logger.js';
import { ModalClient } from './modalClient.js';

export interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: any;
  error?: string;
  elapsed?: number;
  remaining?: number;
  executionTime?: number;
}

export class RunPodClient {
  static async runJob(endpointIdOrModel: string, input: any, _webhookUrl?: string): Promise<RunPodJobResponse> {
    const modelType = endpointIdOrModel.includes('/') ? endpointIdOrModel.split('/').pop() || 'CogVideoX-5b' : endpointIdOrModel;

    try {
      const result = await ModalClient.pollUntilComplete(modelType, input, 720000);
      return {
        id: `modal_${Date.now()}`,
        status: result.status === 'COMPLETED' ? 'COMPLETED' : result.status === 'FAILED' ? 'FAILED' : 'IN_QUEUE',
        output: result.result,
        error: result.error,
      };
    } catch (error: any) {
      Logger.error(`[RunPodCompat] Error for ${modelType}:`, error);
      return {
        id: `modal_${Date.now()}`,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  static async runSync(endpointIdOrModel: string, input: any, _timeoutMs?: number): Promise<RunPodJobResponse> {
    const result = await this.runJob(endpointIdOrModel, input);
    return result;
  }

  static async getJobStatus(_endpointId: string, _jobId: string): Promise<any> {
    Logger.warn('[RunPodCompat] getJobStatus deprecated — Modal handles status internally');
    return { status: 'COMPLETED' };
  }

  static async cancelJob(_endpointId: string, _jobId: string): Promise<any> {
    Logger.warn('[RunPodCompat] cancelJob deprecated');
    return { id: _jobId, status: 'CANCELLED' };
  }

  static async healthCheck(_endpointId?: string): Promise<any> {
    return await ModalClient.healthCheck();
  }

  static async pollUntilComplete(endpointIdOrModel: string, input: any, _intervalMs?: number, _timeoutMs?: number, _onProgress?: any): Promise<any> {
    return await this.runJob(endpointIdOrModel, input);
  }
}

export default RunPodClient;
