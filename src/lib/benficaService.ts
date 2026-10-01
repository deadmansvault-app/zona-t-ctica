import confetti from 'canvas-confetti';
import { BenficaMatch, BenficaMatchesResponse } from '../types/benfica';
import { INITIAL_BENFICA_MATCHES, BENFICA_TEAM_INFO } from '../data/benficaMatches';

const STORAGE_CACHE_KEY = 'slb_matches_cache';

export async function fetchBenficaMatches(): Promise<BenficaMatchesResponse> {
  try {
    const res = await fetch('/api/benfica/matches');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data: BenficaMatchesResponse = await res.json();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(data));
      } catch (e) {}
    }
    return data;
  } catch (err) {
    console.warn('Usando dados de contingência locais para os jogos do Benfica:', err);
    return getLocalFallbackResponse();
  }
}

export function getLocalFallbackResponse(): BenficaMatchesResponse {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(STORAGE_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const allMatches = JSON.parse(JSON.stringify(INITIAL_BENFICA_MATCHES));
  const recentMatches = allMatches.filter((m: BenficaMatch) => m.status === 'FINISHED');
  const upcomingMatches = allMatches.filter(
    (m: BenficaMatch) => m.status === 'SCHEDULED' && m.date >= todayStr
  );
  const nextMatch = upcomingMatches[0] || null;

  return {
    source: 'cache',
    lastUpdated: new Date().toISOString(),
    liveMatch: null,
    nextMatch,
    recentMatches,
    upcomingMatches,
    allMatches,
    leagueStanding: {
      position: 2,
      points: 16,
      played: 7,
      wins: 5,
      draws: 1,
      losses: 1,
      goalsFor: 20,
      goalsAgainst: 7,
    },
  };
}

export function triggerGoalCelebration() {
  if (typeof window === 'undefined') return;
  try {
    // Red, white and gold confetti burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#dc2626', '#ffffff', '#fbbf24', '#b91c1c'],
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#dc2626', '#ffffff', '#fbbf24'],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#dc2626', '#ffffff', '#fbbf24'],
      });
    }, 250);
  } catch (e) {}
}
