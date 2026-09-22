import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Camera,
  Layers,
  Sparkles,
  Info,
  CalendarDays,
  Pencil,
  Trash2,
} from 'lucide-react';
import { SchoolTask, ScheduleItem, AppSettings, TaskType } from '../types';
import { SUBJECTS, TIME_SLOTS } from '../data/timetableData';
import {
  exportAllToIcs,
  getTaskGoogleCalendarUrl,
  getHandballGoogleCalendarUrl,
} from '../lib/googleCalendar';

interface MonthlyCalendarViewProps {
  tasks: SchoolTask[];
  schedule: ScheduleItem[];
  settings: AppSettings;
  onOpenCheckIn: (task: SchoolTask) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask?: (task: SchoolTask) => void;
  onToggleSession: (taskId: string, sessionId: string) => void;
  onOpenAddTaskWithDate: (dateStr: string) => void;
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  tasks,
  schedule,
  settings,
  onOpenCheckIn,
  onDeleteTask,
  onEditTask,
  onToggleSession,
  onOpenAddTaskWithDate,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    today.toISOString().split('T')[0]
  );
  const [filterType, setFilterType] = useState<'all' | 'teste' | 'tpc' | 'andebol'>('all');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  // Month label in Portuguese
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('pt-PT', {
    month: 'long',
  });
  const monthTitle = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${currentYear}`;

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // In Portugal: Monday is day 0, Sunday is day 6
    const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    // Previous month days to fill row
    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
    const days: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      dayOfWeek: number; // 0=Segunda ... 6=Domingo
    }[] = [];

    // Fill previous month trailing days
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDaysCount - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      const dow = (d.getDay() + 6) % 7;
      days.push({ dateStr, dayNum, isCurrentMonth: false, dayOfWeek: dow });
    }

    // Fill current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(currentYear, currentMonth, dayNum);
      // Format as YYYY-MM-DD safely with local year and month
      const yStr = currentYear;
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${yStr}-${mStr}-${dStr}`;
      const dow = (d.getDay() + 6) % 7;
      days.push({ dateStr, dayNum, isCurrentMonth: true, dayOfWeek: dow });
    }

    // Fill next month leading days to complete the 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const d = new Date(currentYear, currentMonth + 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      const dow = (d.getDay() + 6) % 7;
      days.push({ dateStr, dayNum, isCurrentMonth: false, dayOfWeek: dow });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Index tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, SchoolTask[]> = {};
    tasks.forEach((t) => {
      if (!map[t.dueDate]) map[t.dueDate] = [];
      map[t.dueDate].push(t);
    });
    return map;
  }, [tasks]);

  // Index study sessions by date
  const studySessionsByDate = useMemo(() => {
    const map: Record<string, { session: any; task: SchoolTask }[]> = {};
    tasks.forEach((t) => {
      if (t.studySessions) {
        t.studySessions.forEach((s) => {
          if (!map[s.date]) map[s.date] = [];
          map[s.date].push({ session: s, task: t });
        });
      }
    });
    return map;
  }, [tasks]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const endStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31`;

    const monthTasks = tasks.filter((t) => t.dueDate >= startStr && t.dueDate <= endStr);
    const tests = monthTasks.filter((t) => t.type === 'teste');
    const works = monthTasks.filter((t) => t.type === 'trabalho');
    const tpcs = monthTasks.filter((t) => t.type === 'tpc');
    const confirmedCount = monthTasks.filter((t) => t.checkIn).length;

    return {
      totalTests: tests.length,
      totalWorks: works.length,
      totalTpcs: tpcs.length,
      confirmedCount,
      pendingCount: monthTasks.length - confirmedCount,
    };
  }, [tasks, currentYear, currentMonth]);

  // Is handball day: Monday (0), Wednesday (2), Friday (4) in 0-indexed week (Seg=0)
  const isHandballDay = (dayOfWeek: number) => {
    return dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 4;
  };

  const todayStr = today.toISOString().split('T')[0];

  // Selected date details
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateStr]);

  const selectedDayOfWeek = (selectedDateObj.getDay() + 6) % 7; // 0=Segunda, 4=Sexta
  const isSelectedHandball = isHandballDay(selectedDayOfWeek);

  const selectedDateTasks = tasksByDate[selectedDateStr] || [];
  const selectedDateSessions = studySessionsByDate[selectedDateStr] || [];

  // Selected date classes from schedule (dayOfWeek 1 to 5)
  const selectedDaySchedule = useMemo(() => {
    if (selectedDayOfWeek >= 0 && selectedDayOfWeek <= 4) {
      const scheduleDayNumber = (selectedDayOfWeek + 1) as 1 | 2 | 3 | 4 | 5;
      return schedule
        .filter((s) => s.dayOfWeek === scheduleDayNumber)
        .sort((a, b) => a.timeIndex - b.timeIndex);
    }
    return [];
  }, [schedule, selectedDayOfWeek]);

  const weekDayHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top Banner & Monthly Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Calendário Escolar Mensal</span>
              </h2>
              <p className="text-xs text-slate-500">
                Visão panorâmica de testes, TPCs, planos de estudo e treinos de andebol.
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-all"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 px-3 min-w-[130px] text-center">
              {monthTitle}
            </span>
            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-all"
              title="Mês seguinte"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            id="btn-calendar-today"
            onClick={handleGoToToday}
            className="text-xs font-bold px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl transition-colors"
          >
            Hoje
          </button>

          <button
            id="btn-google-calendar"
            onClick={() => setShowGoogleModal(true)}
            className="text-xs font-black px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="Sincronizar tarefas e testes com o Google Agenda"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Google Agenda</span>
          </button>

          <button
            id="btn-add-task-cal"
            onClick={() => onOpenAddTaskWithDate(selectedDateStr)}
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs shadow-red-200 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Tarefa</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>

      {/* Month Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-red-100 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Testes no Mês</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {monthStats.totalTests}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Avaliações sumativas</p>
        </div>

        <div className="bg-white rounded-2xl border border-blue-100 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Trabalhos</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {monthStats.totalWorks}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Projetos ou relatórios</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">TPCs / Tarefas</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {monthStats.totalTpcs}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {monthStats.pendingCount > 0
              ? `${monthStats.pendingCount} por confirmar`
              : 'Tudo confirmado!'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Andebol</span>
            <span className="text-sm">🤾</span>
          </div>
          <p className="text-xs font-black text-slate-800 mt-1.5">
            Seg, Qua & Sex
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">20h00 às 22h00</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="font-extrabold text-slate-600 mr-2">Filtro visual:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('teste')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterType === 'teste'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Apenas Testes
          </button>
          <button
            onClick={() => setFilterType('tpc')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterType === 'tpc'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Apenas TPC
          </button>
          <button
            onClick={() => setFilterType('andebol')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterType === 'andebol'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Dias de Andebol
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Teste
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Trabalho
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> TPC
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Andebol
          </span>
        </div>
      </div>

      {/* Main Grid & Selected Day View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Calendar Matrix (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-black text-slate-700 py-2.5">
            {weekDayHeaders.map((h, i) => (
              <div
                key={h}
                className={i >= 5 ? 'text-slate-400' : 'text-slate-700'}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 text-xs">
            {calendarDays.map((cell) => {
              const dayTasks = tasksByDate[cell.dateStr] || [];
              const daySessions = studySessionsByDate[cell.dateStr] || [];
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDateStr;
              const handball = isHandballDay(cell.dayOfWeek);

              // Filter check
              const filteredDayTasks = dayTasks.filter((t) => {
                if (filterType === 'teste') return t.type === 'teste';
                if (filterType === 'tpc') return t.type === 'tpc';
                return true;
              });

              const showHandballBadge =
                (filterType === 'all' || filterType === 'andebol') && handball;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 cursor-pointer transition-all flex flex-col relative ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/60 text-slate-400'
                      : cell.dayOfWeek >= 5
                      ? 'bg-slate-50/30'
                      : 'bg-white'
                  } ${
                    isSelected
                      ? 'ring-2 ring-red-600 ring-inset z-10 bg-red-50/20'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-extrabold flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                        isToday
                          ? 'bg-red-600 text-white shadow-xs'
                          : isSelected
                          ? 'bg-slate-900 text-white'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Small handball ball indicator on compact view */}
                    {handball && (
                      <span
                        className="text-[10px] hidden sm:inline"
                        title="Treino de Andebol às 20h00"
                      >
                        🤾
                      </span>
                    )}
                  </div>

                  {/* Badges / Chips */}
                  <div className="space-y-1 overflow-hidden flex-1">
                    {/* Handball badge on mobile/desktop */}
                    {showHandballBadge && (
                      <div className="truncate text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 hidden sm:block">
                        Andebol 20h
                      </div>
                    )}

                    {/* Tasks badges */}
                    {filteredDayTasks.slice(0, 3).map((task) => {
                      const subject = SUBJECTS[task.subjectCode];
                      const isConfirmed = Boolean(task.checkIn);

                      if (task.type === 'teste') {
                        return (
                          <div
                            key={task.id}
                            className="truncate text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-600 text-white shadow-2xs flex items-center justify-between gap-1"
                            title={`Teste de ${subject ? subject.name : task.subjectCode}: ${task.title}${task.isTwoHourBlock ? ' (2 Tempos / 2h)' : ''}`}
                          >
                            <span className="flex items-center gap-1 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                              <span className="truncate">Teste {task.subjectCode}</span>
                            </span>
                            {task.isTwoHourBlock && (
                              <span className="text-[9px] bg-red-900/80 px-1 rounded-xs font-black shrink-0">
                                2h
                              </span>
                            )}
                          </div>
                        );
                      }

                      if (task.type === 'trabalho') {
                        return (
                          <div
                            key={task.id}
                            className="truncate text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600 text-white shadow-2xs flex items-center gap-1"
                            title={`Trabalho de ${subject ? subject.name : task.subjectCode}: ${task.title}`}
                          >
                            <span>Trab. {task.subjectCode}</span>
                          </div>
                        );
                      }

                      // TPC or others
                      return (
                        <div
                          key={task.id}
                          className={`truncate text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center justify-between border ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}
                          title={`TPC de ${subject ? subject.name : task.subjectCode}: ${task.title}`}
                        >
                          <span className="truncate">TPC {task.subjectCode}</span>
                          {isConfirmed && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />}
                        </div>
                      );
                    })}

                    {/* More tasks indicator */}
                    {filteredDayTasks.length > 3 && (
                      <div className="text-[9px] font-extrabold text-slate-500 text-center">
                        +{filteredDayTasks.length - 3} mais
                      </div>
                    )}

                    {/* Study session marker */}
                    {daySessions.length > 0 && dayTasks.length === 0 && (
                      <div className="truncate text-[9px] font-semibold px-1 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-0.5">
                        <BookOpen className="w-2.5 h-2.5 text-slate-500" />
                        <span>Estudo ({daySessions.length})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Side Panel (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            {/* Day Header */}
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-red-600 uppercase tracking-wider">
                  {selectedDateObj.toLocaleDateString('pt-PT', { weekday: 'long' })}
                </span>
                {selectedDateStr === todayStr && (
                  <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full">
                    HOJE
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-slate-900 capitalize mt-0.5">
                {selectedDateObj.toLocaleDateString('pt-PT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
            </div>

            {/* Handball Notice for Selected Date */}
            {isSelectedHandball && (
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl flex items-start gap-2.5">
                <span className="text-xl">🤾</span>
                <div>
                  <h4 className="text-xs font-black text-indigo-950">
                    Treino de Andebol (20h00 às 22h00)
                  </h4>
                  <p className="text-[11px] text-indigo-800 leading-snug mt-0.5">
                    Os TPCs e estudo devem estar concluídos antes das 19h45 para ir treinar com tranquilidade!
                  </p>
                </div>
              </div>
            )}

            {/* Tasks on this Day */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-red-600" />
                  <span>Testes & TPCs para este dia ({selectedDateTasks.length})</span>
                </h4>
                <button
                  onClick={() => onOpenAddTaskWithDate(selectedDateStr)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              {selectedDateTasks.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    Nenhum teste ou TPC com entrega marcada para este dia.
                  </p>
                  <button
                    onClick={() => onOpenAddTaskWithDate(selectedDateStr)}
                    className="mt-2 text-xs font-bold text-red-600 hover:underline"
                  >
                    + Registar tarefa neste dia
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateTasks.map((task) => {
                    const sub = SUBJECTS[task.subjectCode];
                    const isDone = Boolean(task.checkIn);

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border transition-all ${
                          task.type === 'teste'
                            ? 'bg-red-50/80 border-red-200'
                            : isDone
                            ? 'bg-emerald-50/80 border-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  task.type === 'teste'
                                    ? 'bg-red-600 text-white'
                                    : task.type === 'trabalho'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {task.type.toUpperCase()}
                              </span>
                              <span className="text-xs font-extrabold text-slate-900">
                                {sub ? sub.name : task.subjectCode}
                              </span>
                              {task.isTwoHourBlock && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
                                  2 Tempos (2h)
                                </span>
                              )}
                              {task.timeRange && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {task.timeRange}
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-xs sm:text-sm text-slate-900 mt-1 truncate">
                              {task.title}
                            </h5>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Action / Edit / CheckIn Button */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {onEditTask && (
                              <button
                                type="button"
                                onClick={() => onEditTask(task)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar evento ou alterar data"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <a
                              href={getTaskGoogleCalendarUrl(task, settings.schoolName)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Adicionar este evento ao Google Agenda"
                            >
                              <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                            </a>

                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar evento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {isDone ? (
                              <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Feito</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => onOpenCheckIn(task)}
                                className="flex items-center gap-1 text-xs font-black bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg shadow-2xs transition-transform active:scale-95"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Check-in</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Study Sessions on Task */}
                        {task.studySessions && task.studySessions.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-500">
                              Sessões de Estudo Planeadas:
                            </span>
                            {task.studySessions.map((s) => (
                              <div
                                key={s.id}
                                onClick={() => onToggleSession(task.id, s.id)}
                                className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-white/80 border border-slate-200 cursor-pointer hover:bg-slate-100/80"
                              >
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={s.completed}
                                    readOnly
                                    className="rounded text-red-600 focus:ring-0 cursor-pointer"
                                  />
                                  <span className={s.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>
                                    {s.date}: {s.topic} ({s.timeRange})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timetable for this day if weekday */}
            {selectedDaySchedule.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Aulas do 9º B neste dia ({selectedDaySchedule.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">EB António Gedeão</span>
                </h4>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                  {selectedDaySchedule.map((item) => {
                    const sub = SUBJECTS[item.subjectCode];
                    const slot = TIME_SLOTS.find((s) => s.timeIndex === item.timeIndex);

                    return (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 w-12 text-[11px] text-slate-500">
                            {slot ? slot.startTime : ''}
                          </span>
                          <span className="font-black text-slate-900">
                            {sub ? sub.code : item.subjectCode}
                          </span>
                          <span className="text-[11px] text-slate-500 hidden sm:inline truncate max-w-[120px]">
                            {sub ? sub.name : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                            {item.room}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Google Calendar Sync Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="bg-blue-600 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-base sm:text-lg">
                  Sincronização com o Google Agenda
                </h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Podes exportar todos os testes, trabalhos de grupo, TPCs e treinos de andebol do Francisco para o teu <strong>Google Calendar</strong> pessoal ou de família.
              </p>

              <div className="space-y-2.5">
                {/* 1-click .ICS Export */}
                <button
                  type="button"
                  onClick={() => {
                    exportAllToIcs(tasks, settings.schoolName);
                  }}
                  className="w-full text-left p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                      ICS
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 group-hover:text-blue-800">
                        Descarregar Ficheiro de Calendário (.ics)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Importa diretamente no Google Agenda, iPhone/Mac ou Outlook ({tasks.length} eventos).
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                    Descarregar
                  </span>
                </button>

                {/* Open Google Calendar Web */}
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                      Web
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 group-hover:text-slate-800">
                        Abrir Google Agenda no Navegador
                      </p>
                      <p className="text-[11px] text-slate-500">
                        calendar.google.com — Acede à tua conta Google
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Abrir ↗
                  </span>
                </a>

                {/* Add Handball to Google Calendar */}
                <a
                  href={getHandballGoogleCalendarUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                      SLB
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-950">
                        Adicionar Treino de Andebol ao Google Agenda
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Segundas, Quartas e Sextas das 20h00 às 22h00
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                    Criar no Google ↗
                  </span>
                </a>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
