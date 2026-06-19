export interface ChainingResult {
    success: boolean;
    referenceImageBase64?: string;
    prevSceneNumber: number;
    fallbackUsed: boolean;
    qualityScore?: number;
}
export interface ConsistencyMetrics {
    /**
     * Similarity score between consecutive scenes (0-1).
     * >0.85 indicates good consistency.
     */
    similarityScore: number;
    /**
     * Whether character features are consistent across scenes.
     */
    characterConsistency: boolean;
    /**
     * Detected drift issues for logging.
     */
    driftWarnings: string[];
}
export interface ChainingOptions {
    /** Job ID for file path resolution */
    jobId: number;
    /** Current scene number (1-indexed) */
    currentScene: number;
    /** Total number of scenes in the job */
    totalScenes: number;
    /** Output directory for intermediate files */
    workDir?: string;
    /** Physical character features string (for LoRA integration - reserved) */
    characterFeatures?: string;
    /** Minimum similarity threshold (default 0.85) */
    similarityThreshold?: number;
    /** Whether to enable quality validation */
    validateQuality?: boolean;
}
/**
 * Extract the last frame from the previous scene video for autoregressive continuation.
 * Acts as the dedicated chaining module replacing the inline code in queue.ts.
 */
export declare function getSceneChainingFrame(options: ChainingOptions): Promise<ChainingResult>;
/**
 * Validate consistency between consecutive scenes.
 * Uses frame similarity heuristics (CLIP-based if available).
 * Reserved for future VLM-based validation.
 */
export declare function validateSceneConsistency(scene1VideoPath: string, scene2VideoPath: string, characterFeatures?: string): Promise<ConsistencyMetrics>;
//# sourceMappingURL=sceneChaining.d.ts.map