import { Application, Request, Response } from 'express';
import multer from 'multer';
import { colab } from '../lib/colab-manager.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter, sseLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';

const upload = multer({ dest: 'uploads/' }); // Geçici kayıt klasörü

/**
 * Colab Manager routes: status, SSE stream, start, stop, and callback.
 */
export function registerColabRoutes(app: Application): void {
  // ─── Webhook Callback Endpoint (Colab'den Otonom POST) ───────────────────────
  app.post('/api/v1/video/callback', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'speech', maxCount: 1 },
    { name: 'subtitle', maxCount: 1 }
  ]), (req: Request, res: Response) => {
    const { task_id, status, message } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (status === 'error') {
      console.error(`❌ Colab'den hata raporu geldi: ${message}`);
      return res.status(200).json({ received: true });
    }

    // Artık bitmiş dosyalar sunucunda! FFmpeg ile birleştirip Playwright'a paslayabilirsin.
    const videoPath = files['video']?.[0]?.path;
    const subtitlePath = files['subtitle']?.[0]?.path || null;

    console.log(`✅ Video rendering bitti! Task: ${task_id}, Dosya: ${videoPath}`);
    
    // Burada senin RabbitMQ veya otomasyon pipeline'ını tetikle
    // ...
    
    res.status(200).json({ received: true });
  });

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
