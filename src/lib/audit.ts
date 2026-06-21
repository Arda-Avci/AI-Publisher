import { Request } from 'express';
import { db } from '../db.js';
import { Logger } from './logger.js';

/**
 * Audit log helper for S6 security hardening.
 *
 * Tracks every important user action (login, job create/cancel/delete,
 * publish trigger, settings save, differentiation) in the `audit_log`
 * table. The logging function is intentionally non-throwing: an
 * audit-write failure MUST NOT break the parent request.
 */

export type AuditAction =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.logout'
  | 'job.create'
  | 'job.cancel'
  | 'job.delete'
  | 'job.retry'
  | 'job.start'
  | 'publish.youtube'
  | 'publish.tiktok'
  | 'publish.x'
  | 'publish.meta'
  | 'differentiate.create'
  | 'differentiate.approve'
  | 'differentiate.cancel'
  | 'settings.save'

  | 'job.select_cover'
  | 'scene.regenerate';

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
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const ip = entry.req?.ip || (entry.req?.socket as any)?.remoteAddress || null;
    const ua = entry.req?.headers?.['user-agent'] || null;

    await db.run(
      `INSERT INTO audit_log (
        user_id, action, entity_type, entity_id, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userId ?? null,
        entry.action,
        entry.entityType || null,
        entry.entityId ?? null,
        entry.details ? JSON.stringify(entry.details) : null,
        ip,
        ua,
      ],
    );
  } catch (err: any) {
    // Audit logging must NEVER fail the main operation.
    Logger.error('[audit] log failed', err?.message || err);
  }
}
