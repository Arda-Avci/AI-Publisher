import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Logger } from '../lib/logger.js';

import WebSocket from 'ws';
import axios from 'axios';

interface PipecatConfig {
  pythonPath?: string;
  port?: number;
  autoRestart?: boolean;
}

interface PipelineOptions {
  pipelineId: string;
  scenes: Array<{
    scene_number: number;
    video_prompt: string;
    speech_text: string;
    sfx_prompt?: string;
    camera_motion?: string;
  }>;
  avatarProvider?: 'heygen' | 'tavus';
  avatarId?: string;
  voiceId?: string;
  language?: string;
  ttsProvider?: string;
  callbackUrl?: string;
}

interface PipelineStatus {
  pipelineId: string;
  status: 'starting' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'not_found';
  currentScene: number;
  totalScenes: number;
  progress: number;
  message: string;
  avatarProvider: string;
  subStage?: string;
}

type StatusCallback = (status: PipelineStatus) => void;

class PipecatBridge {
  private process: ChildProcess | null = null;
  private ws: WebSocket | null = null;
  private port: number;
  private pythonPath: string;
  private autoRestart: boolean;
  private statusCallbacks: Map<string, StatusCallback[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private scriptPath: string;
  private _wsWarned = false;

  constructor(config: PipecatConfig = {}) {
    this.port = config.port || 8765;
    this.pythonPath = config.pythonPath || 'python';
    this.autoRestart = config.autoRestart ?? true;
    this.scriptPath = path.join(process.cwd(), 'services', 'pipecat_server.py');
  }

  get baseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  get wsUrl(): string {
    return `ws://127.0.0.1:${this.port}/ws`;
  }

  async start(): Promise<void> {
    if (this.process) {
      Logger.warn('[Pipecat] Server already running');
      return;
    }

    // Pipecat Python script yoksa sessizce atla
    if (!fs.existsSync(this.scriptPath)) {
      Logger.info(`[Pipecat] Script bulunamadı, atlanıyor: ${this.scriptPath}`);
      return;
    }

    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        PIPECAT_PORT: String(this.port),
      };

      Logger.info(`[Pipecat] Starting server on port ${this.port}...`);

      this.process = spawn(this.pythonPath, ['-u', this.scriptPath], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
      };

      const timeout = setTimeout(() => {
        cleanup();
        if (this.process && this.process.exitCode === null) {
          Logger.info('[Pipecat] Server started (timeout assume ready)');
          this.connectWebSocket();
          resolve();
        } else if (this.process) {
          Logger.warn(
            `[Pipecat] Process exited with code ${this.process.exitCode}, server başlatılamadı`,
          );
          this.process = null;
          resolve();
        }
      }, 5000);

      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        if (text.includes('Uvicorn running on')) {
          cleanup();
          Logger.info('[Pipecat] Server is ready');
          this.connectWebSocket();
          resolve();
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        if (text.includes('Error') || text.includes('Traceback')) {
          Logger.error(`[Pipecat] Server error: ${text.trim()}`);
        }
      });

      this.process.on('exit', (code) => {
        Logger.warn(`[Pipecat] Server exited with code ${code}`);
        this.process = null;
        this.ws = null;
        cleanup();

        if (this.autoRestart && code !== 0) {
          Logger.info('[Pipecat] Auto-restarting in 3s...');
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.start().catch((err) => Logger.error('[Pipecat] Auto-restart failed:', err));
          }, 3000);
        }
      });

      this.process.on('error', (err) => {
        clearTimeout(timeout);
        Logger.error(`[Pipecat] Failed to start: ${err.message}`);
        reject(err);
      });
    });
  }

  private connectWebSocket(): void {
    if (this.ws) return;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        Logger.info('[Pipecat] WebSocket connected');
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleWsMessage(msg);
        } catch (err: any) {
          Logger.warn(`[Pipecat] Invalid WS message: ${err.message}`);
        }
      });

      this.ws.on('close', () => {
        this.ws = null;
        // Sadece process hala çalışıyorsa yeniden bağlan, yoksa sessizce dur
        if (this.process) {
          this.reconnectTimer = setTimeout(() => {
            this.connectWebSocket();
          }, 5000);
        }
      });

      this.ws.on('error', () => {
        // İlk hatada bir kere uyar, sonra sessizce bekle (close tetiklenecek)
        if (!this._wsWarned) {
          Logger.warn(
            '[Pipecat] WebSocket bağlantısı kurulamadı (Pipecat Python sunucusu çalışmıyor olabilir)',
          );
          this._wsWarned = true;
        }
      });
    } catch (err: any) {
      Logger.warn(`[Pipecat] WebSocket connect failed: ${err.message}`);
    }
  }

  private handleWsMessage(msg: any): void {
    const action = msg.action;

    if (
      action === 'pipeline_update' ||
      action === 'pipeline_completed' ||
      action === 'pipeline_cancelled'
    ) {
      const status: PipelineStatus = {
        pipelineId: msg.pipeline_id,
        status:
          msg.status === 'completed'
            ? 'completed'
            : msg.status === 'cancelled'
              ? 'cancelled'
              : msg.status === 'failed'
                ? 'failed'
                : 'processing',
        currentScene: msg.current_scene || 0,
        totalScenes: msg.total_scenes || 0,
        progress: msg.progress || 0,
        message: msg.message || '',
        avatarProvider: msg.avatar_provider || '',
        subStage: msg.sub_stage,
      };

      this.notifyCallbacks(msg.pipeline_id, status);
    }
  }

  onStatus(pipelineId: string, callback: StatusCallback): void {
    const callbacks = this.statusCallbacks.get(pipelineId) || [];
    callbacks.push(callback);
    this.statusCallbacks.set(pipelineId, callbacks);
  }

  offStatus(pipelineId: string, callback: StatusCallback): void {
    const callbacks = this.statusCallbacks.get(pipelineId) || [];
    this.statusCallbacks.set(
      pipelineId,
      callbacks.filter((cb) => cb !== callback),
    );
  }

  private notifyCallbacks(pipelineId: string, status: PipelineStatus): void {
    const callbacks = this.statusCallbacks.get(pipelineId) || [];
    callbacks.forEach((cb) => cb(status));
  }

  async startPipeline(options: PipelineOptions): Promise<{ success: boolean; pipelineId: string }> {
    const response = await axios.post(`${this.baseUrl}/api/pipeline/start`, {
      pipeline_id: options.pipelineId,
      scenes: options.scenes,
      avatar_provider: options.avatarProvider || 'heygen',
      avatar_id: options.avatarId || null,
      voice_id: options.voiceId || null,
      language: options.language || 'tr',
      tts_provider: options.ttsProvider || 'xtts',
      callback_url: options.callbackUrl || null,
    });

    return response.data;
  }

  async cancelPipeline(pipelineId: string): Promise<void> {
    await axios.post(`${this.baseUrl}/api/pipeline/cancel`, { pipeline_id: pipelineId });
  }

  async getPipeline(pipelineId: string): Promise<PipelineStatus> {
    const response = await axios.get(`${this.baseUrl}/api/pipeline/${pipelineId}`);
    return response.data;
  }

  async listPipelines(): Promise<PipelineStatus[]> {
    const response = await axios.get(`${this.baseUrl}/api/pipelines`);
    return response.data.pipelines || [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 3000 });
      return response.data?.status === 'running';
    } catch {
      return false;
    }
  }

  async stop(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      Logger.info('[Pipecat] Server stopped');
    }
  }
}

export const pipecatBridge = new PipecatBridge();
export default PipecatBridge;
