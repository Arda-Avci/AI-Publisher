/**
 * Exponential backoff with jitter and fallback mechanism for AI API calls.
 * Helps prevent 429 Too Many Requests errors and tries alternative models if one fails.
 */
export declare function withFallbackAndRetry<T>(operation: (model: any) => Promise<T>, models: any[], maxRetries?: number, baseDelayMs?: number, skipZenModels?: boolean): Promise<T>;
//# sourceMappingURL=ai-utils.d.ts.map