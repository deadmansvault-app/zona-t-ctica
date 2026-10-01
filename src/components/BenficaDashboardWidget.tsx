import React, { useState, useEffect } from 'react';
import { Radio, Calendar, Tv, Clock, ArrowRight, Flame } from 'lucide-react';
import { BenficaMatch, BenficaMatchesResponse } from '../types/benfica';
import { fetchBenficaMatches } from '../lib/benficaService';

interface BenficaDashboardWidgetProps {
  onOpenBenficaTab: () => void;
}

export const BenficaDashboardWidget: React.FC<BenficaDashboardWidgetProps> = ({
  onOpenBenficaTab,
}) => {
  const [data, setData] = useState<BenficaMatchesResponse | null>(null);

  useEffect(() => {
    fetchBenficaMatches().then((res) => setData(res)).catch(() => {});
  }, []);

  const liveMatch = data?.liveMatch;
  const nextMatch = data?.nextMatch;

  if (!liveMatch && !nextMatch) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const isMatchToday = nextMatch?.date === todayStr || Boolean(liveMatch);

  // If live match is in progress:
  if (liveMatch) {
    return (
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-900 rounded-2xl border-2 border-red-500 p-4 text-white shadow-md animate-pulse">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 bg-red-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              <Radio className="w-3.5 h-3.5 text-white animate-ping" />
              BENFICA EM DIRETO • {liveMatch.minute}
            </span>
            <span className="text-xs text-red-200 font-bold">
              {liveMatch.competition}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenBenficaTab}
            className="flex items-center gap-1 text-xs font-black bg-white text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-xl transition shadow-xs"
          >
            <span>Ver Direto & Estatísticas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <img
              src={liveMatch.homeTeam.badge}
              alt={liveMatch.homeTeam.name}
              className="w-7 h-7 object-contain"
            />
            <span className="font-extrabold text-sm">{liveMatch.homeTeam.shortName}</span>
          </div>

          <div className="text-xl sm:text-2xl font-black bg-black/40 px-3 py-1 rounded-xl border border-white/20">
            {liveMatch.homeScore ?? 0} - {liveMatch.awayScore ?? 0}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm">{liveMatch.awayTeam.shortName}</span>
            <img
              src={liveMatch.awayTeam.badge}
              alt={liveMatch.awayTeam.name}
              className="w-7 h-7 object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  // Next Match Card (Today or Upcoming)
  return (
    <div
      onClick={onOpenBenficaTab}
      className={`cursor-pointer rounded-2xl p-4 transition-all shadow-xs border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isMatchToday
          ? 'bg-gradient-to-r from-red-50 via-rose-50 to-amber-50/50 border-red-300 hover:border-red-400'
          : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50/50'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-red-100/80 border border-red-200 p-1.5 flex items-center justify-center shrink-0">
          <img
            src="https://a.espncdn.com/i/teamlogos/soccer/500/1929.png"
            alt="SLB"
            className="w-full h-full object-contain"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isMatchToday
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isMatchToday ? '🔴 Jogo Hoje!' : 'Próximo Jogo SLB'}
            </span>
            <span className="text-xs font-bold text-slate-600">
              {nextMatch?.competition} • {nextMatch?.round}
            </span>
          </div>

          <p className="text-sm font-black text-slate-900 mt-0.5">
            {nextMatch?.homeTeam.name} vs {nextMatch?.awayTeam.name}
          </p>

          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {nextMatch?.date &&
                new Date(nextMatch.date).toLocaleDateString('pt-PT', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
              às {nextMatch?.time}
            </span>
            {nextMatch?.broadcast && (
              <span className="flex items-center gap-1 font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-[11px]">
                <Tv className="w-3 h-3" />
                {nextMatch.broadcast}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-extrabold text-red-600 hover:text-red-700 self-end sm:self-center">
        <span>Ver Calendário & Resultados</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
