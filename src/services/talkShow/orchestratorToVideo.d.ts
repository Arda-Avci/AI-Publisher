import type { OrchestratorResult } from './types.js';
export interface OrchestratorVideoInput {
    result: OrchestratorResult;
    outputPath: string;
    backgroundMusicPath?: string;
    fps?: number;
    resolution?: {
        width: number;
        height: number;
    };
}
export interface OrchestratorVideoResult {
    outputPath: string;
    totalDuration: number;
    sceneCount: number;
}
export declare function orchestrateToVideo(input: OrchestratorVideoInput): Promise<OrchestratorVideoResult>;
//# sourceMappingURL=orchestratorToVideo.d.ts.map