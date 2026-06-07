import { Application, Request, Response } from 'express';
import { colab } from '../lib/colab-manager.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter, sseLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';

/**
 * Colab Manager routes: status, SSE stream, start, stop.
 */
export function registerColabRoutes(app: Application): void {
  // ─── S3: Colab Manager endpoints ──────────────────────────────────────────────
  app.get('/colab-status', requireAuth, (req, res) => {
    res.json(colab.getState());
  });

  // S4: SSE stream for push-based colab status updates (replaces 15s polling)
  app.get('/colab-status-stream', sseLimiter, requireAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Disable proxy buffering for nginx-style reverse proxies
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (state: any) => {
      try {
        res.write(`data: ${JSON.stringify(state)}\n\n`);
      } catch {
        // ignore
      }
    };

    // Send current state immediately
    send(colab.getState());

    const handler = (state: any) => send(state);
    colab.on('state-change', handler);

    // Heartbeat every 25s to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        // ignore
      }
    }, 25_000);

    req.on('close', () => {
      colab.off('state-change', handler);
      clearInterval(heartbeat);
    });
  });

  app.post('/colab-start', mediumLimiter, requireAuth, async (req, res) => {
    try {
      const result = await colab.start();
      logAudit({
        userId: req.session.userId,
        action: 'colab.start',
        req
      });
      res.json({ success: true, ngrokUrl: result.ngrokUrl });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/colab-connect', mediumLimiter, requireAuth, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ success: false, error: 'Geçersiz URL formatı' });
      }
      const result = await colab.connect(url);
      logAudit({
        userId: req.session.userId,
        action: 'colab.connect',
        req
      });
      res.json({ success: true, ngrokUrl: result.ngrokUrl });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/colab-stop', mediumLimiter, requireAuth, async (req, res) => {
    try {
      await colab.stop();
      logAudit({
        userId: req.session.userId,
        action: 'colab.stop',
        req
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
