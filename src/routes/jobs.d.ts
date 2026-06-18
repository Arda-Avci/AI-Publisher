import { Application } from 'express';
/**
 * Job lifecycle routes:
 * - POST /create-job          (multipart: material, creates a new pending job)
 * - POST /save-meta/:id       (updates YouTube/TikTok/X/Meta copy)
 * - POST /delete-job/:id      (removes job + cleans up disk files)
 * - POST /retry-job/:id       (resets a failed job back to pending)
 * - POST /start-job/:jobId    (manually enqueues a pending job)
 * - POST /cancel-job/:id      (S6: marks pending/processing job as cancelled)
 *
 * S6 hardening:
 *   - rate-limited (heavyLimiter / mediumLimiter) per route
 *   - audit log entries for create/delete/retry/start/cancel
 */
export declare function registerJobRoutes(app: Application): void;
//# sourceMappingURL=jobs.d.ts.map