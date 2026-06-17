import { generateText, generateObject } from 'ai';
import { disabledZenModels } from './ai-provider.js';
import { Logger } from './logger.js';

/**
 * Exponential backoff with jitter and fallback mechanism for AI API calls.
 * Helps prevent 429 Too Many Requests errors and tries alternative models if one fails.
 */
export async function withFallbackAndRetry<T>(
  operation: (model: any) => Promise<T>,
  models: any[],
  maxRetries: number = 2,
  baseDelayMs: number = 2000,
  skipZenModels?: boolean,
): Promise<T> {
  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const currentModel = models[modelIndex];

    const modelId = currentModel?.modelId || currentModel?.model || '';
    const isZenModel =
      typeof modelId === 'string' &&
      ['big-pickle', 'mimo-v2.5-free', 'nemotron-3-ultra-free'].some((id) => modelId.includes(id));

    // Skip Zen models for structured output (generateObject) — they don't support response_format
    if (isZenModel && skipZenModels) {
      Logger.info(`[AI] Skipping Zen model "${modelId}" — not compatible with structured output.`);
      continue;
    }

    const effectiveMaxRetries = isZenModel ? 0 : maxRetries;

    let attempt = 0;

    while (attempt <= effectiveMaxRetries) {
      try {
        if (modelIndex > 0) {
          Logger.info(`[AI] Attempting with fallback model index ${modelIndex}...`);
        }
        return await operation(currentModel);
      } catch (error: any) {
        attempt++;

        const isTimeout =
          error?.message?.toLowerCase().includes('timeout') ||
          error?.message?.toLowerCase().includes('abort') ||
          error?.name === 'AbortError';

        // If we haven't exhausted retries for THIS model and it is not a timeout
        if (attempt <= effectiveMaxRetries && !isTimeout) {
          const jitter = Math.random() * 1000;
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          Logger.warn(
            `[AI] Error with model index ${modelIndex} (${error?.message?.slice(0, 100) || 'Unknown'}). Retrying attempt ${attempt}/${effectiveMaxRetries} after ${Math.round(delayMs)}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Exhausted retries or timed out
          const reason = isTimeout ? 'timed out' : 'failed completely';
          Logger.warn(
            `[AI] Model index ${modelIndex} ${reason}. Moving to next fallback model if available.`,
          );
          break; // Break the while loop, move to the next model in the for loop
        }
      }
    }
  }

  throw new Error('[AI] All models in the fallback chain failed.');
}
