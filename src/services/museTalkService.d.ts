export interface MuseTalkOptions {
    faceImagePath: string;
    audioPath: string;
    bbox?: string;
}
export interface MuseTalkResult {
    outputPath: string;
    success: boolean;
}
export declare function generateTalkingHead(options: MuseTalkOptions, outputVideo?: string): Promise<MuseTalkResult>;
export declare function preloadModel(): Promise<boolean>;
export interface ComboLipSyncResult {
    outputPath: string;
    success: boolean;
}
export declare function generateComboLipSync(videoPath: string, audioPath: string, outputVideo?: string): Promise<ComboLipSyncResult>;
//# sourceMappingURL=museTalkService.d.ts.map