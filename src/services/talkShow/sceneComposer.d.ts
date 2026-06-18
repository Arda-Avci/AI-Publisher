export type SceneType = 'opening' | 'talk' | 'reaction' | 'wide' | 'closing';
export interface ComposeScene {
    type: SceneType;
    duration: number;
    avatarPath: string;
    characterName: string;
    color: string;
    speechText: string;
    ttsAudioPath?: string;
}
export interface ComposeInput {
    scenes: ComposeScene[];
    backgroundPath: string;
    backgroundMusicPath?: string;
    outputPath: string;
    fps?: number;
    resolution?: {
        width: number;
        height: number;
    };
}
export interface ComposeResult {
    outputPath: string;
    totalDuration: number;
    sceneCount: number;
}
export declare function compose(input: ComposeInput): Promise<ComposeResult>;
//# sourceMappingURL=sceneComposer.d.ts.map