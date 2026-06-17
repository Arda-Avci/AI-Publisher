/**
 * Multi-Agent Talk-Show (Top Yuvarlak AI) — Shared types.
 *
 * Sprint 9 MVP: 5 specialist agents orchestrated by a meta-orchestrator.
 * External data sources (live match feeds, weather APIs, betting odds) are
 * stubbed in `dataSources.ts`; the orchestrator never blocks on real
 * network calls during tests.
 */

export type AgentRole =
  | 'meta_orchestrator'
  | 'match_analyst' // Gemini — xG, tactics
  | 'former_player' // Claude — derby psychology, locker-room stress
  | 'bookmaker' // DeepSeek-style — odds movement, Kelly criterion
  | 'data_scout'; // weather, injuries, lineup

export type Sentiment = 'bullish' | 'bearish' | 'neutral';

export interface AgentMessage {
  role: AgentRole;
  speaker: string; // display name (e.g. "Maç Yorumcusu")
  content: string;
  confidence: number; // 0..1
  sentiment: Sentiment;
  evidence?: string[]; // bullet points the agent cites
  timestamp: number; // ms since epoch
}

export interface MatchContext {
  homeTeam: string;
  awayTeam: string;
  kickoff: string; // ISO datetime
  venue: string;
  competition: string;
  weatherSummary?: string;
  injurySummary?: string;
  odds?: { home: number; draw: number; away: number };
  xg?: { home: number; away: number };
  fixtureId?: number; // API-Football fixture ID
  season?: number; // Season year (default 2024)
}

export interface OrchestratorInput {
  topic: string; // free-form user question, e.g. "Derbiyi kim alır?"
  match: MatchContext;
  rounds?: number; // how many back-and-forth exchanges (default 3)
  language?: 'tr' | 'en'; // default 'tr'
  useApiFootball?: boolean; // use real API-Football data instead of stubs
  characters?: Array<{
    // user-selected characters for each agent role
    role: AgentRole;
    name: string;
    description: string;
    voice_id?: string;
    reference_image_base64?: string;
  }>;
}

export interface OrchestratorResult {
  topic: string;
  match: MatchContext;
  transcript: AgentMessage[]; // ordered, starting with meta-orchestrator intro
  summary: string; // meta-orchestrator's closing summary
  consensus: {
    pick: 'home' | 'draw' | 'away' | 'no_consensus';
    confidence: number; // 0..1
    rationale: string;
  };
  generatedAt: number;
  durationMs: number;
}

export interface AgentPromptContext {
  topic: string;
  match: MatchContext;
  priorMessages: AgentMessage[];
  characters?: OrchestratorInput['characters'];
  characterBlock?: string;
}
