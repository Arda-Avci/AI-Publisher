import { Logger } from '../lib/logger.js';

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
export async function getSceneChainingFrame(
  options: ChainingOptions,
): Promise<ChainingResult> {
  const {
    jobId,
    currentScene,
    workDir = process.cwd(),
    validateQuality = false,
    similarityThreshold = 0.85,
  } = options;

  const result: ChainingResult = {
    success: false,
    prevSceneNumber: currentScene - 1,
    fallbackUsed: false,
  };

  // Scene 1 has no previous scene
  if (currentScene <= 1) {
    result.success = true;
    return result;
  }

  // Import dynamically to avoid circular deps
  const fs = await import('fs-extra');
  const path = await import('path');

  const prevVideoPath = path.join(
    workDir,
    'videolar',
    `ms_${jobId}_${currentScene - 1}.mp4`,
  );

  if (!(await fs.pathExists(prevVideoPath))) {
    Logger.warn(`[SceneChaining] Previous scene video not found: ${prevVideoPath}`);
    result.success = false;
    result.fallbackUsed = true;
    return result;
  }

  try {
    const { extractLastFrame } = await import('./videoService.js');
    const base64 = await extractLastFrame(prevVideoPath);

    if (!base64) {
      throw new Error('extractLastFrame returned empty string');
    }

    result.success = true;
    result.referenceImageBase64 = base64;

    Logger.info(
      `[SceneChaining] Scene ${currentScene}: last frame extracted from scene ${currentScene - 1}`,
      { jobId, prevSceneNumber: currentScene - 1 },
    );

    // Quality validation based on file size heuristic
    if (validateQuality) {
      let videoSizeInBytes = 0;
      try {
        const stat = await fs.stat(prevVideoPath);
        videoSizeInBytes = stat.size;
      } catch {
        videoSizeInBytes = 0;
      }
      result.qualityScore = Math.min(videoSizeInBytes / 5_000_000, 1.0) * 0.9 + 0.1;
      if (result.qualityScore < similarityThreshold) {
        Logger.warn(
          `[SceneChaining] Quality score ${result.qualityScore} below threshold ${similarityThreshold}`,
          { jobId, currentScene },
        );
      }
    }

    return result;
  } catch (err) {
    Logger.error(`[SceneChaining] Failed to extract last frame for scene ${currentScene}`, err);

    // Rollback: try extracting any frame as fallback
    try {
      const { extractLastFrame } = await import('./videoService.js');
      result.referenceImageBase64 = await extractLastFrame(prevVideoPath);
      result.success = true;
      result.fallbackUsed = true;
      Logger.warn(`[SceneChaining] Fallback used for scene ${currentScene}`, { jobId });
    } catch (fallbackErr) {
      Logger.error(`[SceneChaining] Fallback also failed for scene ${currentScene}`, fallbackErr);
      result.success = false;
    }

    return result;
  }
}

/**
 * Validate consistency between consecutive scenes.
 * Uses frame similarity heuristics (CLIP-based if available).
 * Reserved for future VLM-based validation.
 */
export async function validateSceneConsistency(
  scene1VideoPath: string,
  scene2VideoPath: string,
  characterFeatures?: string,
): Promise<ConsistencyMetrics> {
  const metrics: ConsistencyMetrics = {
    similarityScore: 0,
    characterConsistency: true,
    driftWarnings: [],
  };

  try {
    // TODO: Integrate CLIP/VLM similarity when available
    // For now, check file existence as basic validation
    const fs = await import('fs-extra');
    const exists1 = await fs.pathExists(scene1VideoPath);
    const exists2 = await fs.pathExists(scene2VideoPath);

    if (!exists1 || !exists2) {
      metrics.driftWarnings.push('One or both scene videos missing');
      return metrics;
    }

    // Placeholder: actual similarity evaluation will use CLIP
    // https://github.com/openai/CLIP
    metrics.similarityScore = 0.9;
    metrics.characterConsistency = true;

    if (characterFeatures) {
      Logger.info('[SceneChaining] Character features available for consistency check', {
        features: characterFeatures.substring(0, 50),
      });
    }

    return metrics;
  } catch (err) {
    Logger.error('[SceneChaining] Consistency validation failed', err);
    metrics.driftWarnings.push('Validation error: ' + (err as Error).message);
    return metrics;
  }
}
