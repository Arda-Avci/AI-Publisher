import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { orchestrateTalkShow } from '../services/talkShow/orchestrator.js';
import { OrchestratorInput } from '../services/talkShow/types.js';
import { Logger } from '../lib/logger.js';
import { fetchWeeklyDiscussion, discussionToScenes } from '../services/talkShow/sportotoBridge.js';
import { scriptEngine } from './scripts.js';
import { orchestrateToVideo } from '../services/talkShow/orchestratorToVideo.js';
import { produceTalkShowVideo } from '../services/talkShow/videoProducer.js';
import { DIRECTORIES } from '../constants.js';

export const talkShowRouter = Router();

function validateMatch(input: any): string | null {
  if (!input || typeof input !== 'object') return 'Geçersiz istek gövdesi';
  if (typeof input.topic !== 'string' || !input.topic.trim()) return 'topic zorunlu';
  if (!input.match || typeof input.match !== 'object') return 'match zorunlu';
  const m = input.match;
  if (typeof m.homeTeam !== 'string' || !m.homeTeam) return 'match.homeTeam zorunlu';
  if (typeof m.awayTeam !== 'string' || !m.awayTeam) return 'match.awayTeam zorunlu';
  if (typeof m.kickoff !== 'string') return 'match.kickoff zorunlu (ISO datetime)';
  if (typeof m.venue !== 'string') return 'match.venue zorunlu';
  if (typeof m.competition !== 'string') return 'match.competition zorunlu';
  if (
    input.rounds !== undefined &&
    (typeof input.rounds !== 'number' || input.rounds < 1 || input.rounds > 6)
  ) {
    return 'rounds 1-6 arasında olmalı';
  }
  return null;
}

talkShowRouter.post(
  '/orchestrate',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const err = validateMatch(req.body);
      if (err) return res.status(400).json({ success: false, error: err });

      const input: OrchestratorInput = {
        topic: req.body.topic,
        match: req.body.match,
        rounds: req.body.rounds ?? 3,
        language: req.body.language ?? 'tr',
        useApiFootball: req.body.useApiFootball ?? false,
        characters: req.body.characters,
      };

      const result = await orchestrateTalkShow(input);
      res.json({ success: true, data: result });
    } catch (err: any) {
      Logger.error('[TalkShow] orchestrate error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Orchestrator hatası' });
    }
  },
);

/**
 * GET /api/v1/talkshow/sportoto/:week
 * Sportoto projesinden haftalık tartışma programını çeker.
 */
talkShowRouter.get(
  '/sportoto/:week',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const weekNumber = parseInt(String(req.params.week), 10);
      if (isNaN(weekNumber) || weekNumber < 1) {
        return res.status(400).json({ success: false, error: 'Geçersiz hafta numarası' });
      }

      const discussion = await fetchWeeklyDiscussion(weekNumber);
      const scenes = discussionToScenes(discussion);

      res.json({
        success: true,
        data: {
          title: discussion.title,
          sportoto_week: discussion.sportoto_week,
          total_utterances: discussion.total_utterances,
          utterances: discussion.utterances,
          scenes,
        },
      });
    } catch (err: any) {
      Logger.error('[TalkShow] Sportoto fetch error:', err);
      res.status(502).json({ success: false, error: `Sportoto bağlantı hatası: ${err.message}` });
    }
  },
);

/**
 * POST /api/v1/talkshow/sportoto/:week/produce
 * Sportoto tartışma programını video olarak üretir.
 */
talkShowRouter.post(
  '/sportoto/:week/produce',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const weekNumber = parseInt(String(req.params.week), 10);
      if (isNaN(weekNumber) || weekNumber < 1) {
        return res.status(400).json({ success: false, error: 'Geçersiz hafta numarası' });
      }

      const discussion = await fetchWeeklyDiscussion(weekNumber);
      const outputDir = path.join(process.cwd(), DIRECTORIES.VIDEO_OUTPUT);
      await fs.ensureDir(outputDir);
      const outputPath = path.join(outputDir, `talkshow_week_${weekNumber}_${Date.now()}.mp4`);

      // Async production (arka planda)
      produceTalkShowVideo(discussion, outputPath)
        .then((finalPath) => {
          Logger.info(`[TalkShow] Video produced: ${finalPath}`);
        })
        .catch((err) => {
          Logger.error(`[TalkShow] Video production failed:`, err);
        });

      res.json({
        success: true,
        data: {
          message: `Hafta ${weekNumber} talk show video üretimi başladı`,
          outputPath,
          utterances: discussion.utterances.length,
        },
      });
    } catch (err: any) {
      Logger.error('[TalkShow] Video production error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

talkShowRouter.post(
  '/orchestrate/video',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const err = validateMatch(req.body);
      if (err) return res.status(400).json({ success: false, error: err });

      const input: OrchestratorInput = {
        topic: req.body.topic,
        match: req.body.match,
        rounds: req.body.rounds ?? 3,
        language: req.body.language ?? 'tr',
        useApiFootball: req.body.useApiFootball ?? false,
        characters: req.body.characters,
      };

      const result = await orchestrateTalkShow(input);
      const outputDir = path.join(process.cwd(), DIRECTORIES.VIDEO_OUTPUT);
      await fs.ensureDir(outputDir);
      const outputPath = path.join(outputDir, `orchestrate_${Date.now()}.mp4`);

      const videoResult = await orchestrateToVideo({
        result,
        outputPath,
      });

      Logger.info(`[TalkShow] Orchestrate video produced: ${videoResult.outputPath}`);

      res.json({
        success: true,
        data: {
          videoPath: videoResult.outputPath,
          totalDuration: videoResult.totalDuration,
          sceneCount: videoResult.sceneCount,
          transcript: result.transcript,
          consensus: result.consensus,
          summary: result.summary,
        },
      });
    } catch (err: any) {
      Logger.error('[TalkShow] Orchestrate video error:', err);
      res.status(500).json({ success: false, error: err.message || 'Video üretimi başarısız.' });
    }
  },
);

talkShowRouter.post(
  '/sportoto/:week/generate-script',
  mediumLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const weekNumber = parseInt(String(req.params.week), 10);
      if (isNaN(weekNumber) || weekNumber < 1) {
        return res.status(400).json({ success: false, error: 'Geçersiz hafta numarası' });
      }

      const { show_id } = req.body;
      if (!show_id) {
        return res.status(400).json({ success: false, error: 'show_id zorunludur.' });
      }

      const discussion = await fetchWeeklyDiscussion(weekNumber);
      const userId = req.session.userId!;

      const script = await scriptEngine.generateFromDiscussion(Number(show_id), userId, discussion);

      Logger.info(
        `[TalkShow] Sportoto script generated: scriptId=${script.id}, week=${weekNumber}`,
      );

      res.json({ success: true, data: script });
    } catch (err: any) {
      Logger.error('[TalkShow] Sportoto script generation error:', err);
      const status =
        err.message.includes('not found') || err.message.includes('No characters') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message || 'Script oluşturulamadı.' });
    }
  },
);

talkShowRouter.get('/health', requireAuth, async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      agents: ['meta_orchestrator', 'match_analyst', 'former_player', 'bookmaker', 'data_scout'],
      version: 'sprint-9-mvp',
    },
  });
});
