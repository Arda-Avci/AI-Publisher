/**
 * API-Football provider for the Talk-Show.
 * Uses the existing API key from dashbord.api-football.com_key.txt
 * 
 * Free plan: 100 requests/day, access to seasons 2022-2024.
 * League ID 203 = Süper Lig.
 */

import axios from 'axios';
import { MatchContext } from './types.js';
import { MatchFeed, WeatherSnapshot, InjuryReport, OddsSnapshot } from './dataSources.js';

const BASE_URL = 'https://v3.football.api-sports.io';
const SUPER_LIG_ID = 203;
const DEFAULT_SEASON = 2024;

const apiKey = process.env.API_FOOTBALL_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-rapidapi-key': apiKey || '',
    'x-rapidapi-host': 'v3.football.api-sports.io',
  },
  timeout: 10000,
});

export function isApiFootballConfigured(): boolean {
  return !!apiKey;
}

export interface TeamInfo {
  id: number;
  name: string;
  logo: string;
  country: string;
}

/** Fetch fixture by team names (find the most recent match between two teams). */
export async function findFixture(homeTeam: string, awayTeam: string, season = DEFAULT_SEASON): Promise<any | null> {
  try {
    const res = await client.get('/fixtures', {
      params: { league: SUPER_LIG_ID, season: season, status: 'FT' },
    });
    const fixtures = res.data?.response || [];
    // Find a match where home/away names roughly match
    const match = fixtures.find((f: any) => {
      const home = f.teams?.home?.name?.toLowerCase() || '';
      const away = f.teams?.away?.name?.toLowerCase() || '';
      return home.includes(homeTeam.toLowerCase()) && away.includes(awayTeam.toLowerCase());
    });
    return match || null;
  } catch {
    return null;
  }
}

/** Fetch fixture details by fixture ID. */
export async function getFixtureById(fixtureId: number): Promise<any | null> {
  try {
    const res = await client.get('/fixtures', { params: { id: fixtureId } });
    return res.data?.response?.[0] || null;
  } catch {
    return null;
  }
}

/** Build a MatchFeed from API-Football fixture data. */
export async function fetchMatchFeed(match: MatchContext): Promise<MatchFeed> {
  const season = match.season || DEFAULT_SEASON;
  const fixture = await findFixture(match.homeTeam, match.awayTeam, season);
  if (!fixture) throw new Error(`Fixture not found for ${match.homeTeam} vs ${match.awayTeam}`);

  const home = fixture.teams?.home?.name || match.homeTeam;
  const away = fixture.teams?.away?.name || match.awayTeam;
  const score = fixture.goals;
  const homeGoals = score?.home ?? 0;
  const awayGoals = score?.away ?? 0;

  // Head to head
  const h2hRes = await client.get('/fixtures/headtohead', {
    params: { h2h: `${fixture.teams?.home?.id}-${fixture.teams?.away?.id}`, season: season, last: 5 },
  }).catch(() => null);
  const h2hData = h2hRes?.data?.response || [];
  const headToHead = h2hData.slice(0, 5).map((f: any) => ({
    winner: (f.goals?.home ?? 0) > (f.goals?.away ?? 0) ? 'home' as const
      : (f.goals?.away ?? 0) > (f.goals?.home ?? 0) ? 'away' as const
      : 'draw' as const,
    score: `${f.goals?.home ?? 0}-${f.goals?.away ?? 0}`,
  }));

  // Recent form (last 5)
  const teamHomeId = fixture.teams?.home?.id;
  const teamAwayId = fixture.teams?.away?.id;
  const formRes = await client.get('/fixtures', {
    params: { league: SUPER_LIG_ID, season: season, team: teamHomeId, last: 5 },
  }).catch(() => null);
  const homeFixtures = formRes?.data?.response || [];
  const recentHome = homeFixtures.map((f: any) => {
    const hGoals = f.goals?.home ?? 0;
    const aGoals = f.goals?.away ?? 0;
    const isHome = f.teams?.home?.id === teamHomeId;
    return isHome ? (hGoals > aGoals ? 'W' : hGoals < aGoals ? 'L' : 'D') : (aGoals > hGoals ? 'W' : aGoals < hGoals ? 'L' : 'D');
  });

  const formResAway = await client.get('/fixtures', {
    params: { league: SUPER_LIG_ID, season: season, team: teamAwayId, last: 5 },
  }).catch(() => null);
  const awayFixtures = formResAway?.data?.response || [];
  const recentAway = awayFixtures.map((f: any) => {
    const hGoals = f.goals?.home ?? 0;
    const aGoals = f.goals?.away ?? 0;
    const isHome = f.teams?.home?.id === teamAwayId;
    return isHome ? (hGoals > aGoals ? 'W' : hGoals < aGoals ? 'L' : 'D') : (aGoals > hGoals ? 'W' : aGoals < hGoals ? 'L' : 'D');
  });

  // Top scorers
  const scorersRes = await client.get('/players/topscorers', {
    params: { league: SUPER_LIG_ID, season: season },
  }).catch(() => null);
  const scorers = (scorersRes?.data?.response || []).slice(0, 3).map((p: any) => ({
    name: `${p.player?.firstname || ''} ${p.player?.lastname || ''}`.trim() || 'Bilinmeyen',
    team: (p.statistics?.[0]?.team?.name?.toLowerCase().includes('galatasaray') ? 'home' : 'away') as 'home' | 'away',
    goals: p.statistics?.[0]?.goals?.total || 0,
  }));

  return {
    recentForm: { home: recentHome.slice(0, 5), away: recentAway.slice(0, 5) },
    headToHead,
    topScorers: scorers,
  };
}

/** Standings lookup. */
export async function fetchStandings(season = DEFAULT_SEASON): Promise<any[]> {
  const res = await client.get('/standings', {
    params: { league: SUPER_LIG_ID, season: season },
  });
  return res.data?.response?.[0]?.league?.standings?.[0] || [];
}

/** Weather: API-Football doesn't have weather; fallback to stub. */
export { fetchWeather, fetchInjuries, fetchOdds } from './dataSources.js';
