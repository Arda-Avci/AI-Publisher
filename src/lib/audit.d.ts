import { Request } from 'express';
/**
 * Audit log helper for S6 security hardening.
 *
 * Tracks every important user action (login, job create/cancel/delete,
 * publish trigger, settings save, differentiation) in the `audit_log`
 * table. The logging function is intentionally non-throwing: an
 * audit-write failure MUST NOT break the parent request.
 */
export type AuditAction = 'auth.login.success' | 'auth.login.failed' | 'auth.logout' | 'job.create' | 'job.cancel' | 'job.delete' | 'job.retry' | 'job.start' | 'publish.youtube' | 'publish.tiktok' | 'publish.x' | 'publish.meta' | 'differentiate.create' | 'differentiate.approve' | 'differentiate.cancel' | 'settings.save' | 'colab.start' | 'colab.stop' | 'colab.connect' | 'job.select_cover' | 'scene.regenerate';
export interface AuditEntry {
    userId: number | null | undefined;
    action: AuditAction;
    entityType?: string;
    entityId?: number;
    details?: Record<string, any>;
    req?: Request;
}
/**
 * Best-effort write to the audit_log table.
 *
 * The function is wrapped in try/catch and never throws back to the
 * caller. If the DB is unavailable, we log to stderr and continue.
 */
export declare function logAudit(entry: AuditEntry): Promise<void>;
//# sourceMappingURL=audit.d.ts.map