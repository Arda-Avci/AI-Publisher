import { Application, Request, Response } from 'express';
import { Logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/auth.js';
import { registerRoute } from '../lib/routeAlias.js';
import { generatePodcastAudio } from '../services/podcastService.js';

export function registerPodcastRoutes(app: Application): void {
  registerRoute(app, 'post', '/api/v1/podcast/generate', requireAuth, async (req: Request, res: Response) => {
    try {
      const { prompt, characters, voice } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Prompt gerekli.' });
        return;
      }

      if (prompt.length > 5000) {
        res.status(400).json({ success: false, error: 'Prompt en fazla 5000 karakter.' });
        return;
      }

      Logger.info(`[Podcast] Generate request from user ${req.session.userId}: "${prompt.slice(0, 80)}..."`);

      const result = await generatePodcastAudio({ prompt, characters, voice });

      res.json({
        success: true,
        podcastTitle: result.podcastTitle,
        episodes: result.episodes,
        downloadUrl: result.downloadUrl,
      });
    } catch (err: any) {
      Logger.error(`[Podcast] Generation failed:`, err);
      res.status(500).json({ success: false, error: err.message || 'Podcast üretimi başarısız.' });
    }
  });
}
