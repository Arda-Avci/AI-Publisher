/**
 * Heavy operations: job creation, differentiation start, differentiation
 * approval. These are expensive in GPU time, DB rows, and AI quota, so
 * cap them aggressively.
 */
export declare const heavyLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Medium operations: settings save, publish trigger, manual queue
 * controls, Colab start/stop. Higher cap than heavy but still rate-limited.
 */
export declare const mediumLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * SSE endpoints: per-IP concurrent connection cap. We disable
 * standardHeaders because X-RateLimit-* headers interfere with
 * EventStream response flushing in some proxies.
 */
export declare const sseLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Auth: prevent brute-force. `skipSuccessfulRequests` means the limit
 * only applies to FAILED login attempts, so a legitimate user can sign
 * in once and not worry about the cap.
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rate-limit.d.ts.map