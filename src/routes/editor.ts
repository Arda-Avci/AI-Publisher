import express, { Application, Request, Response } from 'express';
import path from 'path';
import { dockerHost } from '../lib/docker-host.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { upload } from '../lib/upload.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';

export function registerEditorRoutes(app: Application): void {
  // ─── 1. Arka Planı Kaldır (Proxy to Docker) ──────────────────────────────────
  app.post(
    '/api/v1/editor/remove-background',
    mediumLimiter,
    requireAuth,
    upload.single('image'),
    async (req: any, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Lütfen bir görsel seçin.' });
      }

      try {
        Logger.info(
          `✂️ [remove-background] Docker sunucusuna gönderiliyor... Dosya: ${req.file.path}`,
        );

        const fs = await import('fs-extra');
        const fileBuffer = await fs.readFile(req.file.path);
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });

        const formData = new FormData();
        formData.append('image', blob, req.file.originalname);

        const response = await fetch(dockerHost.getServiceUrl('stablediffusion', '/remove-background'), {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errMsg = await response.text();
          Logger.error(`❌ Docker remove-background başarısız: ${errMsg}`);
          return res.status(response.status).json({ success: false, error: 'Docker işlem hatası' });
        }

        // Şeffaf resmi al ve Node diskine kaydet (uploads klasörü)
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const outputFilename = `nobg_${Date.now()}_${req.file.filename}.png`;
        const outputPath = `/uploads/${outputFilename}`;
        const outputFullPath = `${process.cwd()}${outputPath}`;

        await fs.writeFile(outputFullPath, buffer);
        Logger.info(`💾 [remove-background] Temizlenmiş resim kaydedildi: ${outputFullPath}`);

        // Geçici yüklenen dosyayı temizle
        await fs.remove(req.file.path);

        return res.json({
          success: true,
          url: outputPath,
          filename: outputFilename,
        });
      } catch (err: any) {
        Logger.error('❌ remove-background proxy hatası:', err);
        return res.status(500).json({ success: false, error: err.message || 'SUNUCU_HATASI' });
      }
    },
  );

  // ─── 2. Inpaint (Proxy to Docker) ───────────────────────────────────────────
  app.post(
    '/api/v1/editor/inpaint',
    mediumLimiter,
    requireAuth,
    upload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'mask', maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFile = files?.['image']?.[0];
      const maskFile = files?.['mask']?.[0];
      const { prompt } = req.body;

      if (!imageFile || !maskFile || !prompt) {
        return res
          .status(400)
          .json({ success: false, error: 'Görsel, maske ve prompt zorunludur.' });
      }

      try {
        Logger.info(`🎨 [inpaint] Docker sunucusuna gönderiliyor... Prompt: ${prompt}`);

        const fs = await import('fs-extra');

        const imgBuffer = await fs.readFile(imageFile.path);
        const imgBlob = new Blob([imgBuffer], { type: imageFile.mimetype });

        const maskBuffer = await fs.readFile(maskFile.path);
        const maskBlob = new Blob([maskBuffer], { type: maskFile.mimetype });

        const formData = new FormData();
        formData.append('image', imgBlob, imageFile.originalname);
        formData.append('mask', maskBlob, maskFile.originalname);
        formData.append('prompt', prompt);

        const response = await fetch(dockerHost.getServiceUrl('stablediffusion', '/inpaint-image'), {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errMsg = await response.text();
          Logger.error(`❌ Docker inpaint başarısız: ${errMsg}`);
          return res.status(response.status).json({ success: false, error: 'Docker işlem hatası' });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const outputFilename = `inpaint_${Date.now()}_${imageFile.filename}.png`;
        const outputPath = `/uploads/${outputFilename}`;
        const outputFullPath = `${process.cwd()}${outputPath}`;

        await fs.writeFile(outputFullPath, buffer);
        Logger.info(`💾 [inpaint] Düzenlenen resim kaydedildi: ${outputFullPath}`);

        // Geçici dosyaları temizle
        await fs.remove(imageFile.path);
        await fs.remove(maskFile.path);

        return res.json({
          success: true,
          url: outputPath,
          filename: outputFilename,
        });
      } catch (err: any) {
        Logger.error('❌ inpaint proxy hatası:', err);
        return res.status(500).json({ success: false, error: err.message || 'SUNUCU_HATASI' });
      }
    },
  );

  // ─── 3. Görsel Üret (Proxy to Docker) ───────────────────────────────────────
  app.post(
    '/api/v1/editor/generate-image',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      const { prompt, model_type } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt parametresi zorunludur.' });
      }

      try {
        Logger.info(`🎨 [generate-image] Docker sunucusuna istek atılıyor... Prompt: ${prompt}`);

        const response = await fetch(dockerHost.getServiceUrl('stablediffusion', '/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model_type: model_type || 'dreamshaper' }),
        });

        if (!response.ok) {
          const errMsg = await response.text();
          Logger.error(`❌ Docker generate-image başarısız: ${errMsg}`);
          return res.status(response.status).json({ success: false, error: 'Docker işlem hatası' });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const outputFilename = `gen_${Date.now()}.png`;
        const outputPath = `/uploads/${outputFilename}`;
        const outputFullPath = `${process.cwd()}${outputPath}`;

        const fs = await import('fs-extra');
        await fs.writeFile(outputFullPath, buffer);
        Logger.info(`💾 [generate-image] Görsel kaydedildi: ${outputFullPath}`);

        return res.json({
          success: true,
          url: outputPath,
          filename: outputFilename,
        });
      } catch (err: any) {
        Logger.error('❌ generate-image proxy hatası:', err);
        return res.status(500).json({ success: false, error: err.message || 'SUNUCU_HATASI' });
      }
    },
  );

  // ─── 4. Akıllı Reframe (16:9 → 9:16) ─────────────────────────────────────
  app.post(
    '/api/v1/editor/reframe',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      const { videoPath, useFaceTracking = true, startTime = 0, duration } = req.body;

      if (!videoPath) {
        return res.status(400).json({ success: false, error: 'videoPath gerekli' });
      }

      const fs = await import('fs-extra');
      if (!(await fs.pathExists(videoPath))) {
        return res.status(400).json({ success: false, error: 'Video dosyası bulunamadı' });
      }

      const outputPath = path.join(process.cwd(), 'videolar', `reframe_${Date.now()}.mp4`);
      const outputFilename = path.basename(outputPath);

      try {
        if (useFaceTracking) {
          const { videoClipper } = await import('../services/clipper/index.js');
          const segment = {
            id: `reframe-${Date.now()}`,
            startTime,
            endTime: duration ? startTime + duration : startTime + 30,
            duration: duration || 30,
            score: 100,
            reason: 'Smart reframe',
            highlights: [],
          };
          await videoClipper.cropSegmentWithFaceTracking(videoPath, outputPath, segment, {
            aspectRatio: '9:16',
            outputWidth: 1080,
            outputHeight: 1920,
          });
        } else {
          const { autoReframeHorizontalToVertical } = await import('../services/autoReframe.js');
          await autoReframeHorizontalToVertical(videoPath, outputPath, 'center');
        }

        res.json({ success: true, url: `/videolar/${outputFilename}`, outputPath });
      } catch (err: any) {
        Logger.error('❌ reframe hatası:', err);
        res.status(500).json({ success: false, error: err.message || 'REFAME_HATASI' });
      }
    },
  );

  // ─── 5. Studio Sound Ses İyileştirme ──────────────────────────────────────
  app.post(
    '/api/v1/editor/enhance-audio',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      const { videoPath, denoise = true, equalize = true, deecho = true, levelDb = -3 } = req.body;

      if (!videoPath) {
        return res.status(400).json({ success: false, error: 'videoPath gerekli' });
      }

      const fs = await import('fs-extra');
      if (!(await fs.pathExists(videoPath))) {
        return res.status(400).json({ success: false, error: 'Video dosyası bulunamadı' });
      }

      const outputPath = path.join(process.cwd(), 'videolar', `enhanced_${Date.now()}.mp4`);
      const outputFilename = path.basename(outputPath);

      try {
        const { enhanceVideoAudio } = await import('../services/studioSound.js');
        await enhanceVideoAudio(videoPath, outputPath, { denoise, equalize, deecho, levelDb });

        res.json({ success: true, url: `/videolar/${outputFilename}`, outputPath });
      } catch (err: any) {
        Logger.error('❌ enhance-audio hatası:', err);
        res.status(500).json({ success: false, error: err.message || 'SES_HATASI' });
      }
    },
  );

  // 6. Gaze correction (göz teması düzeltme)
  app.post('/api/v1/editor/gaze-fix', mediumLimiter, requireAuth, async (req, res) => {
    const { videoPath, smooth = true } = req.body;
    if (!videoPath) return res.status(400).json({ success: false, error: 'videoPath gerekli' });
    const { pathExists } = await import('fs-extra');
    if (!(await pathExists(videoPath)))
      return res.status(400).json({ success: false, error: 'Video dosyası bulunamadı' });
    const outPath = path.join(process.cwd(), 'videolar', `gaze_fixed_${Date.now()}.mp4`);
    try {
      const { correctEyeContact } = await import('../services/eyeContact.js');
      const result = await correctEyeContact(videoPath, outPath);
      res.json({
        success: true,
        outputPath: result.processedVideoPath,
        usedFallback: result.usedFallback,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. 4K Upscale (Real-ESRGAN)
  app.post(
    '/api/v1/editor/upscale',
    mediumLimiter,
    requireAuth,
    upload.single('image'),
    async (req: any, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Görsel dosyası gerekli' });
      }
      const scale = parseInt(req.body.scale as string, 10) || 4;
      if (scale !== 2 && scale !== 4) {
        return res.status(400).json({ success: false, error: 'scale 2 veya 4 olmalıdır' });
      }
      try {
        Logger.info(`4K Upscale isteği: ${req.file.originalname} (${scale}x)`);
        const fs = await import('fs-extra');
        const fileBuffer = await fs.readFile(req.file.path);
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });
        const formData = new FormData();
        formData.append('image', blob, req.file.originalname);
        formData.append('scale', String(scale));
        const response = await fetch(
          dockerHost.getServiceUrl('realesrgan', '/upscale'),
          { method: 'POST', body: formData },
        );
        if (!response.ok) {
          const errMsg = await response.text();
          Logger.error(`Upscale başarısız: ${errMsg}`);
          return res.status(response.status).json({ success: false, error: 'Upscale hatası' });
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const outputFilename = `upscaled_${Date.now()}_${req.file.filename}.png`;
        const outputPath = `/uploads/${outputFilename}`;
        await fs.writeFile(`${process.cwd()}${outputPath}`, buffer);
        await fs.remove(req.file.path);
        return res.json({ success: true, url: outputPath, filename: outputFilename });
      } catch (err: any) {
        Logger.error('Upscale proxy hatası:', err);
        return res.status(500).json({ success: false, error: err.message || 'UPSCALE_HATASI' });
      }
    },
  );

  // 9. Inpainting (nesne/maske silme)
  app.post('/api/v1/editor/inpaint-video', mediumLimiter, requireAuth, async (req, res) => {
    const { videoPath, masks = [], strength = 0.8 } = req.body;
    if (!videoPath) return res.status(400).json({ success: false, error: 'videoPath gerekli' });
    const { pathExists } = await import('fs-extra');
    if (!(await pathExists(videoPath)))
      return res.status(400).json({ success: false, error: 'Video dosyası bulunamadı' });
    const outPath = path.join(process.cwd(), 'videolar', `inpainted_${Date.now()}.mp4`);
    try {
      const { inpaintObjects } = await import('../services/inpainting.js');
      await inpaintObjects(videoPath, masks, outPath);
      res.json({ success: true, outputPath: outPath });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
