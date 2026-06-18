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
    diagnostics?: any;
}
export interface ColabManager {
    start(): Promise<{
        ngrokUrl: string;
    }>;
    connect(url: string): Promise<{
        ngrokUrl: string;
    }>;
    stop(): Promise<void>;
    getState(): ColabState;
    scheduleIdleStop(delayMs?: number): void;
    cancelIdleStop(): void;
    isHealthy(): boolean;
    verifyLibraries(): Promise<{
        success: boolean;
        report?: any;
        error?: string;
    }>;
    on(event: 'state-change', listener: (state: ColabState) => void): this;
    off(event: 'state-change', listener: (state: ColabState) => void): this;
}
/** Default idle-stop delay (ms): how long to wait after the last job before stopping Colab. */
export declare const DEFAULT_IDLE_STOP_MS = 60000;
export declare const colab: ColabManager;
//# sourceMappingURL=colab-manager.d.ts.map