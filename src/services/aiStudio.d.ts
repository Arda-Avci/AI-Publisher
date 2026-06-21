export interface StudioSoundOptions {
    denoise?: boolean;
    equalize?: boolean;
    deecho?: boolean;
    levelDb?: number;
}
export interface SmartReframeOptions {
    useFaceTracking?: boolean;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    outputWidth?: number;
    outputHeight?: number;
    startTime?: number;
    duration?: number;
}
export interface StudioResult {
    outputPath: string;
    dockerUsed: boolean;
    durationMs: number;
}
type ProgressCallback = (percent: number, message: string) => void;
export declare function enhanceAudio(inputVideo: string, outputVideo: string, options?: StudioSoundOptions, onProgress?: ProgressCallback): Promise<StudioResult>;
export declare function enhanceVideoAudio(inputVideo: string, outputVideo: string, options?: StudioSoundOptions, onProgress?: ProgressCallback): Promise<StudioResult>;
export declare function smartReframe(inputVideo: string, outputVideo: string, options?: SmartReframeOptions, onProgress?: ProgressCallback): Promise<StudioResult>;
export declare function removeBackground(inputImage: string, outputImage: string, onProgress?: ProgressCallback): Promise<StudioResult>;
export declare function generateImage(prompt: string, outputImage: string, modelType?: string, onProgress?: ProgressCallback): Promise<StudioResult>;
export declare function inpaintImage(inputImage: string, maskImage: string, prompt: string, outputImage: string, onProgress?: ProgressCallback): Promise<StudioResult>;
export declare function correctGaze(inputVideo: string, outputVideo: string, smooth?: boolean, onProgress?: ProgressCallback): Promise<StudioResult>;
export declare function removeBackgroundNoise(inputVideo: string, outputVideo: string, onProgress?: ProgressCallback): Promise<StudioResult>;
export declare function removeReverb(inputVideo: string, outputVideo: string, onProgress?: ProgressCallback): Promise<StudioResult>;
export {};
//# sourceMappingURL=aiStudio.d.ts.map