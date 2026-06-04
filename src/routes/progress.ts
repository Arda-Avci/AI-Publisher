import { requireAuth } from '../middleware/auth.js';
import { sseLimiter } from '../middleware/rate-limit.js';
import { clients } from '../queue.js';
import { db } from '../db.js';
import { Application, Request, Response } from 'express';

/**
 * SSE progress route: GET /progress/:id.
 *
 * Streams real-time job progress events emitted by src/queue.ts via
 * the `clients` Map. S6 hardening: requires an authenticated session
 * and verifies the job belongs to the requesting user (ownership check).
 * Sends a 25s heartbeat to keep the connection alive through proxies
 * that buffer idle responses.
 */
export function registerProgressRoutes(app: Application): void {
  app.get('/progress/:id', sseLimiter, requireAuth, async (req: Request, res: Response) => {
    // Express 5: req.params.id can be string | string[] | undefined.
    // Defensive narrowing keeps TypeScript strict and avoids
    // parseInt coercing an array into NaN silently.
    const rawId = req.params.id;
    const jobId = typeof rawId === 'string' ? parseInt(rawId, 10) : NaN;

    if (Number.isNaN(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, error: 'Geçersiz job ID' });
    }

    const userId = req.session.userId;
    if (!userId) {
      // requireAuth should have caught this, but be defensive.
      return res.status(401).json({ success: false, error: 'Oturum açmanız gerekiyor' });
    }

    try {
      // Verify ownership — never stream another user's progress.
      // Also fetch the current stage/status so we can push an initial
      // state event when the client connects (avoids waiting for the
      // next queue broadcast).
      const job: any = await db.get(
        'SELECT user_id, status, current_stage FROM video_jobs WHERE id = ?',
        [jobId]
      );

      if (!job) {
        return res.status(404).json({ success: false, error: 'Job bulunamadı' });
      }

      if (job.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Bu job\'a erişim yetkiniz yok' });
      }

      // SSE headers — `no-transform` prevents proxies from rewriting
      // the stream. `X-Accel-Buffering: no` tells nginx not to buffer.
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      // Register the response in the clients map BEFORE writing so
      // any subsequent broadcast() in queue.ts reaches this client.
      clients.set(jobId, res);

      // Initial heartbeat so the browser knows the connection is open
      // and any proxy sees real bytes immediately.
      try {
        res.write(': connected\n\n');
      } catch {
        // Connection may already be closed; cleanup will fire on `close`.
      }

      // Push the current job state immediately so the dashboard
      // doesn't render an empty stage for clients that connect
      // mid-job (or after a completed job).
      try {
        res.write(`data: ${JSON.stringify({
          stage: job.current_stage || 'Beklemede',
          status: job.status
        })}\n\n`);
      } catch {
        // ignore
      }

      // Heartbeat every 25s — keeps idle connections alive through
      // nginx, cloudflare, and corporate proxies (most timeout at
      // 30-60s of inactivity).
      const heartbeat = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          // Socket already closed; clear the interval and drop the
          // client from the map so we don't keep a dead reference.
          clearInterval(heartbeat);
          clients.delete(jobId);
        }
      }, 25_000);

      // Clean up on connection close.
      req.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(jobId);
      });
    } catch (err: any) {
      console.error('[progress SSE] error:', err);
      if (!res.headersSent) {
        try {
          return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
        } catch {
          // already sent
        }
      } else {
        try { res.end(); } catch { /* ignore */ }
      }
    }
  });
}
