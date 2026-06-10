import { generateText, generateObject } from 'ai';

/**
 * Exponential backoff with jitter and fallback mechanism for AI API calls.
 * Helps prevent 429 Too Many Requests errors and tries alternative models if one fails.
 */
export async function withFallbackAndRetry<T>(
  operation: (model: any) => Promise<T>,
  models: any[],
  maxRetries: number = 2,
  baseDelayMs: number = 2000
): Promise<T> {
  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const currentModel = models[modelIndex];
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        if (modelIndex > 0) {
           console.log(`[AI] Attempting with fallback model index ${modelIndex}...`);
        }
        return await operation(currentModel);
      } catch (error: any) {
        attempt++;
        const isRateLimit = error?.statusCode === 429 || error?.message?.includes('429');
        
        // If it's a rate limit error or generic error and we haven't exhausted retries for THIS model
        if (attempt <= maxRetries) {
          const jitter = Math.random() * 1000;
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          console.warn(`[AI] Error with model index ${modelIndex} (${error?.message?.slice(0, 100) || 'Unknown'}). Retrying attempt ${attempt}/${maxRetries} after ${Math.round(delayMs)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Exhausted retries for this model
          console.warn(`[AI] Model index ${modelIndex} failed completely. Moving to next fallback model if available.`);
          break; // Break the while loop, move to the next model in the for loop
        }
      }
    }
  }
  
  throw new Error('[AI] All models in the fallback chain failed.');
}
