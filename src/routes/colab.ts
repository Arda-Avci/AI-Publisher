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
    { name: 'subtitle', maxCount: 1 },
    { name: 'sfx', maxCount: 1 },
    { name: 'cover_0', maxCount: 1 },
    { name: 'cover_1', maxCount: 1 },
    { name: 'cover_2', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    const { task_id, job_id, scene_number, status, type, message } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (status === 'error') {
      console.error(`❌ Colab'den hata raporu geldi: [Type: ${type || 'video'}] ${message}`);
      return res.status(200).json({ received: true });
    }

    try {
      const fs = await import('fs-extra');
      const path = await import('path');

      if (type === 'covers' || (!type && files['cover_0'])) {
        console.log(`✅ Kapak tasarımları callback ile geldi! Job: ${job_id}`);
        for (let i = 0; i < 3; i++) {
          const fileField = `cover_${i}`;
          const file = files[fileField]?.[0];
          if (file) {
            const dest = path.join(process.cwd(), 'uploads', `cover_${job_id}_${i}.jpg`);
            await fs.move(file.path, dest, { overwrite: true });
            console.log(`💾 Kapak ${i} kaydedildi: ${dest}`);
          }
        }
      } else {
        const videoFile = files['video']?.[0];
        const speechFile = files['speech']?.[0];
        const subtitleFile = files['subtitle']?.[0];
        const sfxFile = files['sfx']?.[0];

        console.log(`✅ Sahne medyaları callback ile geldi! Job: ${job_id}, Scene: ${scene_number}`);

        if (videoFile) {
          const destV = path.join(process.cwd(), 'videolar', `tv_${job_id}_${scene_number}.mp4`);
          await fs.move(videoFile.path, destV, { overwrite: true });
          console.log(`💾 Video kaydedildi: ${destV}`);
        }
        if (speechFile) {
          const destS = path.join(process.cwd(), 'videolar', `ts_${job_id}_${scene_number}.wav`);
          await fs.move(speechFile.path, destS, { overwrite: true });
          console.log(`💾 Konuşma kaydedildi: ${destS}`);
        }
        if (sfxFile) {
          const destE = path.join(process.cwd(), 'videolar', `te_${job_id}_${scene_number}.wav`);
          await fs.move(sfxFile.path, destE, { overwrite: true });
          console.log(`💾 SFX kaydedildi: ${destE}`);
        }
        if (subtitleFile) {
          const destSRT = path.join(process.cwd(), 'videolar', `srt_${job_id}_${scene_number}.srt`);
          await fs.move(subtitleFile.path, destSRT, { overwrite: true });
          console.log(`💾 Altyazı kaydedildi: ${destSRT}`);
        }
      }
    } catch (err) {
      console.error('❌ Callback dosyalarını kaydederken hata:', err);
    }

    res.status(200).json({ received: true });
  });

  // ─── S3: Colab Manager endpoints ──────────────────────────────────────────────
  app.get('/colab-status', requireAuth, (req, res) => {
    res.json(colab.getState());
  });

  // S4: SSE stream for push-based colab status updates (replaces 15s polling)
  app.get('/colab-status-stream', sseLimiter, requireAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');
    // Disable proxy buffering for nginx/ngrok reverse proxies
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
