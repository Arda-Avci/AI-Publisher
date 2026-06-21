import { requireAuth } from '../middleware/auth.js';
import { sseLimiter } from '../middleware/rate-limit.js';
import { db } from '../db.js';
import { redisSub } from '../lib/redis.js';
import { Application, Request, Response } from 'express';
import { Logger } from '../lib/logger.js';

function extractJobId(req: Request): number {
  // Supports: /progress/:id (param) and /api/v1/progress/stream?jobId= (query)
  const rawId = req.params.id || (req.query.jobId as string);
  const jobId = typeof rawId === 'string' ? parseInt(rawId, 10) : NaN;
  return Number.isNaN(jobId) ? NaN : jobId;
}

function handleSseConnection(
  req: Request,
  res: Response,
  jobId: number,
  job: any,
): void {
  const channel = `job_progress:${jobId}`;

  const subscriber = redisSub.duplicate();
  subscriber.subscribe(channel).catch((err: Error) => {
    Logger.error(`SSE subscribe failed for job ${jobId}`, err);
    if (!res.headersSent) res.status(500).end();
    return;
  });

  subscriber.on('message', (chan, message) => {
    if (chan === channel) {
      try {
        res.write(`data: ${message}\n\n`);
      } catch (err) {
        Logger.error(`SSE write error for job ${jobId}`, err);
      }
    }
  });

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    subscriber.unsubscribe(channel).catch(() => {});
    subscriber.quit().catch(() => {});
    Logger.info(`SSE closed for job ${jobId}`);
  });
}

function writeSseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

function writeInitialEvents(res: Response, job: any): void {
  try {
    res.write(': connected\n\n');
  } catch {
    // connection may already be closed
  }
  try {
    res.write(
      `data: ${JSON.stringify({
        stage: job.current_stage || 'Beklemede',
        status: job.status,
      })}\n\n`,
    );
  } catch {
    // ignore
  }
}

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
export function registerProgressRoutes(app: Application): void {
  const sseHandler = async (req: Request, res: Response) => {
    const jobId = extractJobId(req);

    if (Number.isNaN(jobId) || jobId <= 0) {
      Logger.warn(`SSE invalid jobId param=${req.params.id} query=${req.query.jobId}`);
      return res.status(400).json({ success: false, error: 'Geçersiz job ID' });
    }

    const userId = req.session.userId;
    if (!userId) {
      Logger.warn(`SSE no session for job ${jobId}`);
      return res.status(401).json({ success: false, error: 'Oturum açmanız gerekiyor' });
    }

    try {
      const job: any = await db.get(
        'SELECT user_id, status, current_stage FROM video_jobs WHERE id = ?',
        [jobId],
      );

      if (!job) {
        Logger.warn(`SSE job ${jobId} not found (user ${userId})`);
        return res.status(404).json({ success: false, error: 'Job bulunamadı' });
      }

      if (job.user_id !== userId) {
        Logger.warn(`SSE ownership mismatch job=${jobId} owner=${job.user_id} requester=${userId}`);
        return res.status(403).json({ success: false, error: 'Bu job size ait değil' });
      }

      writeSseHeaders(res);
      writeInitialEvents(res, job);

      Logger.info(`SSE connected job=${jobId} user=${userId} status=${job.status}`);

      handleSseConnection(req, res, jobId, job);
    } catch (err: any) {
      Logger.error(`SSE error for job ${jobId}`, err);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: err?.message || 'UNKNOWN_ERROR' });
      }
      try { res.end(); } catch { /* ignore */ }
    }
  };

  // 1) React SPA: /api/v1/progress/stream?jobId=
  app.get('/api/v1/progress/stream', sseLimiter, requireAuth, sseHandler);

  // 2) Legacy SSR: /progress/:id — redirect clients to canonical URL
  app.get('/progress/:id', sseLimiter, requireAuth, (req: Request, res: Response) => {
    const jobId = extractJobId(req);
    if (Number.isNaN(jobId)) {
      return res.status(400).json({ success: false, error: 'Geçersiz job ID' });
    }
    // 301 redirect to canonical SSE endpoint
    return res.redirect(301, `/api/v1/progress/stream?jobId=${jobId}`);
  });
}
