/**
 * Talk-show agent definitions and the deterministic orchestrator.
 *
 * Each agent has a persona, a system prompt template, and a fallback
 * "template response" that is used when the AI call fails or is
 * disabled (e.g. in tests, offline, or when API keys are missing).
 */
import { generateText } from 'ai';
import { AgentMessage, MatchContext, OrchestratorInput, OrchestratorResult, Sentiment } from './types.js';
import { InjuryReport, MatchFeed, OddsSnapshot, WeatherSnapshot } from './dataSources.js';
export interface OrchestratorDeps {
    fetchMatchFeed?: (m: MatchContext) => Promise<MatchFeed>;
    fetchWeather?: (venue: string) => Promise<WeatherSnapshot>;
    fetchInjuries?: (m: MatchContext) => Promise<InjuryReport[]>;
    fetchOdds?: (m: MatchContext) => Promise<OddsSnapshot[]>;
    generateText?: typeof generateText;
    useAI?: boolean;
}
declare function averageSentiment(messages: AgentMessage[]): Sentiment;
declare function averageConfidence(messages: AgentMessage[]): number;
declare function consensusFromTranscript(transcript: AgentMessage[]): OrchestratorResult['consensus'];
export declare function orchestrateTalkShow(input: OrchestratorInput, depsOverrides?: OrchestratorDeps): Promise<OrchestratorResult>;
export declare const __test__: {
    averageSentiment: typeof averageSentiment;
    averageConfidence: typeof averageConfidence;
    consensusFromTranscript: typeof consensusFromTranscript;
};
export {};
//# sourceMappingURL=orchestrator.d.ts.map