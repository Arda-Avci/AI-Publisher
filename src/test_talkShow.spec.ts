import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import bcrypt from 'bcrypt';
import { orchestrateTalkShow, __test__ } from './services/talkShow/orchestrator.js';
import { OrchestratorInput, OrchestratorResult, AgentMessage } from './services/talkShow/types.js';

vi.mock('./middleware/rate-limit.js', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  mediumLimiter: (_req: any, _res: any, next: any) => next(),
  heavyLimiter: (_req: any, _res: any, next: any) => next(),
  sseLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('./lib/redis.js', () => ({
  broadcastProgress: () => {},
  clients: new Map(),
}));

vi.mock('./lib/audit.js', () => ({
  logAudit: () => {},
}));

const MOCK_MATCH = {
  homeTeam: 'Galatasaray',
  awayTeam: 'Fenerbahçe',
  kickoff: '2026-07-15T19:00:00Z',
  venue: 'Rams Park',
  competition: 'Süper Lig',
  xg: { home: 1.6, away: 1.2 },
  odds: { home: 2.05, draw: 3.40, away: 3.30 },
};

const SAMPLE_INPUT: OrchestratorInput = {
  topic: 'Derbiyi kim kazanır?',
  match: MOCK_MATCH,
  rounds: 1,
  language: 'tr',
};

describe('Sprint 9 — Multi-Agent Talk-Show Orchestrator', () => {
  let app: express.Application;
  let authCookie = '';
  let adminUserId: number;

  beforeAll(async () => {
    process.env.COLAB_URL = 'https://mock-colab.ngrok-free.dev';
    await initDatabase();

    const encryptedAdmin = encryptUsername('admin');
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
    if (!existing) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [encryptedAdmin, hashedPassword]);
    }
    const user = await db.get('SELECT * FROM users WHERE username = ?', [encryptedAdmin]);
    adminUserId = user.id;

    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(session({ secret: 'test-secret-talkshow', resave: false, saveUninitialized: false }));
    app.use((req: any, _res, next) => {
      req.lang = req.session?.lang || 'tr';
      req.t = { invalidLogin: 'Geçersiz giriş' };
      next();
    });

    const { registerAuthRoutes } = await import('./routes/auth.js');
    const { talkShowRouter } = await import('./routes/talkShow.js');
    registerAuthRoutes(app);
    app.use('/api/v1/talkshow', talkShowRouter);

    const loginRes = await request(app).post('/login').send({ username: 'admin', password: 'admin123' });
    expect(loginRes.status).toBe(302);
    authCookie = loginRes.headers['set-cookie'][0].split(';')[0];
  });

  describe('1. Orchestrator core (deterministic, AI disabled)', () => {
    it('produces a transcript with one intro + 4 specialist + 1 closing per round', async () => {
      const result = await orchestrateTalkShow(SAMPLE_INPUT, { useAI: false });
      // 1 intro + (4 agents * 1 round) + 1 closing = 6 messages
      expect(result.transcript.length).toBe(6);
      expect(result.transcript[0].role).toBe('meta_orchestrator');
      expect(result.transcript[result.transcript.length - 1].role).toBe('meta_orchestrator');
      for (let i = 1; i < result.transcript.length - 1; i++) {
        expect(['match_analyst', 'former_player', 'bookmaker', 'data_scout']).toContain(result.transcript[i].role);
      }
    });

    it('every agent message has speaker, content, sentiment, confidence', async () => {
      const result = await orchestrateTalkShow(SAMPLE_INPUT, { useAI: false });
      for (const m of result.transcript) {
        expect(m.speaker).toBeTruthy();
        expect(m.content.length).toBeGreaterThan(5);
        expect(['bullish', 'bearish', 'neutral']).toContain(m.sentiment);
        expect(m.confidence).toBeGreaterThanOrEqual(0);
        expect(m.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('derives a consensus pick with rationale', async () => {
      const result = await orchestrateTalkShow(SAMPLE_INPUT, { useAI: false });
      expect(result.consensus).toBeDefined();
      expect(['home', 'away', 'draw', 'no_consensus']).toContain(result.consensus.pick);
      expect(result.consensus.confidence).toBeGreaterThanOrEqual(0);
      expect(result.consensus.confidence).toBeLessThanOrEqual(1);
      expect(result.consensus.rationale.length).toBeGreaterThan(5);
    });

    it('summary mentions both teams and the topic', async () => {
      const result = await orchestrateTalkShow(SAMPLE_INPUT, { useAI: false });
      expect(result.summary).toContain('Galatasaray');
      expect(result.summary).toContain('Fenerbahçe');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('match_analyst fallback uses xG direction for sentiment', async () => {
      const result = await orchestrateTalkShow(SAMPLE_INPUT, { useAI: false });
      const analyst = result.transcript.find((m) => m.role === 'match_analyst');
      expect(analyst).toBeDefined();
      // xG home > away → bullish
      expect(analyst!.sentiment).toBe('bullish');
      expect(analyst!.evidence?.length).toBeGreaterThan(0);
    });

    it('bookmaker fallback surfaces odds in evidence', async () => {
      const result = await orchestrateTalkShow(SAMPLE_INPUT, { useAI: false });
      const bookie = result.transcript.find((m) => m.role === 'bookmaker');
      expect(bookie).toBeDefined();
      expect(bookie!.content).toMatch(/oran|oranlar/i);
      expect(bookie!.evidence?.some((e) => /Betsson|Nesine|Misli/.test(e))).toBe(true);
    });

    it('data_scout fallback reports weather and injuries', async () => {
      const result = await orchestrateTalkShow(SAMPLE_INPUT, { useAI: false });
      const scout = result.transcript.find((m) => m.role === 'data_scout');
      expect(scout).toBeDefined();
      expect(scout!.content).toMatch(/Sıcaklık|°C|sıcaklık/i);
      expect(scout!.evidence?.length).toBeGreaterThanOrEqual(2);
    });

    it('multi-round: rounds=3 produces 1 + 4*3 + 1 = 14 messages', async () => {
      const result = await orchestrateTalkShow({ ...SAMPLE_INPUT, rounds: 3 }, { useAI: false });
      expect(result.transcript.length).toBe(1 + 4 * 3 + 1);
    });
  });

  describe('2. Helper exports', () => {
    it('averageSentiment reflects bullish/bearish majority', () => {
      const msgs: AgentMessage[] = [
        { role: 'match_analyst', speaker: 'A', content: 'x', confidence: 0.7, sentiment: 'bullish', timestamp: 0 },
        { role: 'match_analyst', speaker: 'A', content: 'x', confidence: 0.7, sentiment: 'bearish', timestamp: 0 },
      ];
      expect(__test__.averageSentiment(msgs)).toBe('neutral');
      const bullish: AgentMessage[] = [
        ...msgs,
        { role: 'match_analyst', speaker: 'A', content: 'x', confidence: 0.7, sentiment: 'bullish', timestamp: 0 },
      ];
      expect(__test__.averageSentiment(bullish)).toBe('bullish');
    });

    it('consensusFromTranscript falls back to no_consensus when no specialist messages', () => {
      const result = __test__.consensusFromTranscript([]);
      expect(result.pick).toBe('no_consensus');
    });
  });

  describe('3. REST API', () => {
    it('POST /api/v1/talkshow/orchestrate — runs the full orchestration', async () => {
      const res = await request(app)
        .post('/api/v1/talkshow/orchestrate')
        .set('Cookie', authCookie)
        .send(SAMPLE_INPUT);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data: OrchestratorResult = res.body.data;
      expect(data.transcript.length).toBeGreaterThanOrEqual(6);
      expect(data.match.homeTeam).toBe('Galatasaray');
    });

    it('rejects missing topic with 400', async () => {
      const res = await request(app)
        .post('/api/v1/talkshow/orchestrate')
        .set('Cookie', authCookie)
        .send({ match: MOCK_MATCH });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing match.homeTeam with 400', async () => {
      const res = await request(app)
        .post('/api/v1/talkshow/orchestrate')
        .set('Cookie', authCookie)
        .send({ topic: 't', match: { ...MOCK_MATCH, homeTeam: '' } });

      expect(res.status).toBe(400);
    });

    it('rejects rounds out of range with 400', async () => {
      const res = await request(app)
        .post('/api/v1/talkshow/orchestrate')
        .set('Cookie', authCookie)
        .send({ ...SAMPLE_INPUT, rounds: 99 });

      expect(res.status).toBe(400);
    });

    it('GET /api/v1/talkshow/health — returns agent roster', async () => {
      const res = await request(app)
        .get('/api/v1/talkshow/health')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.agents).toContain('meta_orchestrator');
      expect(res.body.data.agents.length).toBe(5);
    });

    it('rejects unauthenticated requests with redirect to /login', async () => {
      const res = await request(app)
        .post('/api/v1/talkshow/orchestrate')
        .send(SAMPLE_INPUT);

      // requireAuth redirects to /login
      expect([302, 401, 403]).toContain(res.status);
    });
  });
});
