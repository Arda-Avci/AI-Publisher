/**
 * Talk-show agent definitions and the deterministic orchestrator.
 *
 * Each agent has a persona, a system prompt template, and a fallback
 * "template response" that is used when the AI call fails or is
 * disabled (e.g. in tests, offline, or when API keys are missing).
 */

import { getAIModelChain } from '../../lib/ai-provider.js';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { Logger } from '../../lib/logger.js';
import {
  AgentMessage,
  AgentPromptContext,
  AgentRole,
  MatchContext,
  OrchestratorInput,
  OrchestratorResult,
  Sentiment,
} from './types.js';
import {
  fetchInjuries,
  fetchMatchFeed as stubFetchMatchFeed,
  fetchOdds,
  fetchWeather,
  InjuryReport,
  MatchFeed,
  OddsSnapshot,
  WeatherSnapshot,
} from './dataSources.js';
import {
  fetchMatchFeed as apiFetchMatchFeed,
  isApiFootballConfigured,
  findFixture,
} from './apiFootballProvider.js';

const ROUNDS_DEFAULT = 3;

const AGENT_META: Record<AgentRole, { name: string; provider: string }> = {
  meta_orchestrator: { name: 'Sunucu', provider: 'zen' },
  match_analyst: { name: 'Maç Yorumcusu', provider: 'gemini' },
  former_player: { name: 'Eski Futbolcu', provider: 'claude' },
  bookmaker: { name: 'Kumarbaz', provider: 'deepseek' },
  data_scout: { name: 'İstihbarat Subayı', provider: 'zen' },
};

function getAgentName(role: AgentRole, characters?: OrchestratorInput['characters']): string {
  if (characters) {
    const match = characters.find((c) => c.role === role);
    if (match) return match.name;
  }
  return AGENT_META[role]?.name || role;
}

export interface OrchestratorDeps {
  fetchMatchFeed?: (m: MatchContext) => Promise<MatchFeed>;
  fetchWeather?: (venue: string) => Promise<WeatherSnapshot>;
  fetchInjuries?: (m: MatchContext) => Promise<InjuryReport[]>;
  fetchOdds?: (m: MatchContext) => Promise<OddsSnapshot[]>;
  generateText?: typeof generateText;
  useAI?: boolean;
}

const defaultDeps: Required<OrchestratorDeps> = {
  fetchMatchFeed: stubFetchMatchFeed,
  fetchWeather,
  fetchInjuries,
  fetchOdds,
  generateText: generateText as typeof generateText,
  useAI: process.env.NODE_ENV !== 'test',
};

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function averageSentiment(messages: AgentMessage[]): Sentiment {
  if (messages.length === 0) return 'neutral';
  const score = messages.reduce((acc, m) => {
    if (m.sentiment === 'bullish') return acc + 1;
    if (m.sentiment === 'bearish') return acc - 1;
    return acc;
  }, 0);
  if (score > 0.5) return 'bullish';
  if (score < -0.5) return 'bearish';
  return 'neutral';
}

function averageConfidence(messages: AgentMessage[]): number {
  if (messages.length === 0) return 0;
  return clamp01(messages.reduce((a, m) => a + m.confidence, 0) / messages.length);
}

// --- Fallback template responses (no AI required) ---

function fallbackMessage(
  role: AgentRole,
  ctx: AgentPromptContext,
  deps: MatchBundle,
): AgentMessage {
  const speaker = AGENT_META[role].name;
  const base: Pick<AgentMessage, 'role' | 'speaker' | 'timestamp'> = {
    role,
    speaker,
    timestamp: Date.now(),
  };

  switch (role) {
    case 'match_analyst': {
      const xgHome = ctx.match.xg?.home ?? 1.4;
      const xgAway = ctx.match.xg?.away ?? 1.1;
      const pick = xgHome > xgAway ? 'home' : xgHome < xgAway ? 'away' : 'draw';
      return {
        ...base,
        content: `xG verilerine bakarsak ${ctx.match.homeTeam} ${xgHome.toFixed(2)} - ${xgAway.toFixed(2)} ${ctx.match.awayTeam}. ${pick === 'home' ? 'Ev sahibi hafif önde.' : pick === 'away' ? 'Deplasman beklenmedik bir sürpriz yapabilir.' : 'Dengede bir karşılaşma.'}`,
        confidence: 0.72,
        sentiment: pick === 'home' ? 'bullish' : pick === 'away' ? 'bearish' : 'neutral',
        evidence: [
          `xG home: ${xgHome.toFixed(2)}`,
          `xG away: ${xgAway.toFixed(2)}`,
          `Son 5 maç form: ${deps.feed.recentForm.home.join('-')} vs ${deps.feed.recentForm.away.join('-')}`,
        ],
      };
    }
    case 'former_player': {
      return {
        ...base,
        content: `Derbi atmosferinde taraftar baskısı her şeyi değiştirebilir. ${ctx.match.venue} sahasında son 3 derbiyi hatırlayın; oyuncuların omuzlarındaki yük bambaşka.`,
        confidence: 0.65,
        sentiment: 'neutral',
        evidence: [
          `Mekan: ${ctx.match.venue}`,
          `Hava: ${deps.weather.tempC}°C ${deps.weather.condition}`,
        ],
      };
    }
    case 'bookmaker': {
      const home = deps.odds[0]?.home ?? 2.1;
      const draw = deps.odds[0]?.draw ?? 3.4;
      const away = deps.odds[0]?.away ?? 3.2;
      const fav = home < away ? 'home' : 'away';
      const valueEdge = Math.abs(1 / home - 1 / away) * 0.05;
      return {
        ...base,
        content: `Piyasa oranları ev sahibi ${home.toFixed(2)} / beraberlik ${draw.toFixed(2)} / deplasman ${away.toFixed(2)} veriyor. ${fav === 'home' ? 'Ev sahibi kısalıyor' : 'Deplasman short süreli hareketli'}; %${(valueEdge * 100).toFixed(1)} Kelly kenarı var.`,
        confidence: 0.7,
        sentiment: fav === 'home' ? 'bullish' : 'bearish',
        evidence: deps.odds.map(
          (o) => `${o.bookmaker}: ${o.home}-${o.draw}-${o.away} (${o.movement})`,
        ),
      };
    }
    case 'data_scout': {
      const injuries = deps.injuries
        .map((i) => `${i.team.toUpperCase()} ${i.player} (${i.status})`)
        .join(', ');
      return {
        ...base,
        content: `Saha: ${deps.weather.tempC}°C ${deps.weather.condition}, rüzgar ${deps.weather.windKph} km/s. Sakatlıklar: ${injuries}.`,
        confidence: 0.8,
        sentiment: 'neutral',
        evidence: [
          `Sıcaklık: ${deps.weather.tempC}°C`,
          `Rüzgar: ${deps.weather.windKph} km/s`,
          ...deps.injuries.map((i) => `${i.team} - ${i.player}: ${i.status} (${i.reason})`),
        ],
      };
    }
    case 'meta_orchestrator':
    default:
      return {
        ...base,
        content: `${ctx.match.homeTeam} vs ${ctx.match.awayTeam} — ${ctx.topic}`,
        confidence: 1,
        sentiment: 'neutral',
      };
  }
}

interface MatchBundle {
  feed: MatchFeed;
  weather: WeatherSnapshot;
  injuries: InjuryReport[];
  odds: OddsSnapshot[];
}

async function buildBundle(
  input: OrchestratorInput,
  deps: Required<OrchestratorDeps>,
): Promise<MatchBundle> {
  const [feed, weather, injuries, odds] = await Promise.all([
    deps.fetchMatchFeed(input.match),
    deps.fetchWeather(input.match.venue),
    deps.fetchInjuries(input.match),
    deps.fetchOdds(input.match),
  ]);
  return { feed, weather, injuries, odds };
}

function consensusFromTranscript(transcript: AgentMessage[]): OrchestratorResult['consensus'] {
  const analyst = transcript.find((m) => m.role === 'match_analyst');
  const bookie = transcript.find((m) => m.role === 'bookmaker');
  const player = transcript.find((m) => m.role === 'former_player');

  const votes: Array<'home' | 'away' | 'draw' | 'no_consensus'> = [];
  for (const m of [analyst, bookie, player]) {
    if (!m) continue;
    if (m.sentiment === 'bullish') votes.push('home');
    else if (m.sentiment === 'bearish') votes.push('away');
    else votes.push('draw');
  }
  if (votes.length === 0) {
    return { pick: 'no_consensus', confidence: 0, rationale: 'Ajanlar yetersiz sinyal üretti' };
  }
  const counts: Record<string, number> = {};
  for (const v of votes) counts[v] = (counts[v] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) {
    return { pick: 'no_consensus', confidence: 0, rationale: 'Ajanlar yetersiz sinyal üretti' };
  }
  const pick = top[0] as 'home' | 'away' | 'draw' | 'no_consensus';
  const confidence = clamp01((top[1] / votes.length) * averageConfidence(transcript));
  return {
    pick,
    confidence,
    rationale: `3 ajan ${votes.length} oy kullandı; en çok oy ${pick} (${top[1]}/${votes.length}). Ortalama güven: ${(confidence * 100).toFixed(0)}%`,
  };
}

async function aiGenerate(
  role: AgentRole,
  system: string,
  prompt: string,
  deps: Required<OrchestratorDeps>,
): Promise<string> {
  if (!deps.useAI) throw new Error('AI disabled');
  const provider = AGENT_META[role]?.provider || 'zen';

  let model: any;
  if (provider === 'gemini') {
    model = google('gemini-2.5-flash');
  } else if (provider === 'claude') {
    if (process.env.ANTHROPIC_API_KEY) {
      const baseURL =
        (process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic').replace(/\/+$/, '') +
        '/v1';
      model = createAnthropic({ baseURL, apiKey: process.env.ANTHROPIC_API_KEY })('MiniMax-M3');
    } else {
      model = getAIModelChain()[0];
    }
  } else if (provider === 'deepseek') {
    if (process.env.DEEPSEEK_API_KEY) {
      model = createOpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY,
      } as any)('deepseek-chat');
    } else {
      model = getAIModelChain()[0];
    }
  } else {
    const models = getAIModelChain();
    model = models[0];
  }

  if (!model) throw new Error('No AI model available for this agent');

  const res = await deps.generateText({
    model,
    system,
    prompt,
    abortSignal: AbortSignal.timeout(20000),
  });
  return res.text;
}

function systemPromptFor(role: AgentRole): string {
  switch (role) {
    case 'match_analyst':
      return 'Sen profesyonel bir futbol analistisin. Sohbet kısa, veri odaklı ve Türkçe olsun.';
    case 'former_player':
      return 'Sen eski bir profesyonel futbolcusun. Saha içi psikoloji ve tribün baskısı odağında, kısa ve doğal konuş.';
    case 'bookmaker':
      return 'Sen deneyimli bir bahis analistisin. Oranlar, hareket yönü ve Kelly kriterine vurgu yap, kısa ve net ol.';
    case 'data_scout':
      return 'Sen bir istihbarat subayısın. Hava, saha, sakatlık ve kadro bilgisini raporlayarak tartışmaya zemin hazırla.';
    case 'meta_orchestrator':
    default:
      return 'Sen bir talk-show sunucusunun moderatör yardımcısısın. Kısa, yapılandırılmış ve yönlendirici konuş.';
  }
}

async function runAgent(
  role: AgentRole,
  ctx: AgentPromptContext,
  deps: Required<OrchestratorDeps>,
  bundle: MatchBundle,
): Promise<AgentMessage> {
  const speaker = ctx.characters
    ? (ctx.characters.find((c) => c.role === role)?.name ?? AGENT_META[role]?.name ?? role)
    : (AGENT_META[role]?.name ?? role);
  const baseFallback = { ...fallbackMessage(role, ctx, bundle), speaker };
  const prompt = [
    ctx.characterBlock || '',
    `Konu: ${ctx.topic}`,
    `Maç: ${ctx.match.homeTeam} vs ${ctx.match.awayTeam} — ${ctx.match.venue}`,
    `Hava: ${bundle.weather.tempC}°C ${bundle.weather.condition}, rüzgar ${bundle.weather.windKph} km/s`,
    `Sakatlıklar: ${bundle.injuries.map((i) => `${i.team} ${i.player} (${i.status})`).join('; ')}`,
    `Oranlar: ${bundle.odds.map((o) => `${o.bookmaker} ${o.home}/${o.draw}/${o.away}`).join('; ')}`,
    `Önceki konuşmalar: ${ctx.priorMessages.map((m) => `${m.speaker}: ${m.content}`).join(' | ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const text = await aiGenerate(role, systemPromptFor(role), prompt, deps);
    return {
      ...baseFallback,
      content: text.trim().slice(0, 480),
    };
  } catch (err) {
    Logger.warn(`[TalkShow] AI yanıtı alınamadı, fallback kullanılıyor: ${(err as Error).message}`);
    return baseFallback;
  }
}

export async function orchestrateTalkShow(
  input: OrchestratorInput,
  depsOverrides?: OrchestratorDeps,
): Promise<OrchestratorResult> {
  const deps: Required<OrchestratorDeps> = { ...defaultDeps, ...(depsOverrides ?? {}) };

  // Switch to real API-Football data when requested
  if (input.useApiFootball && isApiFootballConfigured()) {
    try {
      Logger.info('[TalkShow] API-Football kullanılıyor');
      deps.fetchMatchFeed = apiFetchMatchFeed;
      // Fetch fixture ID if not provided but teams are
      if (!input.match.fixtureId) {
        const fixture = await findFixture(
          input.match.homeTeam,
          input.match.awayTeam,
          input.match.season,
        );
        if (fixture) {
          input.match.fixtureId = fixture.fixture?.id;
          input.match.venue = fixture.fixture?.venue?.name || input.match.venue;
          input.match.kickoff = fixture.fixture?.date || input.match.kickoff;
          if (fixture.goals?.home !== null) {
            input.match.xg = { home: fixture.goals.home ?? 0, away: fixture.goals.away ?? 0 };
          }
        }
      }
    } catch (err) {
      Logger.warn(`[TalkShow] API-Football hatası, stub kullanılıyor: ${(err as Error).message}`);
    }
  }

  const t0 = Date.now();
  const rounds = input.rounds ?? ROUNDS_DEFAULT;

  // Build character consistency block (Comic-Studio-Ai pattern)
  const charBlock =
    (input.characters?.length ?? 0) > 0
      ? [
          '',
          'KARAKTER TANIMLARI (tüm sahnelerde aynı kalmalı):',
          ...(input.characters ?? []).map((c) => `- ${c.name} (${c.role}): ${c.description}`),
          'TUTARLILIK GEREKSİNİMİ: Her ajan kendi karakterini aynı kişilik, aynı ses tonu ve aynı fiziksel özelliklerle canlandırmalıdır.',
          '',
        ].join('\n')
      : '';

  const bundle = await buildBundle(input, deps);
  const transcript: AgentMessage[] = [];
  const baseCtx: Omit<AgentPromptContext, 'priorMessages'> = {
    topic: input.topic,
    match: input.match,
    characters: input.characters,
    characterBlock: charBlock,
  };

  // Round 0: meta-orchestrator sets the stage
  const intro = await runAgent(
    'meta_orchestrator',
    { ...baseCtx, priorMessages: [] },
    deps,
    bundle,
  );
  transcript.push(intro);

  // Rounds of specialist debate: analyst → player → bookie → data_scout
  const order: AgentRole[] = ['match_analyst', 'former_player', 'bookmaker', 'data_scout'];
  for (let r = 0; r < rounds; r++) {
    for (const role of order) {
      const msg = await runAgent(role, { ...baseCtx, priorMessages: transcript }, deps, bundle);
      transcript.push(msg);
    }
  }

  // Closing summary from meta-orchestrator
  const closing = await runAgent(
    'meta_orchestrator',
    { ...baseCtx, priorMessages: transcript },
    deps,
    bundle,
  );
  transcript.push(closing);

  const consensus = consensusFromTranscript(transcript);
  const summary = `${input.match.homeTeam} - ${input.match.awayTeam} maçı için ${rounds} tur tartışma sonucu ${consensus.pick} yönünde görüş (güven ${(consensus.confidence * 100).toFixed(0)}%).`;

  return {
    topic: input.topic,
    match: input.match,
    transcript,
    summary,
    consensus,
    generatedAt: Date.now(),
    durationMs: Date.now() - t0,
  };
}

export const __test__ = {
  averageSentiment,
  averageConfidence,
  consensusFromTranscript,
};
