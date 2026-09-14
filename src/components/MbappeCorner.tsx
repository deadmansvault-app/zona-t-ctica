import React, { useState } from 'react';
import { Sparkles, Trophy, Flame, ChevronRight } from 'lucide-react';
import { MBAPPE_MOTIVATIONAL_QUOTES } from '../data/timetableData';

export const MbappeCorner: React.FC = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const current = MBAPPE_MOTIVATIONAL_QUOTES[quoteIndex];

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MBAPPE_MOTIVATIONAL_QUOTES.length);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-neutral-900 to-red-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-neutral-800 relative overflow-hidden">
      {/* Decorative subtle jersey watermark */}
      <div className="absolute -right-4 -bottom-6 opacity-10 text-9xl font-black select-none pointer-events-none tracking-tighter">
        9
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-amber-300 flex-shrink-0 mt-0.5">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-300 fill-amber-300" />
                Modo Campeão
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Mbappé & Águia SLB
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-100 italic leading-relaxed">
              "{current.quote}"
            </p>
            <p className="text-xs text-red-300 mt-1 font-medium flex items-center gap-1">
              <span>— {current.author}</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-bold">{current.tag}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleNextQuote}
          className="self-end sm:self-center flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3 py-1.5 rounded-lg transition-all border border-white/10 whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Outra Frase</span>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </button>
      </div>
    </div>
  );
};
