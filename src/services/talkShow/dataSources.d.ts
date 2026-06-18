/**
 * Stub data sources for the multi-agent talk-show.
 *
 * Real Sportoto/weather/betting APIs are intentionally replaced with
 * deterministic mock data so the orchestrator is testable end-to-end
 * without external network calls. The stubs also make the orchestrator
 * safe to run in CI / dev mode where API keys are not configured.
 */
import { MatchContext } from './types.js';
export interface MatchFeed {
    recentForm: {
        home: string[];
        away: string[];
    };
    headToHead: {
        winner: 'home' | 'away' | 'draw';
        score: string;
    }[];
    topScorers: {
        name: string;
        team: 'home' | 'away';
        goals: number;
    }[];
}
export interface WeatherSnapshot {
    tempC: number;
    condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog';
    windKph: number;
    humidity: number;
}
export interface InjuryReport {
    team: 'home' | 'away';
    player: string;
    status: 'out' | 'doubtful' | 'probable';
    reason: string;
}
export interface OddsSnapshot {
    bookmaker: string;
    home: number;
    draw: number;
    away: number;
    movement: 'home_shortening' | 'home_drifting' | 'stable';
}
export declare function fetchMatchFeed(match: MatchContext): Promise<MatchFeed>;
export declare function fetchWeather(venue: string): Promise<WeatherSnapshot>;
export declare function fetchInjuries(match: MatchContext): Promise<InjuryReport[]>;
export declare function fetchOdds(match: MatchContext): Promise<OddsSnapshot[]>;
//# sourceMappingURL=dataSources.d.ts.map