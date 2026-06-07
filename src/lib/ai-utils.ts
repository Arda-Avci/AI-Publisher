import { generateText, generateObject } from 'ai';

/**
 * Exponential backoff with jitter for AI API calls.
 * Helps prevent 429 Too Many Requests errors when hitting API rate limits.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      // Re-throw if it's not a rate limit error or we've exhausted retries
      // Google AI usually returns 429 status code for rate limits
      const isRateLimit = error?.statusCode === 429 || error?.message?.includes('429');
      
      if (!isRateLimit || attempt >= maxRetries) {
        throw error;
      }

      // Calculate exponential backoff with a bit of jitter to avoid thundering herd
      const jitter = Math.random() * 1000;
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      
      console.warn(`[AI] Rate limit hit (429). Retrying attempt ${attempt}/${maxRetries} after ${Math.round(delayMs)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
