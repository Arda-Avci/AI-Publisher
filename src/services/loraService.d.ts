export interface LoraTrainingResult {
    success: boolean;
    weightsPath?: string;
    characterName: string;
    stepsCompleted?: number;
    drivePath?: string;
    error?: string;
}
export interface LoraInferResult {
    success: boolean;
    outputPath?: string;
    error?: string;
}
export interface PretrainedLora {
    id: string;
    name: string;
    source: string;
    repo?: string;
    path?: string;
    description: string;
    type: string;
}
/**
 * Get pre-trained LoRA list from docker + local DB.
 */
export declare function getPretrainedLoras(): Promise<PretrainedLora[]>;
/**
 * Load a pre-trained LoRA from HF repo.
 */
export declare function loadPretrainedLora(hfRepo: string): Promise<string | null>;
/**
 * Train LoRA weights for a character from reference images.
 */
export declare function trainLoRA(jobId: number, characterName: string, imagePaths: string[], callbackUrl?: string): Promise<LoraTrainingResult>;
/**
 * Check Drive for cached LoRA weights.
 */
export declare function findDriveWeights(characterName: string): Promise<string | null>;
/**
 * Infer with LoRA: generate an image using trained weights.
 */
export declare function inferWithLoRA(weightsPath: string, prompt: string, outputPath: string): Promise<LoraInferResult>;
/**
 * Poll training progress from container.
 */
export declare function getTrainingProgress(jobId: number): Promise<{
    percent: number;
    status: string;
}>;
/**
 * Get character LoRA weights for a specific scene.
 */
export declare function getSceneCharacterWeights(jobId: number, sceneNumber: number): Promise<{
    characterName: string;
    weightsPath: string;
} | null>;
//# sourceMappingURL=loraService.d.ts.map