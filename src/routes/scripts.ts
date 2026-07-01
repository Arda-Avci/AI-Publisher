import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { ScriptEngine } from '../services/talkShow/scriptEngine.js';
import { scriptToVideo } from '../services/talkShow/scriptToVideoAdapter.js';
import { CharacterService } from '../services/index.js';
import { Logger } from '../lib/logger.js';

export const scriptsRouter = Router();
export const scriptEngine = new ScriptEngine();

scriptsRouter.post(
  '/scripts/generate',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { show_id } = req.body;

    if (!show_id) {
      res.status(400).json({ error: 'show_id zorunludur.' });
      return;
    }

    try {
      const script = await scriptEngine.generateFullScript(Number(show_id), userId);
      res.json({ status: 'success', data: script });
    } catch (error: any) {
      Logger.error('[Scripts] Generate error:', error);
      const status =
        error.message.includes('No characters') || error.message.includes('not found') ? 400 : 500;
      res.status(status).json({ error: error.message || 'Script oluşturulamadı.' });
    }
  },
);

scriptsRouter.get(
  '/:showId/scripts',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const { showId } = req.params;

    try {
      const scripts = await scriptEngine.listScripts(Number(showId));
      res.json({ status: 'success', data: scripts });
    } catch (error: any) {
      Logger.error('[Scripts] List error:', error);
      res.status(500).json({ error: 'Scriptler listelenemedi.' });
    }
  },
);

scriptsRouter.get(
  '/scripts/:scriptId',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const { scriptId } = req.params;

    try {
      const script = await scriptEngine.getScript(Number(scriptId));
      if (!script) {
        res.status(404).json({ error: 'Script bulunamadı.' });
        return;
      }
      res.json({ status: 'success', data: script });
    } catch (error: any) {
      Logger.error('[Scripts] Get error:', error);
      res.status(500).json({ error: 'Script alınamadı.' });
    }
  },
);

scriptsRouter.put(
  '/scripts/:scriptId',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const { scriptId } = req.params;
    const { title, metadata } = req.body;

    try {
      const updated = await scriptEngine.updateScript(Number(scriptId), { title, metadata });
      if (!updated) {
        res.status(404).json({ error: 'Script bulunamadı.' });
        return;
      }
      res.json({ status: 'success', data: updated });
    } catch (error: any) {
      Logger.error('[Scripts] Update error:', error);
      res.status(500).json({ error: 'Script güncellenemedi.' });
    }
  },
);

scriptsRouter.delete(
  '/scripts/:scriptId',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const { scriptId } = req.params;

    try {
      const deleted = await scriptEngine.deleteScript(Number(scriptId));
      if (!deleted) {
        res.status(404).json({ error: 'Script bulunamadı.' });
        return;
      }
      res.json({ status: 'success', message: 'Script silindi.' });
    } catch (error: any) {
      Logger.error('[Scripts] Delete error:', error);
      res.status(500).json({ error: 'Script silinemedi.' });
    }
  },
);

scriptsRouter.put(
  '/scripts/:scriptId/segments/:segmentId',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const { scriptId, segmentId } = req.params;
    const { dialogue_text, camera_instruction, duration_seconds, scene_type } = req.body;

    try {
      const updated = await scriptEngine.updateSegment(Number(segmentId), {
        dialogue_text,
        camera_instruction,
        duration_seconds: duration_seconds ? Number(duration_seconds) : undefined,
        scene_type,
      });
      if (!updated) {
        res.status(404).json({ error: 'Segment bulunamadı.' });
        return;
      }
      if (updated.script_id !== Number(scriptId)) {
        res.status(400).json({ error: "Segment bu script'e ait değil." });
        return;
      }
      res.json({ status: 'success', data: updated });
    } catch (error: any) {
      Logger.error('[Scripts] Update segment error:', error);
      res.status(500).json({ error: 'Segment güncellenemedi.' });
    }
  },
);

scriptsRouter.post(
  '/scripts/:scriptId/regenerate/:segmentId',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const { scriptId, segmentId } = req.params;

    try {
      const updated = await scriptEngine.regenerateSegment(Number(scriptId), Number(segmentId));
      res.json({ status: 'success', data: updated });
    } catch (error: any) {
      Logger.error('[Scripts] Regenerate segment error:', error);
      const status =
        error.message.includes('not found') || error.message.includes('not belong') ? 400 : 500;
      res.status(status).json({ error: error.message || 'Segment yeniden oluşturulamadı.' });
    }
  },
);

scriptsRouter.post(
  '/scripts/:scriptId/produce',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { scriptId } = req.params;

    try {
      const script = await scriptEngine.getScript(Number(scriptId));
      if (!script) {
        res.status(404).json({ error: 'Script bulunamadı.' });
        return;
      }

      const charService = new CharacterService();
      const characters = await charService.findAll(userId);

      const { jobId } = await scriptToVideo(script, script.show_id, userId, characters);
      Logger.info(`[Scripts] Video production started: scriptId=${scriptId}, jobId=${jobId}`);

      res.json({
        status: 'success',
        data: { jobId, message: 'Video üretimi başlatıldı.' },
      });
    } catch (error: any) {
      Logger.error('[Scripts] Produce error:', error);
      res.status(500).json({ error: error.message || 'Video üretimi başlatılamadı.' });
    }
  },
);
