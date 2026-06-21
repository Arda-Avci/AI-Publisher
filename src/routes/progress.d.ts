import { Application } from 'express';
/**
 * SSE progress route.
 *
 * Two URL schemes supported for backward compatibility:
 *   GET /progress/:id         (legacy SSR pages)
 *   GET /api/v1/progress/stream?jobId=:id  (React SPA)
 *
 * Streams real-time job progress via Redis Pub/Sub.
 * Requires authenticated session + job ownership.
 */
export declare function registerProgressRoutes(app: Application): void;
//# sourceMappingURL=progress.d.ts.map