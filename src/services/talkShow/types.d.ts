/**
 * Multi-Agent Talk-Show (Top Yuvarlak AI) — Shared types.
 *
 * Sprint 9 MVP: 5 specialist agents orchestrated by a meta-orchestrator.
 * External data sources (live match feeds, weather APIs, betting odds) are
 * stubbed in `dataSources.ts`; the orchestrator never blocks on real
 * network calls during tests.
 */
export type AgentRole = 'meta_orchestrator' | 'match_analyst' | 'former_player' | 'bookmaker' | 'data_scout';
export type Sentiment = 'bullish' | 'bearish' | 'neutral';
export interface AgentMessage {
    role: AgentRole;
    speaker: string;
    content: string;
    confidence: number;
    sentiment: Sentiment;
    evidence?: string[];
    timestamp: number;
}
export interface MatchContext {
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    venue: string;
    competition: string;
    weatherSummary?: string;
    injurySummary?: string;
    odds?: {
        home: number;
        draw: number;
        away: number;
    };
    xg?: {
        home: number;
        away: number;
    };
    fixtureId?: number;
    season?: number;
}
export interface OrchestratorInput {
    topic: string;
    match: MatchContext;
    rounds?: number;
    language?: 'tr' | 'en';
    useApiFootball?: boolean;
    characters?: Array<{
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
    transcript: AgentMessage[];
    summary: string;
    consensus: {
        pick: 'home' | 'draw' | 'away' | 'no_consensus';
        confidence: number;
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
//# sourceMappingURL=types.d.ts.map