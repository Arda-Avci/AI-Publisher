/**
 * Colab Manager — Colab subprocess lifecycle singleton.
 *
 * State machine:
 *   stopped → starting → running → stopping → stopped
 *                       ↓                ↑
 *                       └─── error ──────┘
 *
 * Spawns `colab_setup.py` as a child process, captures stdout, and waits
 * for the ngrok URL to appear. Once found, sets `process.env.COLAB_URL`
 * and updates the state to 'running'.
 *
 * Idle stop: `scheduleIdleStop(delayMs)` arms a one-shot timer that calls
 * `stop()` after the delay. Subsequent `scheduleIdleStop` calls cancel the
 * previous timer. `cancelIdleStop()` clears it without scheduling a new one.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import axios from 'axios';
import fs from 'fs';

export type ColabStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface ColabState {
  status: ColabStatus;
  ngrokUrl: string | null;
  gpuMemoryGB: number | null;
  gpuUsedGB: number | null;
  gpuUtilizationPct: number | null;
  lastHealthCheck: string | null;
  lastError: string | null;
  startedAt: string | null;
  uptimeSeconds: number | null;
  runtimeSeconds: number | null;
}

export interface ColabManager {
  start(): Promise<{ ngrokUrl: string }>;
  connect(url: string): Promise<{ ngrokUrl: string }>;
  stop(): Promise<void>;
  getState(): ColabState;
  scheduleIdleStop(delayMs?: number): void;
  cancelIdleStop(): void;
  isHealthy(): boolean;
  verifyLibraries(): Promise<{ success: boolean; report?: any; error?: string }>;
  on(event: 'state-change', listener: (state: ColabState) => void): this;
  off(event: 'state-change', listener: (state: ColabState) => void): this;
}

/** Default idle-stop delay (ms): how long to wait after the last job before stopping Colab. */
export const DEFAULT_IDLE_STOP_MS = 60_000;

/** Health check interval (ms). */
const HEALTH_CHECK_INTERVAL_MS = 30_000;

/** Maximum time to wait for ngrok URL to appear in stdout (ms). */
const NGROK_URL_TIMEOUT_MS = 90_000;

/** Subprocess shutdown grace period (ms). */
const SIGTERM_GRACE_MS = 5_000;

/** Ngrok URL regex — matches both ngrok-free and ngrok.io variants. */
const NGROK_URL_REGEX = /https:\/\/[a-z0-9-]+\.ngrok(?:-free)?\.(?:app|io)/i;

interface InternalState {
  status: ColabStatus;
  ngrokUrl: string | null;
  gpuMemoryGB: number | null;
  gpuUsedGB: number | null;
  gpuUtilizationPct: number | null;
  lastHealthCheck: string | null;
  lastError: string | null;
  startedAt: string | null;
  runtimeSeconds: number | null;
}

class ColabManagerImpl extends EventEmitter implements ColabManager {
  private state: InternalState = {
    status: 'stopped',
    ngrokUrl: null,
    gpuMemoryGB: null,
    gpuUsedGB: null,
    gpuUtilizationPct: null,
    lastHealthCheck: null,
    lastError: null,
    startedAt: null,
    runtimeSeconds: null
  };

  private proc: ChildProcess | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private idleStopTimer: NodeJS.Timeout | null = null;
  private stdoutBuffer = '';
  private startPromise: Promise<{ ngrokUrl: string }> | null = null;
  private stopPromise: Promise<void> | null = null;

  constructor() {
    super();
    const envUrl = process.env.COLAB_URL;
    if (envUrl && envUrl.startsWith('http')) {
      this.state.startedAt = new Date().toISOString();
      this.setStatus('running', envUrl, null);
      
      // Run initial check asynchronously to verify availability immediately
      axios.get(`${envUrl}/health`, { 
        timeout: 5000,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
        .then(() => {
          this.startHealthChecks();
        })
        .catch((err) => {
          if (err.response) {
            this.startHealthChecks();
          } else {
            this.setStatus('error', envUrl, `COLAB_URL connection failed: ${err.message}`);
          }
        });
    }
  }

  async start(): Promise<{ ngrokUrl: string }> {
    const envUrl = process.env.COLAB_URL;
    if (envUrl && envUrl.startsWith('http')) {
      if (!this.state.startedAt) this.state.startedAt = new Date().toISOString();
      this.setStatus('running', envUrl, null);
      
      // Perform a quick health check to verify the adopted URL is actually alive
      try {
        await axios.get(`${envUrl}/health`, { 
          timeout: 5000,
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        this.startHealthChecks();
        return { ngrokUrl: envUrl };
      } catch (err: any) {
        if (err.response) {
          this.startHealthChecks();
          return { ngrokUrl: envUrl };
        }
        console.warn(`[WARN] Existing COLAB_URL connection failed (${err.message}). Starting new Colab server...`);
        this.state.status = 'starting';
      }
    }
    // If a start is already in progress, return its promise
    if (this.startPromise) return this.startPromise;

    // If already running, return current URL
    if (this.state.status === 'running' && this.state.ngrokUrl) {
      return { ngrokUrl: this.state.ngrokUrl };
    }

    this.cancelIdleStop();

    this.startPromise = this.doStart();
    try {
      const result = await this.startPromise;
      return result;
    } finally {
      this.startPromise = null;
    }
  }

  async connect(url: string): Promise<{ ngrokUrl: string }> {
    this.setStatus('starting', url, null);

    // Clean up url
    let finalUrl = url.trim();
    if (finalUrl.endsWith('/')) {
      finalUrl = finalUrl.slice(0, -1);
    }

    try {
      // Validate health
      try {
        await axios.get(`${finalUrl}/health`, { 
          timeout: 8000,
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
      } catch (err: any) {
        if (!err.response) throw err;
      }

      // Valid url, set status
      process.env.COLAB_URL = finalUrl;
      this.setStatus('running', finalUrl, null);
      this.state.startedAt = new Date().toISOString();
      this.startHealthChecks();

      // Persist to .env
      try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }
        if (envContent.includes('COLAB_URL=')) {
          envContent = envContent.replace(/COLAB_URL=.*/g, `COLAB_URL=${finalUrl}`);
        } else {
          envContent += `\nCOLAB_URL=${finalUrl}\n`;
        }
        fs.writeFileSync(envPath, envContent.trim() + '\n');
      } catch (e) {
        console.warn('[colab] Failed to write to .env:', e);
      }

      return { ngrokUrl: finalUrl };
    } catch (err: any) {
      const msg = `Bağlantı başarısız veya sunucu yanıt vermiyor: ${err.message}`;
      this.setStatus('error', finalUrl, msg);
      throw new Error(msg);
    }
  }

  private async doStart(): Promise<{ ngrokUrl: string }> {
    this.setStatus('starting', null, null);

    const setupPath = path.join(process.cwd(), 'colab_setup.py');
    this.stdoutBuffer = '';

    return new Promise<{ ngrokUrl: string }>((resolve, reject) => {
      try {
        const isWindows = process.platform === 'win32';

        // We use detached on Linux/Mac so the whole process group can be killed.
        // On Windows detached behaves differently, so we use taskkill /F /T /PID.
        const proc = spawn(
          process.platform === 'win32' ? 'python' : 'python3',
          [setupPath],
          {
            cwd: process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: !isWindows,
            windowsHide: true,
            env: process.env
          }
        );

        this.proc = proc;

        let resolved = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            this.killProc();
            const msg = `Colab başlatma zaman aşımı (${NGROK_URL_TIMEOUT_MS / 1000}s) — ngrok URL bulunamadı.`;
            this.setStatus('error', null, msg);
            reject(new Error(msg));
          }
        }, NGROK_URL_TIMEOUT_MS);

        const onStdout = (chunk: Buffer) => {
          const text = chunk.toString('utf8');
          this.stdoutBuffer += text;
          // Log for visibility
          process.stdout.write(`[colab] ${text}`);

          const match = this.stdoutBuffer.match(NGROK_URL_REGEX);
          if (match && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            const url = match[0];
            process.env.COLAB_URL = url;
            this.setStatus('running', url, null);
            this.state.startedAt = new Date().toISOString();
            this.startHealthChecks();
            resolve({ ngrokUrl: url });
          }
        };

        const onStderr = (chunk: Buffer) => {
          // Surface stderr to the main log without buffering
          process.stderr.write(`[colab:err] ${chunk.toString('utf8')}`);
        };

        proc.stdout?.on('data', onStdout);
        proc.stderr?.on('data', onStderr);

        proc.on('error', (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            this.setStatus('error', null, `Süreç başlatılamadı: ${err.message}`);
            reject(err);
          }
        });

        proc.on('exit', (code, signal) => {
          this.proc = null;
          this.stopHealthChecks();
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            const msg = `Colab süreci erken çıktı (code=${code}, signal=${signal}).`;
            this.setStatus('error', null, msg);
            reject(new Error(msg));
          } else if (this.state.status !== 'error' && this.state.status !== 'stopping') {
            // Unexpected exit after we were running
            const msg = `Colab süreci beklenmedik şekilde çıktı (code=${code}).`;
            this.setStatus('error', null, msg);
          }
        });
      } catch (err: any) {
        this.setStatus('error', null, `Başlatma hatası: ${err.message}`);
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    if (this.state.status === 'stopped') return;

    this.cancelIdleStop();
    this.stopPromise = this.doStop();
    try {
      await this.stopPromise;
    } finally {
      this.stopPromise = null;
    }
  }

  private async doStop(): Promise<void> {
    const prev = this.state.status;
    this.setStatus('stopping', this.state.ngrokUrl, null);
    this.stopHealthChecks();

    const url = this.state.ngrokUrl || process.env.COLAB_URL;
    if (url) {
      try {
        console.log(`[colab] Sending shutdown request to Colab at ${url}/shutdown`);
        await axios.post(`${url}/shutdown`, {}, {
          timeout: 4000,
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
      } catch (e: any) {
        console.warn(`[colab] Failed to call /shutdown endpoint: ${e.message}`);
      }
    }

    await this.killProc();
    this.setStatus('stopped', null, null);
    // Clear env var so future requests fall back to whatever was set externally
    if (prev === 'running') {
      // Keep the URL even after stop — only clear if user wants a fresh start
    }
  }

  private killProc(): Promise<void> {
    return new Promise<void>((resolve) => {
      const proc = this.proc;
      if (!proc) {
        resolve();
        return;
      }

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      proc.once('exit', finish);

      try {
        if (process.platform === 'win32') {
          // taskkill /F /T kills the process tree
          const { spawn: spawnSync } = require('child_process');
          spawnSync('taskkill', ['/F', '/T', '/PID', String(proc.pid)], {
            stdio: 'ignore',
            windowsHide: true
          });
        } else {
          // Negative PID targets the whole group (detached: true required)
          try {
            proc.kill('SIGTERM');
          } catch {}
          setTimeout(() => {
            if (!done) {
              try {
                proc.kill('SIGKILL');
              } catch {}
            }
          }, SIGTERM_GRACE_MS);
        }
      } catch (err: any) {
        process.stderr.write(`[colab:kill-error] ${err.message}\n`);
        finish();
      }

      // Belt-and-suspenders: resolve after the grace period no matter what
      setTimeout(finish, SIGTERM_GRACE_MS + 1000);
    });
  }

  getState(): ColabState {
    return {
      ...this.state,
      uptimeSeconds: this.computeUptime()
    };
  }

  scheduleIdleStop(delayMs: number = DEFAULT_IDLE_STOP_MS): void {
    this.cancelIdleStop();
    this.idleStopTimer = setTimeout(() => {
      this.idleStopTimer = null;
      // Only stop if we're in a steady running state, not starting/stopping/error
      if (this.state.status === 'running') {
        this.stop().catch((err) => {
          process.stderr.write(`[colab:idle-stop-error] ${err.message}\n`);
        });
      }
    }, delayMs);
  }

  cancelIdleStop(): void {
    if (this.idleStopTimer) {
      clearTimeout(this.idleStopTimer);
      this.idleStopTimer = null;
    }
  }

  isHealthy(): boolean {
    return (
      this.state.status === 'running' &&
      this.state.ngrokUrl !== null &&
      (this.state.lastHealthCheck === null ||
        Date.now() - new Date(this.state.lastHealthCheck).getTime() < 2 * HEALTH_CHECK_INTERVAL_MS)
    );
  }

  async verifyLibraries(): Promise<{ success: boolean; report?: any; error?: string }> {
    const url = this.state.ngrokUrl || process.env.COLAB_URL;
    if (!url) {
      return { success: false, error: 'COLAB_URL bulunamadı veya sunucu çalışmıyor.' };
    }
    try {
      const res = await axios.get(`${url}/verify-libs`, {
        timeout: 15000,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      return {
        success: res.data?.success === true,
        report: res.data?.report
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      const report = err.response?.data?.report;
      return {
        success: false,
        error: `Colab kütüphane doğrulaması başarısız: ${errMsg}`,
        report
      };
    }
  }

  // ── PRIVATE HELPERS ───────────────────────────────────────────────────────

  private setStatus(status: ColabStatus, ngrokUrl: string | null, lastError: string | null): void {
    this.state.status = status;
    if (ngrokUrl !== null) this.state.ngrokUrl = ngrokUrl;
    if (status === 'stopped') {
      this.state.ngrokUrl = null;
      this.state.gpuMemoryGB = null;
      this.state.startedAt = null;
    }
    if (lastError !== null) this.state.lastError = lastError;
    // S4: emit state-change for SSE consumers
    this.emit('state-change', this.getState());
  }

  private computeUptime(): number | null {
    if (this.state.status !== 'running' || !this.state.startedAt) return null;
    return Math.floor((Date.now() - new Date(this.state.startedAt).getTime()) / 1000);
  }

  private startHealthChecks(): void {
    this.stopHealthChecks();
    // Fire one immediately, then on interval
    void this.runHealthCheck();
    this.healthTimer = setInterval(() => {
      void this.runHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthChecks(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  private async runHealthCheck(): Promise<void> {
    const url = this.state.ngrokUrl;
    if (!url) return;
    try {
      const res = await axios.get(`${url}/health`, {
        timeout: 10_000,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const mem = res.data?.memory || {};
      const gpuUtil = res.data?.gpu_utilization || {};
      const runtime = res.data?.runtime || {};

      this.state.gpuMemoryGB = typeof mem.gpu_total_gb === 'number' ? mem.gpu_total_gb : null;
      this.state.gpuUsedGB = typeof mem.gpu_used_gb === 'number' ? mem.gpu_used_gb : null;
      this.state.gpuUtilizationPct = typeof gpuUtil.gpu_pct === 'number' ? gpuUtil.gpu_pct : null;
      this.state.runtimeSeconds = typeof runtime.uptime_seconds === 'number' ? runtime.uptime_seconds : null;
      this.state.lastHealthCheck = new Date().toISOString();
      if (this.state.status === 'running') {
        this.state.lastError = null;
      }
      this.emit('state-change', this.getState());
    } catch (err: any) {
      this.state.lastHealthCheck = new Date().toISOString();
      if (err.response) {
        if (this.state.status === 'running') {
          this.state.lastError = null;
        }
      } else {
        this.state.lastError = `Sağlık kontrolü başarısız: ${err.message}`;
      }
      this.emit('state-change', this.getState());
    }
  }
}

export const colab: ColabManager = new ColabManagerImpl();
