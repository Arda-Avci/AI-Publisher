import rateLimit from 'express-rate-limit';

/**
 * Rate limiters for the AI-Publisher API.
 *
 * Applied per-route (not globally) since different routes have very
 * different cost profiles. Each limiter is intentionally generous enough
 * to not block normal use, but tight enough to prevent abuse.
 *
 * - heavyLimiter: 5 req/min/IP — for job creation, differentiation start/approval
 * - mediumLimiter: 20 req/min/IP — for settings, publish, manual queue operations
 * - sseLimiter: 10 conn/min/IP — for long-lived SSE endpoints
 * - authLimiter: 10 failed/15min/IP — for login (successful logins don't count)
 *
 * Trust proxy is enabled so that deployments behind nginx / load balancers
 * see the real client IP in `req.ip` rather than the proxy address.
 */

// Behind a reverse proxy, we need to trust X-Forwarded-For
process.env.TRUST_PROXY = process.env.TRUST_PROXY || '1';

const isTest = process.env.NODE_ENV === 'test';

/**
 * Heavy operations: job creation, differentiation start, differentiation
 * approval. These are expensive in GPU time, DB rows, and AI quota, so
 * cap them aggressively.
 */
export const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Cok fazla istek. Lutfen 1 dakika sonra tekrar deneyin.',
  },
});

/**
 * Medium operations: settings save, publish trigger, manual queue
 * controls, Colab start/stop. Higher cap than heavy but still rate-limited.
 */
export const mediumLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Istek limiti asildi. Lutfen biraz bekleyip tekrar deneyin.',
  },
});

/**
 * SSE endpoints: per-IP concurrent connection cap. We disable
 * standardHeaders because X-RateLimit-* headers interfere with
 * EventStream response flushing in some proxies.
 */
export const sseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 10,
  standardHeaders: false,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Cok fazla canli baglanti. Lutfen mevcut baglantilari kapatin.',
  },
});

/**
 * Auth: prevent brute-force. `skipSuccessfulRequests` means the limit
 * only applies to FAILED login attempts, so a legitimate user can sign
 * in once and not worry about the cap.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 failed attempts
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Cok fazla giris denemesi. 15 dakika sonra tekrar deneyin.',
  },
});
