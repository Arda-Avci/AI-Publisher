import { Application, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { heavyLimiter, mediumLimiter } from '../middleware/rate-limit.js';
import { pipecatBridge } from '../services/pipecatBridge.js';
import { heygenService, tavusService } from '../services/avatarService.js';
import { getAIModelChain } from '../lib/ai-provider.js';
import { generateText } from 'ai';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { broadcastProgress } from '../lib/redis.js';

export function registerPipecatRoutes(app: Application): void {
  app.post(
    '/api/v1/pipecat/start-server',
    heavyLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await pipecatBridge.start();
        res.json({ success: true, message: 'Pipecat server started' });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  app.post(
    '/api/v1/pipecat/stop-server',
    heavyLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await pipecatBridge.stop();
        res.json({ success: true, message: 'Pipecat server stopped' });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  app.get('/api/v1/pipecat/health', async (_req: Request, res: Response) => {
    const healthy = await pipecatBridge.healthCheck();
    res.json({ success: true, data: { healthy } });
  });

  app.post(
    '/api/v1/pipecat/pipeline',
    heavyLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { jobId, avatarProvider, avatarId, voiceId } = req.body;
        if (!jobId) {
          return res.status(400).json({ success: false, error: 'Job ID gerekli' });
        }

        const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
        if (!job) {
          return res.status(404).json({ success: false, error: 'Job bulunamadı' });
        }

        const scenes = await db.all(
          'SELECT scene_number, video_prompt, speech_text, sfx_prompt, camera_motion FROM video_scenes WHERE job_id = ? ORDER BY scene_number',
          [jobId],
        );

        if (scenes.length === 0) {
          return res.status(400).json({ success: false, error: 'Bu job için sahne bulunamadı' });
        }

        const pipelineId = `pipe_${jobId}_${Date.now()}`;

        const response = await pipecatBridge.startPipeline({
          pipelineId,
          scenes,
          avatarProvider: avatarProvider || 'heygen',
          avatarId: avatarId || undefined,
          voiceId: voiceId || undefined,
          language: 'tr',
          callbackUrl: `${req.protocol}://${req.get('host')}/api/v1/pipecat/callback`,
        });

        if (response.success) {
          await db.run(
            "UPDATE video_jobs SET current_stage = 'pipecat_pipeline', status = 'processing' WHERE id = ?",
            [jobId],
          );
        }

        pipecatBridge.onStatus(pipelineId, (status) => {
          broadcastProgress(jobId, {
            jobId,
            currentStage: 'pipecat_pipeline',
            progressPercent: status.progress ?? 0,
            completedScenes: status.currentScene ?? 0,
            totalScenes: status.totalScenes ?? 0,
            stage: 'pipecat_pipeline',
            progress: status.progress,
            message: status.message,
            currentScene: status.currentScene,
          });
        });

        res.json({ success: true, data: response });
      } catch (err: any) {
        Logger.error('[Pipecat] Pipeline error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  app.post('/api/v1/pipecat/cancel', requireAuth, async (req: Request, res: Response) => {
    try {
      const { pipelineId } = req.body;
      if (!pipelineId) {
        return res.status(400).json({ success: false, error: 'Pipeline ID gerekli' });
      }
      await pipecatBridge.cancelPipeline(pipelineId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get(
    '/api/v1/pipecat/pipeline/:pipelineId',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const pipelineId = req.params.pipelineId as string;
        const status = await pipecatBridge.getPipeline(pipelineId);
        res.json({ success: true, data: status });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  app.get('/api/v1/pipecat/pipelines', requireAuth, async (_req: Request, res: Response) => {
    try {
      const pipelines = await pipecatBridge.listPipelines();
      res.json({ success: true, data: pipelines });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post(
    '/api/v1/pipecat/avatar/generate',
    heavyLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { text, provider, avatarId, voiceId } = req.body;
        if (!text) {
          return res.status(400).json({ success: false, error: 'Text gerekli' });
        }

        const service = provider === 'tavus' ? tavusService : heygenService;
        const result = await service.generateAvatar({ text, avatarId, voiceId });

        res.json({ success: result.success, data: result });
      } catch (err: any) {
        Logger.error('[Pipecat] Avatar error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  app.post(
    '/api/v1/pipecat/broadcast',
    heavyLimiter,
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { pipelineId, message } = req.body;
        if (!pipelineId || !message) {
          return res.status(400).json({ success: false, error: 'pipelineId ve message gerekli' });
        }

        const models = getAIModelChain();
        const model = models[0];

        const result = await generateText({
          model,
          system: `You are a talk-show host. Respond in Turkish concisely with a natural conversational tone.`,
          prompt: message,
          abortSignal: AbortSignal.timeout(15000),
        });

        res.json({
          success: true,
          data: {
            pipelineId,
            response: result.text,
          },
        });
      } catch (err: any) {
        Logger.error('[Pipecat] Broadcast error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );
}
