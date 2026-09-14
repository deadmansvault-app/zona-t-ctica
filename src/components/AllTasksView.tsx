import React, { useState } from 'react';
import { BookOpen, Plus, Filter, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { SchoolTask, AppSettings, TaskType } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { TaskCard } from './TaskCard';

interface AllTasksViewProps {
  tasks: SchoolTask[];
  settings: AppSettings;
  onOpenCheckIn: (task: SchoolTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleSession: (taskId: string, sessionId: string) => void;
  onOpenAddTask: () => void;
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({
  tasks,
  settings,
  onOpenCheckIn,
  onDeleteTask,
  onToggleSession,
  onOpenAddTask,
}) => {
  const [filterType, setFilterType] = useState<'all' | TaskType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const filteredTasks = tasks.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterSubject !== 'all' && t.subjectCode !== filterSubject) return false;
    if (filterStatus === 'pending' && t.checkIn) return false;
    if (filterStatus === 'confirmed' && !t.checkIn) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-600" />
            <span>Todos os Testes, Trabalhos e TPCs</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanha as datas limite, planos de estudo e comprovações de check-in.
          </p>
        </div>

        <button
          onClick={onOpenAddTask}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Teste / TPC</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center gap-2 text-xs">
        <span className="font-extrabold text-slate-700 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          Filtros:
        </span>

        {/* Type pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('teste')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterType === 'teste' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            Testes
          </button>
          <button
            onClick={() => setFilterType('tpc')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterType === 'tpc' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            TPC
          </button>
          <button
            onClick={() => setFilterType('trabalho')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterType === 'trabalho' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            Trabalhos
          </button>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Qualquer Estado
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            Por Confirmar
          </button>
          <button
            onClick={() => setFilterStatus('confirmed')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterStatus === 'confirmed' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            Confirmados
          </button>
        </div>

        {/* Subject filter */}
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="bg-slate-100 border-none font-bold text-slate-700 px-3 py-1.5 rounded-xl ml-auto"
        >
          <option value="all">Todas as Disciplinas</option>
          {Object.values(SUBJECTS).map((sub) => (
            <option key={sub.code} value={sub.code}>
              {sub.code} - {sub.name}
            </option>
          ))}
        </select>
      </div>

      {/* Task List */}
      {sortedTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          <p className="font-bold text-base text-slate-700">Nenhuma tarefa encontrada com estes filtros.</p>
          <p className="text-xs mt-1">Experimenta limpar os filtros ou adicionar uma nova tarefa no botão acima.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {sortedTasks.map((task) => (
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
  );
};
