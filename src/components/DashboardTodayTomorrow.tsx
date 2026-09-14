import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  Dumbbell,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { SchoolTask, ScheduleItem, AppSettings } from '../types';
import { SUBJECTS, TIME_SLOTS, HANDBALL_TRAINING } from '../data/timetableData';
import { TaskCard } from './TaskCard';
import { MbappeCorner } from './MbappeCorner';

interface DashboardTodayTomorrowProps {
  tasks: SchoolTask[];
  schedule: ScheduleItem[];
  settings: AppSettings;
  backpackChecked: string[];
  onToggleBackpackItem: (item: string) => void;
  onOpenCheckIn: (task: SchoolTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleSession: (taskId: string, sessionId: string) => void;
  onOpenScheduleTab: () => void;
  onOpenAddTask: () => void;
}

export const DashboardTodayTomorrow: React.FC<DashboardTodayTomorrowProps> = ({
  tasks,
  schedule,
  settings,
  backpackChecked,
  onToggleBackpackItem,
  onOpenCheckIn,
  onDeleteTask,
  onToggleSession,
  onOpenScheduleTab,
  onOpenAddTask,
}) => {
  const [activeDayView, setActiveDayView] = useState<'hoje' | 'amanha'>('hoje');
  const [showColorExplanation, setShowColorExplanation] = useState(false);

  // Today & Tomorrow calculations
  const now = new Date();
  const todayDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const tomorrowDayOfWeek = (todayDayOfWeek + 1) % 7;

  // Normalized ISO strings (YYYY-MM-DD)
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  // If weekend, map to next school day (Mon = 1)
  const effectiveTodayScheduleDay = todayDayOfWeek === 0 || todayDayOfWeek === 6 ? 1 : todayDayOfWeek;
  const effectiveTomorrowScheduleDay = tomorrowDayOfWeek === 0 || tomorrowDayOfWeek === 6 ? 1 : tomorrowDayOfWeek;

  // Get classes for Today and Tomorrow
  const todayClasses = schedule
    .filter((s) => s.dayOfWeek === effectiveTodayScheduleDay)
    .sort((a, b) => a.timeIndex - b.timeIndex);

  const tomorrowClasses = schedule
    .filter((s) => s.dayOfWeek === effectiveTomorrowScheduleDay)
    .sort((a, b) => a.timeIndex - b.timeIndex);

  // Check if today or tomorrow has handball training (Mon=1, Wed=3, Fri=5)
  const hasHandballToday = HANDBALL_TRAINING.days.includes(effectiveTodayScheduleDay);
  const hasHandballTomorrow = HANDBALL_TRAINING.days.includes(effectiveTomorrowScheduleDay);

  // Tasks due today & tomorrow
  const tasksDueToday = tasks.filter((t) => t.dueDate === todayStr);
  const tasksDueTomorrow = tasks.filter((t) => t.dueDate === tomorrowStr);

  // All upcoming tests and projects
  const upcomingTestsAndTasks = [...tasks].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  // Tomorrow's backpack requirements based on tomorrow's subjects
  const tomorrowSubjectsList: string[] = Array.from(
    new Set(tomorrowClasses.map((c) => c.subjectCode))
  );

  const backpackItemsForTomorrow: { item: string; subjectCode: string }[] = [];
  tomorrowSubjectsList.forEach((subCode) => {
    const sub = SUBJECTS[subCode];
    if (sub && sub.backpackItems) {
      sub.backpackItems.forEach((item) => {
        backpackItemsForTomorrow.push({ item, subjectCode: subCode });
      });
    }
  });

  const allBackpackChecked =
    backpackItemsForTomorrow.length > 0 &&
    backpackItemsForTomorrow.every((b) => backpackChecked.includes(b.item));

  return (
    <div className="space-y-6">
      {/* Motivational Mbappe / Real Madrid & Benfica Banner */}
      <MbappeCorner />

      {/* Day Selector (Hoje vs Amanhã) - Prominent & ADHD Clean */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveDayView('hoje')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
            activeDayView === 'hoje'
              ? 'bg-red-600 text-white shadow-md shadow-red-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>O Que Fazer Hoje</span>
          {tasksDueToday.length > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeDayView === 'hoje' ? 'bg-white text-red-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {tasksDueToday.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveDayView('amanha')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
            activeDayView === 'amanha'
              ? 'bg-red-600 text-white shadow-md shadow-red-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Preparar Amanhã & Mochila</span>
          {tasksDueTomorrow.length > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeDayView === 'amanha' ? 'bg-white text-red-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {tasksDueTomorrow.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW: HOJE */}
      {activeDayView === 'hoje' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Handball Banner if today has training */}
          {hasHandballToday && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    Hoje há Treino de Andebol! (20h00 às 22h00)
                  </h4>
                  <p className="text-xs text-amber-100">
                    Horário bloqueado. Todo o estudo e TPCs devem ser terminados antes das 19h45!
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold uppercase bg-white/20 px-3 py-1 rounded-lg border border-white/20 hidden sm:inline-block">
                Pavilhão
              </span>
            </div>
          )}

          {/* Today's Classes & Schedule Quick Strip */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600" />
                  <span>Aulas de Hoje (9º B)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Escola Básica António Gedeão • Turma 9º B
                </p>
              </div>
              <button
                onClick={onOpenScheduleTab}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline"
              >
                <span>Ver Horário Completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {todayClasses.map((item, idx) => {
                const sub = SUBJECTS[item.subjectCode] || {
                  name: item.subjectCode,
                  code: item.subjectCode,
                  color: 'border-slate-300 bg-slate-50 text-slate-800',
                  teacher: '',
                };
                const slot = TIME_SLOTS.find((t) => t.timeIndex === item.timeIndex);

                return (
                  <div
                    key={item.id || idx}
                    className={`rounded-xl p-3 border ${sub.color} flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black tracking-wider uppercase">
                          {item.subjectCode}
                        </span>
                        <span className="text-[10px] font-bold bg-white/80 px-1.5 py-0.5 rounded-md border border-slate-200">
                          {item.room}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate" title={sub.name}>
                        {sub.name}
                      </p>
                      {sub.teacher && (
                        <p className="text-[10px] text-slate-600 truncate mt-0.5">
                          {sub.teacher}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 mt-2 border-t border-slate-200/60 pt-1">
                      {slot ? slot.startTime : `Tempo ${item.timeIndex}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks Due Today */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-600" />
                  <span>Trabalhos & TPCs para Entregar Hoje</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Faz o check-in com foto assim que terminares!
                </p>
              </div>
              <button
                onClick={onOpenAddTask}
                className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Adicionar
              </button>
            </div>

            {tasksDueToday.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-700">
                  🎉 Nenhum TPC ou teste marcado para hoje!
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Aproveita para adiantar o estudo dos próximos testes ou preparar a mochila de amanhã.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasksDueToday.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    settings={settings}
                    onOpenCheckIn={onOpenCheckIn}
                    onDeleteTask={onDeleteTask}
                    onToggleSession={onToggleSession}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: AMANHÃ & MOCHILA */}
      {activeDayView === 'amanha' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Handball Banner if tomorrow has training */}
          {hasHandballTomorrow && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    Amanhã tens Treino de Andebol! (20h00 às 22h00)
                  </h4>
                  <p className="text-xs text-amber-100">
                    Lembra-te de levar o saco de andebol com o equipamento pronto.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mochila do Dia Seguinte (Crucial for ADHD routine) */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50/50 rounded-2xl border-2 border-red-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600" />
                  <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                    🎒 Preparar a Mochila para Amanhã
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Marca cada material que colocas na mochila para não esqueceres nada.
                </p>
              </div>

              {allBackpackChecked ? (
                <div className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs">
                  <Check className="w-4 h-4" />
                  <span>Mochila 100% Pronta!</span>
                </div>
              ) : (
                <div className="text-xs font-extrabold text-red-700 bg-white px-3 py-1.5 rounded-xl border border-red-200">
                  {backpackChecked.length} de {backpackItemsForTomorrow.length} itens guardados
                </div>
              )}
            </div>

            {/* Checklist items generated from tomorrow's classes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {backpackItemsForTomorrow.map((bItem, idx) => {
                const isChecked = backpackChecked.includes(bItem.item);
                const sub = SUBJECTS[bItem.subjectCode];

                return (
                  <button
                    key={`${bItem.item}-${idx}`}
                    type="button"
                    onClick={() => onToggleBackpackItem(bItem.item)}
                    className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isChecked
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-red-300 text-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isChecked
                          ? 'bg-emerald-600 text-white'
                          : 'border-2 border-slate-300 bg-slate-50'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs sm:text-sm font-bold leading-snug ${
                          isChecked ? 'line-through opacity-75' : ''
                        }`}
                      >
                        {bItem.item}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        Disciplina: {sub?.name || bItem.subjectCode} ({bItem.subjectCode})
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tomorrow's Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-extrabold text-base text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              <span>Aulas de Amanhã (9º B)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {tomorrowClasses.map((item, idx) => {
                const sub = SUBJECTS[item.subjectCode] || {
                  name: item.subjectCode,
                  code: item.subjectCode,
                  color: 'border-slate-300 bg-slate-50 text-slate-800',
                  teacher: '',
                };
                const slot = TIME_SLOTS.find((t) => t.timeIndex === item.timeIndex);

                return (
                  <div
                    key={item.id || idx}
                    className={`rounded-xl p-3 border ${sub.color} flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black tracking-wider uppercase">
                          {item.subjectCode}
                        </span>
                        <span className="text-[10px] font-bold bg-white/80 px-1.5 py-0.5 rounded-md border border-slate-200">
                          {item.room}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate">{sub.name}</p>
                      {sub.teacher && (
                        <p className="text-[10px] text-slate-600 truncate mt-0.5">
                          {sub.teacher}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 mt-2 border-t border-slate-200/60 pt-1">
                      {slot ? slot.startTime : `Tempo ${item.timeIndex}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks Due Tomorrow */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-extrabold text-base text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-600" />
              <span>Trabalhos & TPCs para Amanhã</span>
            </h3>

            {tasksDueTomorrow.length === 0 ? (
              <div className="p-5 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                Nenhum trabalho agendado especificamente para amanhã.
              </div>
            ) : (
              <div className="space-y-3">
                {tasksDueTomorrow.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    settings={settings}
                    onOpenCheckIn={onOpenCheckIn}
                    onDeleteTask={onDeleteTask}
                    onToggleSession={onToggleSession}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ÁREA DE TESTES E TRABALHOS (Visão Completa com Alertas de Cores) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span>Radar de Testes e Trabalhos (Todos)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Organizados por urgência e data limite com check-in obrigatório por foto.
            </p>
          </div>

          {/* Legend toggle */}
          <button
            onClick={() => setShowColorExplanation((prev) => !prev)}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span>Regras do Código de Cores</span>
            {showColorExplanation ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Color Explanation Box (Requested by user) */}
        {showColorExplanation && (
          <div className="mb-5 bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-700 space-y-2 animate-in fade-in">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              Como funcionam os alertas visuais de prazo:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="inline-block font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px] mb-1">
                  🟢 Verde (Tempo confortável)
                </span>
                <p className="text-[11px] text-emerald-950 mt-1">
                  Faltam mais de <strong>{settings.greenDaysThreshold} dias</strong> para a data. Há tempo tranquilo para planear o estudo sem pressão.
                </p>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                <span className="inline-block font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px] mb-1">
                  🟡 Amarelo (Prazo a aproximar-se)
                </span>
                <p className="text-[11px] text-amber-950 mt-1">
                  Faltam entre <strong>{settings.yellowDaysThreshold} e {settings.greenDaysThreshold} dias</strong>. Altura recomendada para rever resumos e fazer exercícios.
                </p>
              </div>

              <div className="p-2.5 bg-red-50 rounded-lg border border-red-200">
                <span className="inline-block font-extrabold text-red-800 bg-red-100 px-2 py-0.5 rounded text-[11px] mb-1">
                  🔴 Vermelho (Prazo apertado)
                </span>
                <p className="text-[11px] text-red-950 mt-1">
                  Faltam <strong>2 dias ou menos</strong> (ou já é hoje!). Última oportunidade de estudo e preparação imediata do material.
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic mt-1">
              * Nota: Os pais podem ajustar os limiares de dias (ex.: alterar para 7 dias) no separador "Área dos Pais".
            </p>
          </div>
        )}

        {/* List of Tasks */}
        <div className="space-y-3.5">
          {upcomingTestsAndTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              settings={settings}
              onOpenCheckIn={onOpenCheckIn}
              onDeleteTask={onDeleteTask}
              onToggleSession={onToggleSession}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
