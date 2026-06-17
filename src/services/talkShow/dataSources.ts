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
  recentForm: { home: string[]; away: string[] }; // ['W','L','D',...]
  headToHead: { winner: 'home' | 'away' | 'draw'; score: string }[];
  topScorers: { name: string; team: 'home' | 'away'; goals: number }[];
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

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function fetchMatchFeed(match: MatchContext): Promise<MatchFeed> {
  // Deterministic mock seeded by team names so tests are stable.
  const seed = hashCode(`${match.homeTeam}|${match.awayTeam}`);
  const formOptions = ['W', 'D', 'L'] as const;
  const recentForm = {
    home: Array.from({ length: 5 }, (_, i) => formOptions[(seed + i) % 3]),
    away: Array.from({ length: 5 }, (_, i) => formOptions[(seed * 2 + i) % 3]),
  };
  const headToHead = [
    { winner: 'home' as const, score: '2-1' },
    { winner: 'draw' as const, score: '1-1' },
    { winner: 'away' as const, score: '0-2' },
  ];
  const topScorers = [
    { name: `${match.homeTeam} Yıldızı`, team: 'home' as const, goals: 12 + (seed % 8) },
    { name: `${match.awayTeam} Forveti`, team: 'away' as const, goals: 9 + ((seed >> 1) % 7) },
  ];
  return { recentForm, headToHead, topScorers };
}

export async function fetchWeather(venue: string): Promise<WeatherSnapshot> {
  const seed = hashCode(venue);
  const conditions: WeatherSnapshot['condition'][] = ['clear', 'cloudy', 'rain', 'snow', 'fog'];
  return {
    tempC: 8 + (seed % 18),
    condition: conditions[seed % conditions.length],
    windKph: 5 + (seed % 30),
    humidity: 40 + (seed % 50),
  };
}

export async function fetchInjuries(match: MatchContext): Promise<InjuryReport[]> {
  const seed = hashCode(`${match.homeTeam}!${match.awayTeam}`);
  const statuses: InjuryReport['status'][] = ['out', 'doubtful', 'probable'];
  return [
    {
      team: 'home',
      player: `Yıldız ${seed % 11}`,
      status: statuses[seed % 3],
      reason: 'Kas sakatlığı',
    },
    {
      team: 'away',
      player: `Kaptan ${(seed >> 1) % 11}`,
      status: statuses[(seed + 1) % 3],
      reason: 'Sarı kart cezası',
    },
  ];
}

export async function fetchOdds(match: MatchContext): Promise<OddsSnapshot[]> {
  const homeBase = match.odds?.home ?? 2.1;
  const drawBase = match.odds?.draw ?? 3.4;
  const awayBase = match.odds?.away ?? 3.2;
  return [
    {
      bookmaker: 'Betsson',
      home: homeBase,
      draw: drawBase,
      away: awayBase,
      movement: 'home_shortening',
    },
    {
      bookmaker: 'Nesine',
      home: homeBase + 0.05,
      draw: drawBase,
      away: awayBase - 0.05,
      movement: 'stable',
    },
    {
      bookmaker: 'Misli',
      home: homeBase - 0.1,
      draw: drawBase + 0.1,
      away: awayBase,
      movement: 'home_drifting',
    },
  ];
}
