import express, { Application, Request, Response } from 'express';
import path from 'path';
import { colab } from '../lib/colab-manager.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { upload } from '../lib/upload.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';

export function registerEditorRoutes(app: Application): void {
  // ─── 1. Arka Planı Kaldır (Proxy to Colab) ──────────────────────────────────
  app.post(
    '/api/v1/editor/remove-background',
    mediumLimiter,
    requireAuth,
    upload.single('image'),
    async (req: any, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Lütfen bir görsel seçin.' });
      }

      const colabState = colab.getState();
      if (!colabState.ngrokUrl) {
        return res.status(503).json({ success: false, error: 'Google Colab GPU sunucusu bağlı değil.' });
      }

      try {
        Logger.info(`✂️ [remove-background] Colab sunucusuna gönderiliyor... Dosya: ${req.file.path}`);
        
        // Native FormData & fetch
        const fs = await import('fs-extra');
        const fileBuffer = await fs.readFile(req.file.path);
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });
        
        const formData = new FormData();
        formData.append('image', blob, req.file.originalname);

        const bypassHeaders = {
          'ngrok-skip-browser-warning': 'any-value',
          'bypass-tunnel-reminder': 'true'
        };

        const response = await fetch(`${colabState.ngrokUrl}/remove-background`, {
          method: 'POST',
          body: formData,
          headers: bypassHeaders
        });

        if (!response.ok) {
          const errMsg = await response.text();
          Logger.error(`❌ Colab remove-background başarısız: ${errMsg}`);
          return res.status(response.status).json({ success: false, error: 'Colab işlem hatası' });
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
          filename: outputFilename
        });
      } catch (err: any) {
        Logger.error('❌ remove-background proxy hatası:', err);
        return res.status(500).json({ success: false, error: err.message || 'SUNUCU_HATASI' });
      }
    }
  );

  // ─── 2. Inpaint (Proxy to Colab) ───────────────────────────────────────────
  app.post(
    '/api/v1/editor/inpaint',
    mediumLimiter,
    requireAuth,
    upload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'mask', maxCount: 1 }
    ]),
    async (req: Request, res: Response) => {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFile = files?.['image']?.[0];
      const maskFile = files?.['mask']?.[0];
      const { prompt } = req.body;

      if (!imageFile || !maskFile || !prompt) {
        return res.status(400).json({ success: false, error: 'Görsel, maske ve prompt zorunludur.' });
      }

      const colabState = colab.getState();
      if (!colabState.ngrokUrl) {
        return res.status(503).json({ success: false, error: 'Google Colab GPU sunucusu bağlı değil.' });
      }

      try {
        Logger.info(`🎨 [inpaint] Colab sunucusuna gönderiliyor... Prompt: ${prompt}`);
        
        const fs = await import('fs-extra');
        
        const imgBuffer = await fs.readFile(imageFile.path);
        const imgBlob = new Blob([imgBuffer], { type: imageFile.mimetype });
        
        const maskBuffer = await fs.readFile(maskFile.path);
        const maskBlob = new Blob([maskBuffer], { type: maskFile.mimetype });

        const formData = new FormData();
        formData.append('image', imgBlob, imageFile.originalname);
        formData.append('mask', maskBlob, maskFile.originalname);
        formData.append('prompt', prompt);

        const bypassHeaders = {
          'ngrok-skip-browser-warning': 'any-value',
          'bypass-tunnel-reminder': 'true'
        };

        const response = await fetch(`${colabState.ngrokUrl}/inpaint-image`, {
          method: 'POST',
          body: formData,
          headers: bypassHeaders
        });

        if (!response.ok) {
          const errMsg = await response.text();
          Logger.error(`❌ Colab inpaint başarısız: ${errMsg}`);
          return res.status(response.status).json({ success: false, error: 'Colab işlem hatası' });
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
          filename: outputFilename
        });
      } catch (err: any) {
        Logger.error('❌ inpaint proxy hatası:', err);
        return res.status(500).json({ success: false, error: err.message || 'SUNUCU_HATASI' });
      }
    }
  );

  // ─── 3. Görsel Üret (Proxy to Colab) ───────────────────────────────────────
  app.post(
    '/api/v1/editor/generate-image',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      const { prompt, model_type } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt parametresi zorunludur.' });
      }

      const colabState = colab.getState();
      if (!colabState.ngrokUrl) {
        return res.status(503).json({ success: false, error: 'Google Colab GPU sunucusu bağlı değil.' });
      }

      try {
        Logger.info(`🎨 [generate-image] Colab sunucusuna istek atılıyor... Prompt: ${prompt}`);
        
        const bypassHeaders = {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'any-value',
          'bypass-tunnel-reminder': 'true'
        };

        const response = await fetch(`${colabState.ngrokUrl}/generate-image`, {
          method: 'POST',
          headers: bypassHeaders,
          body: JSON.stringify({ prompt, model_type: model_type || 'dreamshaper' })
        });

        if (!response.ok) {
          const errMsg = await response.text();
          Logger.error(`❌ Colab generate-image başarısız: ${errMsg}`);
          return res.status(response.status).json({ success: false, error: 'Colab işlem hatası' });
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
          filename: outputFilename
        });
      } catch (err: any) {
        Logger.error('❌ generate-image proxy hatası:', err);
        return res.status(500).json({ success: false, error: err.message || 'SUNUCU_HATASI' });
      }
    }
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
    }
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
    }
  );
}
