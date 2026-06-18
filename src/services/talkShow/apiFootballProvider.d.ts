/**
 * API-Football provider for the Talk-Show.
 * Uses the existing API key from dashbord.api-football.com_key.txt
 *
 * Free plan: 100 requests/day, access to seasons 2022-2024.
 * League ID 203 = Süper Lig.
 */
import { MatchContext } from './types.js';
import { MatchFeed } from './dataSources.js';
export declare function isApiFootballConfigured(): boolean;
export interface TeamInfo {
    id: number;
    name: string;
    logo: string;
    country: string;
}
/** Fetch fixture by team names (find the most recent match between two teams). */
export declare function findFixture(homeTeam: string, awayTeam: string, season?: number): Promise<any | null>;
/** Fetch fixture details by fixture ID. */
export declare function getFixtureById(fixtureId: number): Promise<any | null>;
/** Build a MatchFeed from API-Football fixture data. */
export declare function fetchMatchFeed(match: MatchContext): Promise<MatchFeed>;
/** Standings lookup. */
export declare function fetchStandings(season?: number): Promise<any[]>;
/** Weather: API-Football doesn't have weather; fallback to stub. */
export { fetchWeather, fetchInjuries, fetchOdds } from './dataSources.js';
//# sourceMappingURL=apiFootballProvider.d.ts.map