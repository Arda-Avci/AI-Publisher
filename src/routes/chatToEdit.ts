import { Application, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import {
  parseEditCommand,
  scoreScenes,
  applyEditOperations,
  SceneScoreSchema,
} from '../services/chatToEdit.js';
import path from 'path';
import fs from 'fs-extra';

export function registerChatToEditRoutes(app: Application): void {
  app.post('/api/v1/chat-edit/parse', mediumLimiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const { command, jobId } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ success: false, error: 'Komut gerekli' });
      }
      if (!jobId) {
        return res.status(400).json({ success: false, error: 'Job ID gerekli' });
      }

      const job: any = await db.get(
        'SELECT id, total_scenes, scene_prompts, master_prompt FROM video_jobs WHERE id = ? AND user_id = ?',
        [jobId, req.session.userId]
      );
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job bulunamadı' });
      }

      const result = await parseEditCommand(
        command,
        job.total_scenes || 1,
        job.scene_prompts || job.master_prompt
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      Logger.error('[ChatToEdit] Parse error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Parse hatası' });
    }
  });

  app.post('/api/v1/chat-edit/apply', mediumLimiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const { jobId, operations } = req.body;
      if (!jobId || !operations) {
        return res.status(400).json({ success: false, error: 'Job ID ve operasyonlar gerekli' });
      }

      const job: any = await db.get(
        'SELECT id, total_scenes, final_filename FROM video_jobs WHERE id = ? AND user_id = ?',
        [jobId, req.session.userId]
      );
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job bulunamadı' });
      }

      const scenesBaseDir = path.join(process.cwd(), 'videolar', `job_${jobId}`);
      const sceneDirs = await fs.readdir(scenesBaseDir).catch(() => [] as string[]);
      const scenes = sceneDirs
        .filter(d => d.startsWith('scene_'))
        .map(d => {
          const num = parseInt(d.replace('scene_', ''), 10);
          return {
            sceneNumber: num,
            videoPath: path.join(scenesBaseDir, d, 'video.mp4'),
            audioPath: path.join(scenesBaseDir, d, 'speech.mp3'),
          };
        })
        .filter(s => !isNaN(s.sceneNumber));

      if (scenes.length === 0) {
        return res.status(400).json({ success: false, error: 'Sahne videosu bulunamadı' });
      }

      const outputDir = path.join(process.cwd(), 'videolar', `chat_edit_${jobId}_${Date.now()}`);
      await fs.ensureDir(outputDir);

      const processedPaths = await applyEditOperations(operations, scenes, outputDir);

      await db.run(
        `UPDATE video_jobs SET current_stage = 'Chat-to-Edit uygulandı', progress_percent = 100 WHERE id = ?`,
        [jobId]
      );

      res.json({
        success: true,
        data: {
          processedFiles: processedPaths,
          sceneCount: scenes.length,
        },
      });
    } catch (err: any) {
      Logger.error('[ChatToEdit] Apply error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Uygulama hatası' });
    }
  });

  app.post('/api/v1/chat-edit/score', mediumLimiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const { jobId } = req.body;
      if (!jobId) {
        return res.status(400).json({ success: false, error: 'Job ID gerekli' });
      }

      const job: any = await db.get(
        'SELECT id, total_scenes FROM video_jobs WHERE id = ? AND user_id = ?',
        [jobId, req.session.userId]
      );
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job bulunamadı' });
      }

      const scenesBaseDir = path.join(process.cwd(), 'videolar', `job_${jobId}`);
      const sceneDirs = await fs.readdir(scenesBaseDir).catch(() => [] as string[]);
      const sceneInfos = sceneDirs
        .filter(d => d.startsWith('scene_'))
        .map(d => {
          const num = parseInt(d.replace('scene_', ''), 10);
          const srtPath = path.join(scenesBaseDir, d, 'transcript.srt');
          let speechText = '';
          if (fs.existsSync(srtPath)) {
            const content = fs.readFileSync(srtPath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim() && !l.includes('-->') && !/^\d+$/.test(l.trim()));
            speechText = lines.join(' ').trim();
          }
          return {
            sceneNumber: num,
            videoPath: path.join(scenesBaseDir, d, 'video.mp4'),
            speechText,
          };
        })
        .filter(s => !isNaN(s.sceneNumber));

      if (sceneInfos.length === 0) {
        return res.status(400).json({ success: false, error: 'Sahne bulunamadı' });
      }

      const scores = await scoreScenes(sceneInfos);

      res.json({ success: true, data: scores });
    } catch (err: any) {
      Logger.error('[ChatToEdit] Score error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Skorlama hatası' });
    }
  });
}
