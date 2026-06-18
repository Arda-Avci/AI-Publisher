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
declare class PipecatBridge {
    private process;
    private ws;
    private port;
    private pythonPath;
    private autoRestart;
    private statusCallbacks;
    private reconnectTimer;
    private scriptPath;
    private _wsWarned;
    constructor(config?: PipecatConfig);
    get baseUrl(): string;
    get wsUrl(): string;
    start(): Promise<void>;
    private connectWebSocket;
    private handleWsMessage;
    onStatus(pipelineId: string, callback: StatusCallback): void;
    offStatus(pipelineId: string, callback: StatusCallback): void;
    private notifyCallbacks;
    startPipeline(options: PipelineOptions): Promise<{
        success: boolean;
        pipelineId: string;
    }>;
    cancelPipeline(pipelineId: string): Promise<void>;
    getPipeline(pipelineId: string): Promise<PipelineStatus>;
    listPipelines(): Promise<PipelineStatus[]>;
    healthCheck(): Promise<boolean>;
    stop(): Promise<void>;
}
export declare const pipecatBridge: PipecatBridge;
export default PipecatBridge;
//# sourceMappingURL=pipecatBridge.d.ts.map