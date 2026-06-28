import { Application, Request, Response } from 'express';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import { broadcast } from '../queue.js';
import { extractUrls } from '../lib/webhook-utils.js';
import dotenv from 'dotenv';

dotenv.config();

const CALLBACK_TOKEN = process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026';
const WEBHOOK_RETRY_COUNT = 5;
const WEBHOOK_RETRY_DELAY_MS = 1000;

async function findSceneWithRetry(runpodJobId: string): Promise<any> {
  for (let attempt = 0; attempt < WEBHOOK_RETRY_COUNT; attempt++) {
    const scene = await db.get('SELECT * FROM video_scenes WHERE runpod_job_id = ?', [runpodJobId]);
    if (scene) return scene;
    if (attempt < WEBHOOK_RETRY_COUNT - 1) {
      Logger.info(`[Webhook] Scene not found for job ${runpodJobId}, retrying (${attempt + 1}/${WEBHOOK_RETRY_COUNT})...`);
      await new Promise((r) => setTimeout(r, WEBHOOK_RETRY_DELAY_MS));
    }
  }
  return null;
}

export function registerWebhookRoutes(app: Application): void {
  app.post('/api/webhook/runpod', async (req: Request, res: Response) => {
    const token = req.query.token;

    if (token !== CALLBACK_TOKEN) {
      Logger.warn('[Webhook] Unauthorized webhook call received. IP: ' + req.ip);
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id, status, output, error } = req.body;

    if (!id) {
      Logger.error('[Webhook] Missing job id in payload');
      res.status(400).json({ success: false, error: 'Missing job id' });
      return;
    }

    Logger.info(`[Webhook] Received RunPod webhook for job ${id}. Status: ${status}`);

    try {
      const scene = await findSceneWithRetry(id);

      if (!scene) {
        Logger.warn(`[Webhook] No video scene found for runpod_job_id: ${id} after ${WEBHOOK_RETRY_COUNT} attempts`);
        res.status(202).json({ success: false, message: 'No matching scene found after retries' });
        return;
      }

      if (status === 'COMPLETED' && output) {
        const { videoUrl, speechUrl, sfxUrl, subtitleUrl } = extractUrls(output);

        Logger.info(
          `[Webhook] Scene ${scene.scene_number} of job ${scene.job_id} completed. ` +
          `video=${videoUrl.slice(0, 60)} speech=${speechUrl.slice(0, 60)}`
        );

        await db.run(
          `UPDATE video_scenes 
           SET status = 'completed', video_path = ?, audio_path = ?, sfx_path = ?, subtitle_path = ? 
           WHERE id = ?`,
          [videoUrl, speechUrl, sfxUrl, subtitleUrl, scene.id]
        );

        broadcast(scene.job_id, {
          stageKey: 'stageSceneFinished',
          sceneNumber: scene.scene_number,
          message: `Sahne ${scene.scene_number} başarıyla tamamlandı.`,
        });
      } else {
        const errMsg = error || (output && output.message) || 'Unknown error';
        Logger.error(`[Webhook] RunPod job ${id} failed: ${errMsg}`);

        await db.run(`UPDATE video_scenes SET status = 'failed' WHERE id = ?`, [scene.id]);

        broadcast(scene.job_id, {
          stageKey: 'stageError',
          sceneNumber: scene.scene_number,
          message: `Sahne ${scene.scene_number} üretim hatası: ${errMsg}`,
        });
      }

      res.json({ success: true });
    } catch (dbErr: any) {
      Logger.error(`[Webhook] Database update failed for job ${id}: ${dbErr.message}`);
      res.status(500).json({ success: false, error: 'Database update failed' });
    }
  });
}

export { findSceneWithRetry, CALLBACK_TOKEN };
