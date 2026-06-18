import { Application } from 'express';
/**
 * SSE progress route: GET /progress/:id.
 *
 * Streams real-time job progress events emitted by src/queue.ts via
 * Redis Pub/Sub. S6 hardening: requires an authenticated session
 * and verifies the job belongs to the requesting user (ownership check).
 * Sends a 25s heartbeat to keep the connection alive through proxies
 * that buffer idle responses.
 */
export declare function registerProgressRoutes(app: Application): void;
//# sourceMappingURL=progress.d.ts.map