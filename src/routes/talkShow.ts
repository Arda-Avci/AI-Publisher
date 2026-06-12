import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { orchestrateTalkShow } from '../services/talkShow/orchestrator.js';
import { OrchestratorInput } from '../services/talkShow/types.js';
import { Logger } from '../lib/logger.js';

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
  if (input.rounds !== undefined && (typeof input.rounds !== 'number' || input.rounds < 1 || input.rounds > 6)) {
    return 'rounds 1-6 arasında olmalı';
  }
  return null;
}

talkShowRouter.post('/orchestrate', mediumLimiter, requireAuth, async (req: Request, res: Response) => {
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
});

talkShowRouter.get('/health', requireAuth, async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      agents: ['meta_orchestrator', 'match_analyst', 'former_player', 'bookmaker', 'data_scout'],
      version: 'sprint-9-mvp',
    },
  });
});
