import { Application, Request, Response } from 'express';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import { broadcast } from '../queue.js';
import dotenv from 'dotenv';

dotenv.config();

const CALLBACK_TOKEN = process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026';

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
      // Find the associated video scene
      const scene = await db.get('SELECT * FROM video_scenes WHERE runpod_job_id = ?', [id]);

      if (!scene) {
        Logger.warn(`[Webhook] No video scene found for runpod_job_id: ${id}`);
        // Return 200 to RunPod to acknowledge, but log it
        res.json({ success: false, message: 'No matching scene found' });
        return;
      }

      if (status === 'COMPLETED' && output) {
        let videoUrl =
          output.video_url ||
          (output.b2_urls && output.b2_urls['/content/current_scene.mp4']) ||
          (output.b2_urls && output.b2_urls['/content/raw_video.mp4']) ||
          '';

        if (!videoUrl && output.images) {
          for (const key of Object.keys(output.images)) {
            const files = output.images[key];
            if (Array.isArray(files) && files.length > 0) {
              const file = files[0];
              if (typeof file === 'string' && (file.endsWith('.mp4') || file.endsWith('.mkv') || file.endsWith('.avi') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))) {
                videoUrl = file;
                break;
              }
            }
          }
        }
        const speechUrl =
          output.speech_url ||
          (output.b2_urls && output.b2_urls['/content/speech.wav']) ||
          (output.b2_urls && output.b2_urls['/content/kokoro_speech.wav']) ||
          '';
        const sfxUrl = output.sfx_url || (output.b2_urls && output.b2_urls['/content/sfx.wav']) || '';
        const subtitleUrl =
          output.subtitle_url || (output.b2_urls && output.b2_urls['/content/subtitle.srt']) || '';

        Logger.info(
          `[Webhook] Scene ${scene.scene_number} of job ${scene.job_id} completed successfully.`
        );

        await db.run(
          `UPDATE video_scenes 
           SET status = 'completed', video_path = ?, audio_path = ?, sfx_path = ?, subtitle_path = ? 
           WHERE id = ?`,
          [videoUrl, speechUrl, sfxUrl, subtitleUrl, scene.id]
        );

        // SSE broadcast
        broadcast(scene.job_id, {
          stageKey: 'stageSceneFinished',
          sceneNumber: scene.scene_number,
          message: `Sahne ${scene.scene_number} başarıyla tamamlandı.`,
        });
      } else {
        // Status is FAILED or other error
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
