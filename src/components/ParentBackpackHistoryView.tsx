import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Flame,
  Search,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Check,
  X,
  BookOpen,
  Filter,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { BackpackRecord, ScheduleItem, ActivityLog } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { loadAllBackpackRecords } from '../lib/storage';

interface ParentBackpackHistoryViewProps {
  schedule: ScheduleItem[];
  studentName?: string;
  logs?: ActivityLog[];
}

export const ParentBackpackHistoryView: React.FC<ParentBackpackHistoryViewProps> = ({
  schedule,
  studentName = 'Francisco',
  logs = [],
}) => {
  const [backpacks, setBackpacks] = useState<BackpackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'all' | '7days' | '30days' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const records = await loadAllBackpackRecords();
      setBackpacks(records);
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
    refreshData();
  }, []);

  // Helper: map a date to its school day of week (1=Monday, ..., 5=Friday)
  const getDayOfWeek = (dateStr: string): number => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay(); // 0 is Sunday, 6 is Saturday
    return day;
  };

  // Helper: get expected backpack items for a given date
  const getExpectedItemsForDate = (dateStr: string) => {
    const dow = getDayOfWeek(dateStr);
    if (dow < 1 || dow > 5) {
      return { subjects: [], expectedItems: [] };
    }

    const classes = schedule
      .filter((s) => s.dayOfWeek === dow)
      .sort((a, b) => a.timeIndex - b.timeIndex);

    const subjectCodes: string[] = Array.from(new Set<string>(classes.map((c) => c.subjectCode)));
    const expectedItems: string[] = [];

    subjectCodes.forEach((code: string) => {
      const sub = SUBJECTS[code];
      if (sub?.backpackItems) {
        sub.backpackItems.forEach((item) => {
          if (!expectedItems.includes(item)) {
            expectedItems.push(item);
          }
        });
      }
    });

    return { subjects: subjectCodes, expectedItems };
  };

  // Enriched backpack entries
  const enrichedRecords = useMemo(() => {
    return backpacks.map((rec) => {
      const { subjects, expectedItems } = getExpectedItemsForDate(rec.dateKey);
      const totalExpected = expectedItems.length > 0 ? expectedItems.length : rec.items.length;
      const checkedCount = rec.items.length;
      const isComplete = totalExpected > 0 ? checkedCount >= totalExpected : checkedCount > 0;
      const missingItems = expectedItems.filter((exp) => !rec.items.includes(exp));

      // Check if we have logs for this dateKey
      const dateLogs = logs.filter(
        (l) => l.action === 'backpack_toggle' && l.details?.dateKey === rec.dateKey
      );

      const d = new Date(rec.dateKey + 'T12:00:00');
      const dayName = d.toLocaleDateString('pt-PT', { weekday: 'long' });
      const formattedDate = d.toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      return {
        ...rec,
        dayName,
        formattedDate,
        subjects,
        expectedItems,
        totalExpected,
        checkedCount,
        isComplete,
        missingItems,
        logCount: dateLogs.length,
      };
    });
  }, [backpacks, schedule, logs]);

  // Global KPIs & Analytics
  const stats = useMemo(() => {
    const totalDays = enrichedRecords.length;
    if (totalDays === 0) {
      return {
        totalDays: 0,
        completeDays: 0,
        successRate: 0,
        currentStreak: 0,
        typicalHour: '--:--',
        totalItemsChecked: 0,
      };
    }

    const completeDays = enrichedRecords.filter((r) => r.isComplete).length;
    const successRate = Math.round((completeDays / totalDays) * 100);

    // Calculate streak
    let currentStreak = 0;
    for (const r of enrichedRecords) {
      if (r.isComplete) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate typical preparation hour from updatedAt
    const hours: number[] = [];
    enrichedRecords.forEach((r) => {
      if (r.updatedAt) {
        const date = new Date(r.updatedAt);
        if (!isNaN(date.getTime())) {
          hours.push(date.getHours());
        }
      }
    });

    let typicalHour = '20:30';
    if (hours.length > 0) {
      const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
      typicalHour = `${avgHour.toString().padStart(2, '0')}:00`;
    }

    const totalItemsChecked = enrichedRecords.reduce((acc, r) => acc + r.checkedCount, 0);

    return {
      totalDays,
      completeDays,
      successRate,
      currentStreak,
      typicalHour,
      totalItemsChecked,
    };
  }, [enrichedRecords]);

  // Filtered entries
  const filteredRecords = useMemo(() => {
    let list = [...enrichedRecords];
    const today = new Date();

    if (periodFilter === '7days') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      list = list.filter((r) => new Date(r.dateKey).getTime() >= past7.getTime());
    } else if (periodFilter === '30days') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      list = list.filter((r) => new Date(r.dateKey).getTime() >= past30.getTime());
    } else if (periodFilter === 'incomplete') {
      list = list.filter((r) => !r.isComplete);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.dayName.toLowerCase().includes(q) ||
          r.formattedDate.toLowerCase().includes(q) ||
          r.items.some((item) => item.toLowerCase().includes(q)) ||
          r.subjects.some((sub) => {
            const info = SUBJECTS[sub];
            return info?.name.toLowerCase().includes(q) || sub.toLowerCase().includes(q);
          })
      );
    }

    return list;
  }, [enrichedRecords, periodFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-700 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Briefcase className="w-40 h-40" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white">
                Rotina Diária & TDAH
              </span>
              <span className="text-xs font-bold text-red-200">
                Acompanhamento Parental
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Histórico da Mochila Escolar
            </h2>
            <p className="text-xs sm:text-sm text-red-100 mt-1 max-w-2xl leading-relaxed">
              Consulta os registos diários de preparação da mochila do {studentName},
              com verificação de cadernos, manuais e materiais para cada dia letivo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refreshData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-extrabold bg-white/20 hover:bg-white/30 active:scale-95 text-white px-4 py-2.5 rounded-xl transition border border-white/25 backdrop-blur-md shadow-xs"
            title="Recarregar dados mais recentes da nuvem"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Days */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Dias Registados
            </p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.totalDays}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {stats.totalItemsChecked} materiais conferidos
            </p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Taxa de Conclusão
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              {stats.successRate}%
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {stats.completeDays} de {stats.totalDays} dias a 100%
            </p>
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sequência Atual
            </p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {stats.currentStreak} {stats.currentStreak === 1 ? 'dia' : 'dias'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Dias seguidos a 100%
            </p>
          </div>
        </div>

        {/* Typical Hour */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Horário Habitual
            </p>
            <p className="text-2xl font-black text-blue-600 mt-0.5">
              ~{stats.typicalHour}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Preparação noturna
            </p>
          </div>
        </div>
      </div>

      {/* Routine Insight Banner for ADHD */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <span className="font-black text-slate-900">
            Dica Pedagógica para o {studentName}:
          </span>{' '}
          A consistência na preparação da mochila na véspera reduz drasticamente a ansiedade matinal e o risco de esquecimento de materiais essenciais (como calculadora, batas ou equipamento de Ed. Física). Manter esta rotina diária às {stats.typicalHour} tem um impacto comprovado no sucesso escolar.
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Period Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              periodFilter === 'all'
                ? 'bg-white text-red-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({enrichedRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('7days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              periodFilter === '7days'
                ? 'bg-white text-red-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Últimos 7 Dias
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('30days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              periodFilter === '30days'
                ? 'bg-white text-red-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Últimos 30 Dias
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('incomplete')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              periodFilter === 'incomplete'
                ? 'bg-white text-red-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Incompletas
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar dia ou material..."
            className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main List of Daily Backpack Records */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">A carregar o histórico de mochilas...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800">
            Nenhum registo de mochila encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'Nenhum dia corresponde aos critérios de pesquisa introduzidos.'
              : 'Assim que o Francisco marcar os materiais no ecrã principal, o histórico diário surgirá aqui automaticamente.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => {
            const hasMissing = record.missingItems.length > 0;
            const updatedTimeStr = record.updatedAt
              ? new Date(record.updatedAt).toLocaleTimeString('pt-PT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <div
                key={record.dateKey}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs hover:shadow-sm ${
                  record.isComplete
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                }`}
              >
                {/* Header row for the day */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        record.isComplete
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {record.isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 capitalize">
                          {record.dayName}, {record.formattedDate}
                        </h4>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            record.isComplete
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {record.isComplete
                            ? '100% COMPLETA'
                            : `PARCIAL (${record.checkedCount}/${record.totalExpected})`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {record.dateKey}
                        </span>
                        {updatedTimeStr && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Concluído às {updatedTimeStr}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Subjects Chips */}
                  {record.subjects.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">
                        Aulas:
                      </span>
                      {record.subjects.map((subCode) => {
                        const sub = SUBJECTS[subCode];
                        return (
                          <span
                            key={subCode}
                            className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                            title={sub?.name || subCode}
                          >
                            {subCode}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Materials List */}
                <div className="pt-3.5 space-y-2.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Materiais Verificados ({record.items.length})
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {record.items.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </span>
                    ))}
                  </div>

                  {/* Missing items alert if any */}
                  {hasMissing && (
                    <div className="mt-2 pt-2 border-t border-amber-100">
                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Não assinalados no checklist ({record.missingItems.length}):</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {record.missingItems.map((missing, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md"
                          >
                            <X className="w-3 h-3 text-amber-500" />
                            <span>{missing}</span>
                          </span>
                        ))}
                      </div>
                    </div>
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
