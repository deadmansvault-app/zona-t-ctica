export type MatchCompetition =
  | 'Liga Portugal Betclic'
  | 'Liga dos Campeões'
  | 'Taça de Portugal'
  | 'Taça da Liga'
  | 'Supertaça Cândido de Oliveira'
  | 'Amigável';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'FINISHED' | 'POSTPONED';

export type MatchOutcome = 'win' | 'draw' | 'loss';

export interface MatchTeam {
  name: string;
  shortName: string;
  badge: string;
  isBenfica: boolean;
}

export interface MatchIncident {
  minute: string; // e.g. "24'", "45'+2", "78'"
  type: 'goal' | 'yellow_card' | 'red_card' | 'sub';
  player: string;
  detail?: string;
  team: 'home' | 'away';
  isBenfica: boolean;
}

export interface MatchStats {
  possessionHome: number; // e.g. 62%
  possessionAway: number;
  shotsHome: number;
  shotsAway: number;
  shotsOnTargetHome: number;
  shotsOnTargetAway: number;
  cornersHome: number;
  cornersAway: number;
  foulsHome?: number;
  foulsAway?: number;
}

export interface BenficaMatch {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  isoTimestamp: string;
  competition: MatchCompetition;
  competitionBadge?: string;
  round?: string; // e.g. "Jornada 8", "Fase de Grupos", "Quartos de Final"
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  venue: string; // e.g. "Estádio da Luz", "Estádio do Dragão"
  isHome: boolean;
  broadcast?: string; // e.g. "BTV", "Sport TV 1", "DAZN 1", "RTP 1"
  status: MatchStatus;
  minute?: string; // e.g. "68'", "Intervalo", "90'+4"
  homeScore?: number;
  awayScore?: number;
  homeScorers?: string[];
  awayScorers?: string[];
  incidents?: MatchIncident[];
  stats?: MatchStats;
  outcome?: MatchOutcome; // from Benfica's perspective
  summary?: string;
  isDemo?: boolean;
}

export interface BenficaMatchesResponse {
  source: 'live_api' | 'espn' | 'thesportsdb' | 'cache' | 'demo';
  lastUpdated: string;
  liveMatch: BenficaMatch | null;
  nextMatch: BenficaMatch | null;
  recentMatches: BenficaMatch[];
  upcomingMatches: BenficaMatch[];
  allMatches: BenficaMatch[];
  leagueStanding?: {
    position: number;
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
}
