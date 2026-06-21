import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import axios from 'axios';
import { Logger } from '../lib/logger.js';
import path from 'path';
import fs from 'fs-extra';
import { dockerHost } from '../lib/docker-host.js';

export const bRollRouter = Router();

bRollRouter.post(
  '/generate-broll',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { prompt, duration = 5 } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt gerekli' });
      }

      const bRollUrl = dockerHost.getServiceUrl('cogvideox', '/generate-broll');
      const response = await axios.post(bRollUrl, {
        prompt,
        duration,
        output_format: 'mp4',
      });

      if (!response?.data?.download_url) {
        return res.status(502).json({ success: false, error: 'Docker B-roll yanıt vermedi' });
      }

      const bRollResp = await axios({
        url: response.data.download_url,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      const filename = `broll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`;
      const outputPath = path.join(process.cwd(), 'uploads', filename);
      await fs.writeFile(outputPath, Buffer.from(bRollResp.data));

      Logger.info(`[B-Roll] Generated: ${filename} (source: ${response.data.source || 'pexels'})`);

      res.json({
        success: true,
        data: {
          filename,
          url: `/uploads/${filename}`,
          source: response.data.source || 'pexels',
          duration,
        },
      });
    } catch (err: any) {
      Logger.error('[B-Roll] Generation error:', err);
      res.status(500).json({ success: false, error: err?.message || 'B-roll hatası' });
    }
  },
);

bRollRouter.get('/broll/list', requireAuth, async (_req: Request, res: Response) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!(await fs.pathExists(uploadsDir))) {
      return res.json({ success: true, data: [] });
    }
    const files = await fs.readdir(uploadsDir);
    const bRollFiles = files
      .filter((f) => f.startsWith('broll_') && f.endsWith('.mp4'))
      .map((f) => ({
        filename: f,
        url: `/uploads/${f}`,
        createdAt: fs.statSync(path.join(uploadsDir, f)).birthtime,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ success: true, data: bRollFiles });
  } catch (err: any) {
    Logger.error('[B-Roll] List error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Listeleme hatası' });
  }
});
