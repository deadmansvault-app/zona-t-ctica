import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Tv,
  MapPin,
  Clock,
  Calendar,
  RefreshCw,
  Flame,
  Radio,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Volume2,
  CalendarPlus,
} from 'lucide-react';
import { BenficaMatch, BenficaMatchesResponse } from '../types/benfica';
import {
  fetchBenficaMatches,
  triggerGoalCelebration,
} from '../lib/benficaService';

interface BenficaMatchesViewProps {
  onAddStudyReminder?: (match: BenficaMatch) => void;
}

export const BenficaMatchesView: React.FC<BenficaMatchesViewProps> = ({
  onAddStudyReminder,
}) => {
  const [data, setData] = useState<BenficaMatchesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'recent' | 'league' | 'europe'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [reminderAddedId, setReminderAddedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetchBenficaMatches();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Adaptive auto-refresh: Every 20s if a match is live, otherwise every 60s
  useEffect(() => {
    if (!autoRefresh) return;
    const intervalMs = data?.liveMatch ? 20000 : 60000;
    const interval = setInterval(() => {
      loadData();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, data?.liveMatch]);

  const handleAddCalendarReminder = (match: BenficaMatch) => {
    setReminderAddedId(match.id);
    if (onAddStudyReminder) {
      onAddStudyReminder(match);
    }
    setTimeout(() => setReminderAddedId(null), 3000);
  };

  // Filtered matches
  const filteredMatches = useMemo(() => {
    if (!data) return [];
    let list: BenficaMatch[] = [];

    if (filter === 'upcoming') {
      list = [...data.upcomingMatches];
    } else if (filter === 'recent') {
      list = [...data.recentMatches];
    } else if (filter === 'league') {
      list = data.allMatches.filter((m) => m.competition === 'Liga Portugal Betclic');
    } else if (filter === 'europe') {
      list = data.allMatches.filter((m) => m.competition === 'Liga dos Campeões');
    } else {
      list = [...data.allMatches];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.homeTeam.name.toLowerCase().includes(q) ||
          m.awayTeam.name.toLowerCase().includes(q) ||
          m.venue.toLowerCase().includes(q) ||
          m.round?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data, filter, searchQuery]);

  // Countdown calculations for next match
  const countdown = useMemo(() => {
    const targetMatch = data?.nextMatch;
    if (!targetMatch) return null;
    const targetDate = new Date(targetMatch.isoTimestamp || `${targetMatch.date}T${targetMatch.time}:00`);
    const diffMs = targetDate.getTime() - currentTime.getTime();

    if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    return { days, hours, minutes, seconds, isPast: false };
  }, [data?.nextMatch, currentTime]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-red-800 via-red-700 to-red-900 rounded-3xl text-white p-5 sm:p-7 shadow-lg border border-red-600/50 relative overflow-hidden">
        {/* Background Decorative Eagle / Benfica Motif */}
        <div className="absolute -right-8 -bottom-10 opacity-15 text-[180px] font-black select-none pointer-events-none">
          SLB
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shrink-0 shadow-inner">
              <img
                src="https://a.espncdn.com/i/teamlogos/soccer/500/1929.png"
                alt="SL Benfica"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-black uppercase tracking-wider bg-white text-red-800 px-2.5 py-0.5 rounded-full shadow-2xs">
                  SL Benfica
                </span>
                {data?.liveMatch ? (
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-emerald-500 text-white px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
                    <Radio className="w-3.5 h-3.5" />
                    EM DIRETO
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-200 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    Ligado ao Vivo à Liga Portugal
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Calendário & Resultados dos Jogos
              </h1>
              <p className="text-xs sm:text-sm text-red-100 mt-1 max-w-xl">
                Acompanha todos os jogos do Glorioso com atualização em direto, datas, horas de transmissão na TV e resultados oficiais da época 2026/2027.
              </p>
            </div>
          </div>

          {/* Action Buttons & Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:self-start md:self-center">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-xs font-extrabold bg-white/15 hover:bg-white/25 active:scale-95 text-white px-3.5 py-2 rounded-xl transition backdrop-blur-md border border-white/20 shadow-xs"
              title="Recarregar dados oficiais"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Live Status Sub-bar */}
        <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-red-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Atualização ao vivo ativa</span>
            {data?.lastUpdated && (
              <span className="text-red-200">
                • Última verificação:{' '}
                {new Date(data.lastUpdated).toLocaleTimeString('pt-PT', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-red-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Auto-atualização periódica</span>
          </label>
        </div>
      </div>

      {/* 🔴 LIVE MATCH HERO CARD (IF A MATCH IS IN PROGRESS) */}
      {data?.liveMatch && (
        <div className="bg-gradient-to-br from-slate-950 via-red-950 to-neutral-900 rounded-3xl p-5 sm:p-7 text-white border-2 border-red-500 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none text-red-500">
            <Flame className="w-32 h-32" />
          </div>

          {/* Top Banner */}
          <div className="flex items-center justify-between gap-3 mb-6 relative z-10 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider animate-pulse shadow-md shadow-red-600/50">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                AO VIVO • {data.liveMatch.minute}
              </span>
              <span className="text-xs font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                {data.liveMatch.competition} ({data.liveMatch.round})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {data.liveMatch.broadcast && (
                <span className="flex items-center gap-1 text-xs font-extrabold bg-red-900/80 text-amber-300 border border-red-600/50 px-3 py-1 rounded-xl">
                  <Tv className="w-3.5 h-3.5" />
                  {data.liveMatch.broadcast}
                </span>
              )}
            </div>
          </div>

          {/* SCOREBOARD TEAMS */}
          <div className="grid grid-cols-7 items-center gap-2 sm:gap-4 my-2 relative z-10">
            {/* Home Team */}
            <div className="col-span-3 flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-2 sm:gap-4 text-center sm:text-right">
              <div>
                <h3 className="text-base sm:text-2xl font-black text-white leading-tight">
                  {data.liveMatch.homeTeam.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold hidden sm:block">
                  {data.liveMatch.isHome ? 'Estádio da Luz' : 'Visitado'}
                </p>
              </div>
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shrink-0 shadow-lg">
                <img
                  src={data.liveMatch.homeTeam.badge}
                  alt={data.liveMatch.homeTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Score */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="text-3xl sm:text-5xl font-black text-white tracking-wider flex items-center gap-1 bg-black/40 px-3 sm:px-5 py-2 rounded-2xl border border-white/15 shadow-inner">
                <span>{data.liveMatch.homeScore ?? 0}</span>
                <span className="text-red-500 text-2xl sm:text-4xl">:</span>
                <span>{data.liveMatch.awayScore ?? 0}</span>
              </div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 uppercase tracking-widest animate-pulse">
                {data.liveMatch.minute}
              </span>
            </div>

            {/* Away Team */}
            <div className="col-span-3 flex flex-col sm:flex-row-reverse items-center justify-center sm:justify-start gap-2 sm:gap-4 text-center sm:text-left">
              <div>
                <h3 className="text-base sm:text-2xl font-black text-white leading-tight">
                  {data.liveMatch.awayTeam.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold hidden sm:block">
                  {!data.liveMatch.isHome ? 'Estádio da Luz' : 'Visitante'}
                </p>
              </div>
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shrink-0 shadow-lg">
                <img
                  src={data.liveMatch.awayTeam.badge}
                  alt={data.liveMatch.awayTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* INCIDENTS TIMELINE */}
          {data.liveMatch.incidents && data.liveMatch.incidents.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Momentos Chave do Jogo em Direto
              </p>
              <div className="space-y-2">
                {data.liveMatch.incidents.map((inc, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      inc.isBenfica
                        ? 'bg-red-950/60 border-red-700/60 text-white'
                        : 'bg-slate-900/60 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-black text-amber-400 w-8">{inc.minute}</span>
                      <span className="text-base">
                        {inc.type === 'goal'
                          ? '⚽'
                          : inc.type === 'yellow_card'
                          ? '🟨'
                          : inc.type === 'red_card'
                          ? '🟥'
                          : '🔄'}
                      </span>
                      <div>
                        <span className="font-bold">{inc.player}</span>
                        {inc.detail && <span className="text-slate-400 text-[11px] ml-1.5">• {inc.detail}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                      {inc.team === 'home' ? data.liveMatch?.homeTeam.shortName : data.liveMatch?.awayTeam.shortName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIVE STATS COMPARISON */}
          {data.liveMatch.stats && (
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs relative z-10">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex justify-between font-bold mb-1.5">
                  <span>{data.liveMatch.stats.possessionHome}%</span>
                  <span className="text-slate-400 text-[11px]">Posse de Bola</span>
                  <span>{data.liveMatch.stats.possessionAway}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-red-600 h-full transition-all"
                    style={{ width: `${data.liveMatch.stats.possessionHome}%` }}
                  />
                  <div
                    className="bg-slate-400 h-full transition-all"
                    style={{ width: `${data.liveMatch.stats.possessionAway}%` }}
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between text-center">
                <div className="flex-1">
                  <span className="text-lg font-black">{data.liveMatch.stats.shotsHome}</span>
                  <p className="text-[10px] text-slate-400">Remates</p>
                </div>
                <div className="text-slate-500 font-bold">vs</div>
                <div className="flex-1">
                  <span className="text-lg font-black">{data.liveMatch.stats.shotsAway}</span>
                  <p className="text-[10px] text-slate-400">Remates</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between text-center">
                <div className="flex-1">
                  <span className="text-lg font-black">{data.liveMatch.stats.cornersHome}</span>
                  <p className="text-[10px] text-slate-400">Cantos</p>
                </div>
                <div className="text-slate-500 font-bold">vs</div>
                <div className="flex-1">
                  <span className="text-lg font-black">{data.liveMatch.stats.cornersAway}</span>
                  <p className="text-[10px] text-slate-400">Cantos</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ⏳ PRÓXIMO JOGO HERO COUNTDOWN (IF NO LIVE MATCH) */}
      {!data?.liveMatch && data?.nextMatch && (
        <div className="bg-gradient-to-br from-slate-900 via-neutral-900 to-red-950 rounded-3xl p-6 sm:p-8 text-white border border-red-900/50 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
            {/* Match Details */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider bg-red-600 text-white px-3 py-0.5 rounded-full shadow-2xs">
                  Próximo Jogo
                </span>
                <span className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  {data.nextMatch.competition} • {data.nextMatch.round}
                </span>
                {data.nextMatch.broadcast && (
                  <span className="text-xs font-extrabold text-amber-300 bg-red-950 border border-red-700/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Tv className="w-3 h-3" />
                    {data.nextMatch.broadcast}
                  </span>
                )}
              </div>

              {/* Opponent vs Benfica */}
              <div className="flex items-center justify-center lg:justify-start gap-4 my-3">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shadow-md">
                  <img
                    src={data.nextMatch.homeTeam.badge}
                    alt={data.nextMatch.homeTeam.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">vs</p>
                  <p className="text-xl sm:text-2xl font-black text-white">
                    {data.nextMatch.homeTeam.name} vs {data.nextMatch.awayTeam.name}
                  </p>
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shadow-md">
                  <img
                    src={data.nextMatch.awayTeam.badge}
                    alt={data.nextMatch.awayTeam.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Match Venue and Time */}
              <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-red-400" />
                  {new Date(data.nextMatch.date).toLocaleDateString('pt-PT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                  {' às '}
                  {data.nextMatch.time}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  {data.nextMatch.venue}
                </span>
              </div>

              {/* Study Recommendation Banner for Francisco */}
              <div className="mt-4 p-3 bg-red-900/30 border border-red-700/40 rounded-2xl text-xs text-red-200 text-left max-w-xl flex items-start gap-2.5">
                <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-white">Planeamento para o Francisco: </span>
                  <span>
                    Planeia o teu bloco de estudo antes das{' '}
                    {data.nextMatch.time} para apoiares o Glorioso com a mochila e os TPCs 100% prontos!
                  </span>
                </div>
              </div>
            </div>

            {/* Live Countdown Display */}
            {countdown && !countdown.isPast && (
              <div className="bg-black/50 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 text-center min-w-[280px] shadow-lg">
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-400 mb-2.5 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Contagem Decrescente
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                    <span className="text-2xl sm:text-3xl font-black text-white leading-none block">
                      {countdown.days}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold mt-1 block">Dias</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                    <span className="text-2xl sm:text-3xl font-black text-white leading-none block">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold mt-1 block">Horas</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                    <span className="text-2xl sm:text-3xl font-black text-white leading-none block">
                      {String(countdown.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold mt-1 block">Min</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 leading-none block">
                      {String(countdown.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold mt-1 block">Seg</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddCalendarReminder(data.nextMatch!)}
                  className="mt-3.5 w-full flex items-center justify-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 active:scale-95 text-white py-2 rounded-xl transition shadow-xs"
                >
                  {reminderAddedId === data.nextMatch.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Alerta de Estudo Marcado!</span>
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Adicionar Alerta de Estudo</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEAGUE STANDING BAR */}
      {data?.leagueStanding && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black text-sm shrink-0">
              #{data.leagueStanding.position}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Liga Portugal Betclic • 2026/2027</p>
              <h4 className="text-sm font-extrabold text-slate-900">
                Benfica em 2º Lugar ({data.leagueStanding.points} pontos em {data.leagueStanding.played} jogos)
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            <span className="text-emerald-700">{data.leagueStanding.wins} Vitórias</span>
            <span className="text-amber-700">{data.leagueStanding.draws} Empates</span>
            <span className="text-red-700">{data.leagueStanding.losses} Derrotas</span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="text-slate-800">{data.leagueStanding.goalsFor} Golos Marcados</span>
          </div>
        </div>
      )}

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'upcoming'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Próximos Jogos ({data?.upcomingMatches.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilter('recent')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'recent'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Resultados Anteriores ({data?.recentMatches.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilter('league')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'league'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Liga Portugal
          </button>
          <button
            type="button"
            onClick={() => setFilter('europe')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'europe'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Liga dos Campeões
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'all'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todos ({data?.allMatches.length || 0})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar adversário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-red-500 transition"
          />
        </div>
      </div>

      {/* MATCHES LIST / GRID */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-red-500 mb-2" />
          <p className="text-xs font-bold">A carregar calendário oficial do Benfica...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          <Trophy className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-extrabold text-sm text-slate-700">Nenhum jogo encontrado</p>
          <p className="text-xs text-slate-400 mt-0.5">Tenta alterar os filtros ou o termo de pesquisa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((match) => {
            const isFinished = match.status === 'FINISHED';
            const isWin = match.outcome === 'win';
            const isDraw = match.outcome === 'draw';
            const isLoss = match.outcome === 'loss';

            return (
              <div
                key={match.id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs flex flex-col justify-between ${
                  match.id === data?.nextMatch?.id
                    ? 'border-red-500 ring-2 ring-red-500/20 shadow-md'
                    : 'border-slate-200 hover:border-red-300'
                }`}
              >
                <div>
                  {/* Top Competition & Date Line */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {match.competition} {match.round ? `• ${match.round}` : ''}
                    </span>

                    {/* Outcome Badge or TV Badge */}
                    {isFinished ? (
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                          isWin
                            ? 'bg-emerald-100 text-emerald-800'
                            : isDraw
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'}
                      </span>
                    ) : match.broadcast ? (
                      <span className="text-[11px] font-extrabold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Tv className="w-3 h-3" />
                        {match.broadcast}
                      </span>
                    ) : null}
                  </div>

                  {/* Teams & Score Row */}
                  <div className="flex items-center justify-between gap-3 my-2">
                    {/* Home Team */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
                        <img
                          src={match.homeTeam.badge}
                          alt={match.homeTeam.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-sm truncate ${
                            match.homeTeam.isBenfica
                              ? 'font-black text-red-700'
                              : 'font-bold text-slate-800'
                          }`}
                        >
                          {match.homeTeam.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">Casa</p>
                      </div>
                    </div>

                    {/* Center Result or Kickoff Time */}
                    <div className="text-center px-2 shrink-0">
                      {isFinished ? (
                        <div className="text-xl font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                          <span>{match.homeScore ?? 0}</span>
                          <span className="mx-1 text-slate-400">-</span>
                          <span>{match.awayScore ?? 0}</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-sm font-black text-slate-900 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg">
                            {match.time}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
                      <div className="min-w-0">
                        <p
                          className={`text-sm truncate ${
                            match.awayTeam.isBenfica
                              ? 'font-black text-red-700'
                              : 'font-bold text-slate-800'
                          }`}
                        >
                          {match.awayTeam.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">Fora</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
                        <img
                          src={match.awayTeam.badge}
                          alt={match.awayTeam.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Goalscorers for finished matches */}
                  {isFinished && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600">
                      {match.homeScorers && match.homeScorers.length > 0 && (
                        <p className="truncate">
                          <span className="font-bold text-slate-700">⚽ {match.homeTeam.shortName}:</span>{' '}
                          {match.homeScorers.join(', ')}
                        </p>
                      )}
                      {match.awayScorers && match.awayScorers.length > 0 && (
                        <p className="truncate mt-0.5">
                          <span className="font-bold text-slate-700">⚽ {match.awayTeam.shortName}:</span>{' '}
                          {match.awayScorers.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Venue, Date & Add Reminder */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {new Date(match.date).toLocaleDateString('pt-PT', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                      {match.venue ? ` • ${match.venue}` : ''}
                    </span>
                  </div>

                  {!isFinished && (
                    <button
                      type="button"
                      onClick={() => handleAddCalendarReminder(match)}
                      className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 shrink-0"
                    >
                      {reminderAddedId === match.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Adicionado!</span>
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>Lembrete</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
