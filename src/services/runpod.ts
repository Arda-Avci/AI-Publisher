import axios from 'axios';
import dotenv from 'dotenv';
import { Logger } from '../lib/logger.js';

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

if (!RUNPOD_API_KEY) {
  Logger.warn('RUNPOD_API_KEY env variable is not set. RunPod requests will fail.');
}

export class RunPodClient {
  /**
   * Triggers an asynchronous serverless job on RunPod.
   * If a webhook URL is provided, RunPod will call it once the job is completed or failed.
   */
  static async runJob(
    endpointId: string,
    input: any,
    webhookUrl?: string
  ): Promise<{ id: string; status: string; error?: string }> {
    if (!RUNPOD_API_KEY) {
      throw new Error('RUNPOD_API_KEY is not defined in environment variables.');
    }

    const url = `https://api.runpod.ai/v1/${endpointId}/run`;

    const payload: any = {
      input: input,
    };

    if (webhookUrl) {
      payload.webhook = webhookUrl;
    }

    Logger.info(`[RunPod] Triggering job on endpoint: ${endpointId}`);
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RUNPOD_API_KEY}`,
        },
      });

      if (response.data && response.data.id) {
        Logger.info(`[RunPod] Job triggered successfully. ID: ${response.data.id}`);
        return { id: response.data.id, status: response.data.status };
      } else {
        throw new Error(`Invalid response from RunPod: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      Logger.error(`[RunPod] Error triggering job on endpoint ${endpointId}: ${error.message}`);
      if (error.response) {
        Logger.error(`[RunPod] API Response details: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Polls the status of a specific RunPod job.
   */
  static async getJobStatus(endpointId: string, jobId: string): Promise<any> {
    if (!RUNPOD_API_KEY) {
      throw new Error('RUNPOD_API_KEY is not defined in environment variables.');
    }

    const url = `https://api.runpod.ai/v1/${endpointId}/status/${jobId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${RUNPOD_API_KEY}`,
        },
      });
      return response.data;
    } catch (error: any) {
      Logger.error(`[RunPod] Error fetching job status for ${jobId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancels a running RunPod job.
   */
  static async cancelJob(endpointId: string, jobId: string): Promise<any> {
    if (!RUNPOD_API_KEY) {
      throw new Error('RUNPOD_API_KEY is not defined in environment variables.');
    }

    const url = `https://api.runpod.ai/v1/${endpointId}/cancel/${jobId}`;

    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: {
            Authorization: `Bearer ${RUNPOD_API_KEY}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      Logger.error(`[RunPod] Error cancelling job ${jobId}: ${error.message}`);
      throw error;
    }
  }
}
