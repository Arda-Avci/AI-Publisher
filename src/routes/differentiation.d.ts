import { Application } from 'express';
/**
 * Differentiation routes for the opportunity funnel:
 * - POST /differentiate-video  (Phase 1: async, returns jobId immediately,
 *                              background work runs via setImmediate)
 * - GET  /differentiate-status/:jobId (Poll for Phase 1 progress)
 * - POST /approve-translation/:jobId  (Phase 2: scene prompts + status=pending)
 * - POST /differentiate-cancel/:jobId (Cancel awaiting_approval job)
 */
export declare function registerDifferentiationRoutes(app: Application): void;
//# sourceMappingURL=differentiation.d.ts.map