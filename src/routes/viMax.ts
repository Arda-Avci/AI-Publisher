import { Application, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { heavyLimiter, mediumLimiter } from '../middleware/rate-limit.js';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import { runMultiAgentPipeline, qualityInspect } from '../services/multiAgentPipeline.js';
import {
  extractCharacters,
  generateAvatarImages,
  saveCharacterImages,
} from '../services/autoCameo.js';
import { validateSceneConsistency, validateFinalVideo } from '../services/mllmValidator.js';
import { generateRAGScript } from '../services/ragScriptGenerator.js';
import path from 'path';
import fs from 'fs-extra';
import { DIRECTORIES } from '../constants.js';

export function registerViMaxRoutes(app: Application): void {
  app.post(
    '/api/v1/vimax/pipeline',
    heavyLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { jobId } = req.body;
        if (!jobId) {
          return res.status(400).json({ success: false, error: 'Job ID gerekli' });
        }

        const job: any = await db.get(
          'SELECT id, master_prompt, production_notes, character_features FROM video_jobs WHERE id = ? AND user_id = ?',
          [jobId, req.session.userId],
        );
        if (!job) {
          return res.status(404).json({ success: false, error: 'Job bulunamadı' });
        }

        const result = await runMultiAgentPipeline(
          job.id,
          job.master_prompt || '',
          job.production_notes || '',
          job.character_features || '',
        );

        await db.run(
          `UPDATE video_jobs SET
          total_scenes = ?, scene_prompts = ?, current_stage = 'Multi-agent pipeline tamamlandı', progress_percent = 30
         WHERE id = ?`,
          [result.sceneStructure.length, JSON.stringify(result.sceneStructure), jobId],
        );

        res.json({ success: true, data: result });
      } catch (err: any) {
        Logger.error('[ViMax] Pipeline error:', err);
        res.status(500).json({ success: false, error: err?.message || 'Pipeline hatası' });
      }
    },
  );

  app.post(
    '/api/v1/vimax/auto-cameo',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { jobId, characterFeatures } = req.body;
        if (!jobId) {
          return res.status(400).json({ success: false, error: 'Job ID gerekli' });
        }

        const characters = await extractCharacters(characterFeatures || '');
        const withAvatars = await generateAvatarImages(characters);
        const savedPaths = await saveCharacterImages(withAvatars, jobId);

        res.json({
          success: true,
          data: {
            characters: withAvatars.map((c) => ({ label: c.label, hasAvatar: !!c.imageBase64 })),
            savedPaths,
          },
        });
      } catch (err: any) {
        Logger.error('[ViMax] AutoCameo error:', err);
        res.status(500).json({ success: false, error: err?.message || 'AutoCameo hatası' });
      }
    },
  );

  app.post(
    '/api/v1/vimax/validate-consistency',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { jobId } = req.body;
        if (!jobId) {
          return res.status(400).json({ success: false, error: 'Job ID gerekli' });
        }

        const job: any = await db.get(
          'SELECT id, scene_prompts FROM video_jobs WHERE id = ? AND user_id = ?',
          [jobId, req.session.userId],
        );
        if (!job) {
          return res.status(404).json({ success: false, error: 'Job bulunamadı' });
        }

        const scenes = job.scene_prompts ? JSON.parse(job.scene_prompts) : [];
        if (!Array.isArray(scenes) || scenes.length === 0) {
          return res.status(400).json({ success: false, error: 'Sahne bulunamadı' });
        }

        const report = await validateSceneConsistency(scenes);

        res.json({ success: true, data: report });
      } catch (err: any) {
        Logger.error('[ViMax] Validation error:', err);
        res.status(500).json({ success: false, error: err?.message || 'Validasyon hatası' });
      }
    },
  );

  app.post(
    '/api/v1/vimax/quality-inspect',
    mediumLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { jobId, sceneNumber } = req.body;
        if (!jobId || !sceneNumber) {
          return res.status(400).json({ success: false, error: 'Job ID ve sceneNumber gerekli' });
        }

        const job: any = await db.get(
          'SELECT id, scene_prompts FROM video_jobs WHERE id = ? AND user_id = ?',
          [jobId, req.session.userId],
        );
        if (!job) {
          return res.status(404).json({ success: false, error: 'Job bulunamadı' });
        }

        const scenes = job.scene_prompts ? JSON.parse(job.scene_prompts) : [];
        const scene = scenes.find((s: any) => s.sceneNumber === sceneNumber);
        if (!scene) {
          return res.status(404).json({ success: false, error: 'Sahne bulunamadı' });
        }

        const report = await qualityInspect(
          scene.sceneNumber,
          scene.videoPrompt || '',
          scene.speechText || '',
        );

        const finalVideoPath = path.join(process.cwd(), DIRECTORIES.VIDEO_OUTPUT, `final_${jobId}.mp4`);
        const hasFinalVideo = await fs.pathExists(finalVideoPath);
        let finalValidation = null;
        if (hasFinalVideo) {
          finalValidation = await validateFinalVideo(finalVideoPath, jobId, scenes.length);
        }

        res.json({ success: true, data: { qualityReport: report, finalValidation } });
      } catch (err: any) {
        Logger.error('[ViMax] Quality inspect error:', err);
        res.status(500).json({ success: false, error: err?.message || 'Kalite kontrol hatası' });
      }
    },
  );

  app.post(
    '/api/v1/vimax/rag-script',
    heavyLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { jobId, referenceContent } = req.body;
        if (!jobId) {
          return res.status(400).json({ success: false, error: 'Job ID gerekli' });
        }

        const job: any = await db.get(
          'SELECT id, master_prompt, production_notes, character_features FROM video_jobs WHERE id = ? AND user_id = ?',
          [jobId, req.session.userId],
        );
        if (!job) {
          return res.status(404).json({ success: false, error: 'Job bulunamadı' });
        }

        const script = await generateRAGScript(
          job.master_prompt || '',
          job.production_notes || '',
          job.character_features || '',
          referenceContent || '',
        );

        await db.run(`UPDATE video_jobs SET scene_prompts = ?, total_scenes = ? WHERE id = ?`, [
          JSON.stringify(script.scenes),
          script.scenes.length,
          jobId,
        ]);

        res.json({ success: true, data: script });
      } catch (err: any) {
        Logger.error('[ViMax] RAG script error:', err);
        res.status(500).json({ success: false, error: err?.message || 'RAG script hatası' });
      }
    },
  );
}
