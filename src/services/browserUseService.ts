/**
 * Browser-Use Service
 *
 * Executes browser automation tasks (YouTube upload, TikTok post, X/Meta publish)
 * via a remote browser-use serverless endpoint (RunPod) or local Flask service.
 *
 * Architecture:
 *   Node.js (publish queue)
 *     → RunPod Serverless Endpoint (browser-use container, port 5017)
 *         → browser-use SDK → Playwright → Real browser → Target platform
 *     ← Task result JSON
 *   Final video uploaded separately (B2 or direct)
 *
 * Usage:
 *   // YouTube upload via browser
 *   const result = await BrowserUseService.uploadYouTube({
 *     videoPath: '/path/to/video.mp4',
 *     title: 'My Video',
 *     description: 'Description text',
 *     tags: 'tag1, tag2',
 *     thumbnailPath: '/path/to/thumb.jpg',
 *     authFile: 'auth_youtube.json',
 *   });
 *
 *   // Generic browser task
 *   const result = await BrowserUseService.runTask({
 *     task: 'Go to youtube.com and upload the video at /content/video.mp4',
 *     context: { video_path: '/content/video.mp4', title: 'My Video' },
 *     maxSteps: 30,
 *   });
 */

import axios from 'axios';
import { Logger } from '../lib/logger.js';
import { ModalClient } from './modalClient.js';
import { PORTS } from '../constants.js';

export interface BrowserUseTaskOptions {
  /** Natural language task description */
  task: string;
  /** Optional context dict passed to the agent */
  context?: Record<string, unknown>;
  /** Max agent steps (default 30) */
  maxSteps?: number;
  /** Overall timeout in seconds (default 300) */
  timeoutSecs?: number;
}

export interface BrowserUseTaskResult {
  status: 'success' | 'error';
  output?: string;
  error?: string;
  stepsUsed?: number;
  agentHistory?: string;
}

export interface YouTubeUploadOptions {
  videoPath: string;
  title: string;
  description: string;
  tags?: string;
  thumbnailPath?: string;
  playlistName?: string;
  jobId?: number;
}

export interface TikTokUploadOptions {
  videoPath: string;
  description: string;
  tags?: string;
  jobId?: number;
}

export interface XUploadOptions {
  videoPath: string;
  description: string;
  tags?: string;
  jobId?: number;
}

export interface MetaUploadOptions {
  videoPath: string;
  description: string;
  tags?: string;
  jobId?: number;
}

const BROWSER_USE_TIMEOUT_MS = 600_000; // 10 minutes

export class BrowserUseService {
  private static getEndpointId(): string {
    const id = process.env.RUNPOD_BROWSER_USE_ENDPOINT_ID || '';
    if (!id) {
      Logger.warn('[BrowserUse] RUNPOD_BROWSER_USE_ENDPOINT_ID not set — browser-use calls will fail');
    }
    return id;
  }

  private static getCallbackUrl(): string {
    return process.env.PUBLIC_URL
      ? `${process.env.PUBLIC_URL}/api/webhook/runpod?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}`
      : `http://localhost:${process.env.PORT || PORTS.SERVER}/api/webhook/runpod?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}`;
  }

  /**
   * Run a generic browser-use task on RunPod serverless.
   * Falls back to local Flask service when RUNPOD_BROWSER_USE_ENDPOINT_ID is not set
   * and MOCK_COLAB=false (local dev mode).
   */
  static async runTask(options: BrowserUseTaskOptions): Promise<BrowserUseTaskResult> {
    const { task, context = {}, maxSteps = 30, timeoutSecs = 300 } = options;
    const endpointId = this.getEndpointId();

    if (!endpointId) {
      // Local fallback: call local Flask browser-use service directly
      Logger.info('[BrowserUse] No endpoint ID — using local Flask service');
      return this.runTaskLocal(task, context, maxSteps, timeoutSecs);
    }

    const runpodInput = {
      mode: 'browser_use',
      task,
      context,
      max_steps: maxSteps,
      timeout_secs: timeoutSecs,
      callback_url: this.getCallbackUrl(),
    };

    try {
      const runpodRes = await ModalClient.runJob(endpointId, runpodInput);
      Logger.info('[BrowserUse] RunPod task started', { taskId: runpodRes.id, status: runpodRes.status });

      // Poll for completion
      const result = await this.pollTaskResult(endpointId, runpodRes.id, timeoutSecs * 1000);
      return result;
    } catch (err: any) {
      Logger.error('[BrowserUse] RunPod task failed:', err.message);
      return { status: 'error', error: err.message };
    }
  }

  /**
   * Poll RunPod for browser-use task result.
   */
  private static async pollTaskResult(
    endpointId: string,
    taskId: string,
    timeoutMs: number,
  ): Promise<BrowserUseTaskResult> {
    const start = Date.now();
    const pollInterval = 15_000; // 15s

    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollInterval));

      try {
        const status = await ModalClient.getJobStatus(endpointId, taskId);
        const state = String(status?.status || (status as any)?.state || '');
        const result = (status as any)?.result;

        Logger.info(`[BrowserUse] Poll task ${taskId}: state=${state}`);

        if (state === 'COMPLETED' || state === 'SUCCEEDED') {
          return {
            status: 'success',
            output: status.result || result?.output || JSON.stringify(result || {}),
            stepsUsed: result?.steps_used,
          };
        }

        if (state === 'FAILED' || state === 'CANCELLED') {
          return {
            status: 'error',
            error: status.error || result?.error || `Task ${state}`,
          };
        }
      } catch (err: any) {
        Logger.warn('[BrowserUse] Poll error:', err.message);
      }
    }

    return { status: 'error', error: 'Task timed out' };
  }

  /**
   * Local fallback: call browser-use Flask service directly (no RunPod).
   */
  private static async runTaskLocal(
    task: string,
    context: Record<string, unknown>,
    maxSteps: number,
    timeoutSecs: number,
  ): Promise<BrowserUseTaskResult> {
    const port = process.env.RUNPOD_BROWSER_USE_PORT || '5026';
    const url = `http://localhost:${port}/browser-task`;

    try {
      const resp = await axios.post(
        url,
        { task, context, max_steps: maxSteps, timeout_secs: timeoutSecs },
        { timeout: BROWSER_USE_TIMEOUT_MS },
      );
      const data = resp.data as BrowserUseTaskResult;
      Logger.info('[BrowserUse] Local task done', { status: data.status });
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      Logger.error('[BrowserUse] Local task failed:', msg);
      return { status: 'error', error: msg };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Platform-specific tasks
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Upload a video to YouTube via browser-use agent.
   *
   * Task prompt tells the agent to:
   * 1. Navigate to YouTube Studio
   * 2. Click upload
   * 3. Select the local video file
   * 4. Fill in title, description, tags
   * 5. Set thumbnail (if provided)
   * 6. Set playlist (if provided)
   * 7. Publish as PUBLIC
   */
  static async uploadYouTube(opts: YouTubeUploadOptions): Promise<BrowserUseTaskResult> {
    const { videoPath, title, description, tags, thumbnailPath, playlistName, jobId } = opts;

    const context: Record<string, unknown> = {
      video_path: videoPath,
      title,
      description,
      tags: tags || '',
      thumbnail_path: thumbnailPath || '',
      playlist_name: playlistName || '',
      job_id: jobId,
    };

    const task = [
      `Navigate to YouTube Studio (https://studio.youtube.com) and upload the video located at: ${videoPath}`,
      `Set the video title to: "${title}"`,
      `Set the description to: "${description}"`,
      tags ? `Set tags to: "${tags}"` : '',
      thumbnailPath ? `Upload the thumbnail image from: ${thumbnailPath}` : '',
      playlistName ? `Add the video to playlist: "${playlistName}"` : '',
      `Set visibility to PUBLIC`,
      `Click Publish and wait for confirmation`,
    ]
      .filter(Boolean)
      .join('. Then ');

    Logger.info('[BrowserUse] YouTube upload task', { videoPath, title, jobId });
    return this.runTask({ task, context, maxSteps: 40, timeoutSecs: 600 });
  }

  /**
   * Upload a video to TikTok via browser-use agent.
   */
  static async uploadTikTok(opts: TikTokUploadOptions): Promise<BrowserUseTaskResult> {
    const { videoPath, description, tags, jobId } = opts;

    const context: Record<string, unknown> = {
      video_path: videoPath,
      description,
      tags: tags || '',
      job_id: jobId,
    };

    const task = [
      `Go to https://www.tiktok.com/creator-center/upload?lang=tr-TR`,
      `Upload the video from: ${videoPath}`,
      `Set the description to: "${description} ${tags}"`.trim(),
      `Click the Publish / Yayınla button`,
      `Wait for upload to complete and confirm`,
    ].join('. Then ');

    Logger.info('[BrowserUse] TikTok upload task', { videoPath, jobId });
    return this.runTask({ task, context, maxSteps: 30, timeoutSecs: 480 });
  }

  /**
   * Post a video to X (Twitter) via browser-use agent.
   */
  static async uploadToX(opts: XUploadOptions): Promise<BrowserUseTaskResult> {
    const { videoPath, description, tags, jobId } = opts;

    const context: Record<string, unknown> = {
      video_path: videoPath,
      description,
      tags: tags || '',
      job_id: jobId,
    };

    const task = [
      `Go to https://x.com/compose/post`,
      `Click the media add button and select the video from: ${videoPath}`,
      `Type the following text: "${description} ${tags}".trim()`,
      `Click the Post / Tweet button`,
      `Wait for confirmation`,
    ].join('. Then ');

    Logger.info('[BrowserUse] X upload task', { videoPath, jobId });
    return this.runTask({ task, context, maxSteps: 25, timeoutSecs: 420 });
  }

  /**
   * Upload a video to Meta (Facebook/Instagram Reels) via browser-use agent.
   */
  static async uploadToMeta(opts: MetaUploadOptions): Promise<BrowserUseTaskResult> {
    const { videoPath, description, tags, jobId } = opts;

    const context: Record<string, unknown> = {
      video_path: videoPath,
      description,
      tags: tags || '',
      job_id: jobId,
    };

    const task = [
      `Go to https://business.facebook.com/latest/reels_composer`,
      `Upload the video from: ${videoPath}`,
      `Set the description to: "${description} ${tags}"`.trim(),
      `Click through any Next buttons, then click Publish / Paylaş`,
      `Wait for upload to complete and confirm`,
    ].join('. Then ');

    Logger.info('[BrowserUse] Meta upload task', { videoPath, jobId });
    return this.runTask({ task, context, maxSteps: 30, timeoutSecs: 480 });
  }

  /**
   * Take a screenshot of a URL via local browser-use Flask service.
   * Only works locally (no RunPod serverless support yet).
   */
  static async takeScreenshot(url: string, fullPage = false): Promise<{ base64?: string; error?: string }> {
    const port = process.env.RUNPOD_BROWSER_USE_PORT || '5026';
    const localUrl = `http://localhost:${port}/browser-screenshot`;

    try {
      const resp = await axios.post(
        localUrl,
        { url, full_page: fullPage },
        { timeout: 60_000 },
      );
      return { base64: resp.data.screenshot_base64 };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      Logger.error('[BrowserUse] Screenshot failed:', msg);
      return { error: msg };
    }
  }
}
