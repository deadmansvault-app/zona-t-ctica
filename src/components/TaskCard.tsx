import React, { useState } from 'react';
import { CheckCircle2, Clock, Camera, AlertTriangle, Calendar, BookOpen, Trash2, Eye, ExternalLink, Pencil } from 'lucide-react';
import { SchoolTask, AppSettings } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { getUrgencyStatus } from '../lib/studyPlanner';

interface TaskCardProps {
  task: SchoolTask;
  settings: AppSettings;
  onOpenCheckIn: (task: SchoolTask) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask?: (task: SchoolTask) => void;
  onToggleSession?: (taskId: string, sessionId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  settings,
  onOpenCheckIn,
  onDeleteTask,
  onEditTask,
  onToggleSession,
}) => {
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const subject = SUBJECTS[task.subjectCode] || {
    name: task.subjectCode,
    code: task.subjectCode,
    teacher: '',
    color: 'border-slate-300 bg-slate-100 text-slate-800',
  };

  const urgency = getUrgencyStatus(
    task.dueDate,
    settings.greenDaysThreshold,
    settings.yellowDaysThreshold
  );

  const formattedDate = new Date(task.dueDate).toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const formattedCheckInDate = task.checkIn
    ? new Date(task.checkIn.timestamp).toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <>
      <div
        className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden ${urgency.borderAccent}`}
      >
        <div className="p-4 sm:p-5">
          {/* Header Row: Subject, Type & Urgency Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-lg border ${subject.color}`}
              >
                {task.subjectCode}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {subject.name}
              </span>
              {subject.teacher && (
                <span className="hidden sm:inline-block text-[11px] text-slate-400">
                  • Prof. {subject.teacher}
                </span>
              )}
            </div>

            {/* Urgency Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 ${urgency.bgBadge}`}
                title={`Configuração: Verde > ${settings.greenDaysThreshold}d, Amarelo ${settings.yellowDaysThreshold}-${settings.greenDaysThreshold}d, Vermelho < ${settings.yellowDaysThreshold}d`}
              >
                {urgency.color === 'vermelho' && <AlertTriangle className="w-3 h-3 text-red-600" />}
                {urgency.color === 'amarelo' && <Clock className="w-3 h-3 text-amber-600" />}
                {urgency.color === 'verde' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                <span>{urgency.label}</span>
              </span>

              {onEditTask && (
                <button
                  onClick={() => onEditTask(task)}
                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded-md transition-colors flex items-center gap-1"
                  title="Editar evento ou alterar data"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px] font-bold">Editar</span>
                </button>
              )}

              <button
                onClick={() => onDeleteTask(task.id)}
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors"
                title="Eliminar tarefa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title & Description */}
          <div className="mb-3">
            <div className="flex items-start gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md mt-0.5">
                {task.type.toUpperCase()}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                {task.title}
              </h3>
            </div>
            {task.description && (
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed pl-1">
                {task.description}
              </p>
            )}
          </div>

          {/* Due date and study sessions if applicable */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-4 pl-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>Para: {formattedDate}</span>
              </span>
              {task.type === 'teste' && (
                <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-md text-[11px] border border-red-200">
                  Teste de Avaliação
                </span>
              )}
            </div>

            {onEditTask && (
              <button
                type="button"
                onClick={() => onEditTask(task)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 border border-blue-200/60"
                title="Alterar data marcada ou corrigir dia"
              >
                <Pencil className="w-3 h-3 text-blue-600" />
                <span>Alterar dia</span>
              </button>
            )}
          </div>

          {/* Study Plan breakdown if exists */}
          {task.studySessions && task.studySessions.length > 0 && (
            <div className="mb-4 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
              <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-red-600" />
                <span>Plano de Estudo Sugerido (Sem Andebol)</span>
              </p>
              <div className="space-y-1.5">
                {task.studySessions.map((session, sIdx) => {
                  const sDate = new Date(session.date).toLocaleDateString('pt-PT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });
                  return (
                    <div
                      key={session.id || sIdx}
                      className={`flex items-start gap-2 text-xs p-2 rounded-lg transition-all ${
                        session.completed
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'bg-white border border-slate-200/60 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={session.completed}
                        onChange={() => onToggleSession && onToggleSession(task.id, session.id)}
                        className="mt-0.5 rounded-sm text-red-600 focus:ring-red-500 cursor-pointer"
                        id={`sess-${session.id}`}
                      />
                      <label htmlFor={`sess-${session.id}`} className="cursor-pointer flex-1">
                        <span className="font-bold text-slate-900">{sDate}:</span>{' '}
                        <span className="text-red-700 font-semibold">[{session.timeRange}]</span> —{' '}
                        <span className={session.completed ? 'line-through text-slate-500' : ''}>
                          {session.topic}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Check-In Status Bar (The core requirement) */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {task.checkIn ? (
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-emerald-800">
                      Check-in Confirmado com Foto!
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formattedCheckInDate} {task.checkIn.notes ? `• "${task.checkIn.notes}"` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPhotoModal(true)}
                    className="relative group flex-shrink-0 rounded-lg overflow-hidden border-2 border-emerald-500 hover:border-emerald-600 transition-all shadow-xs"
                    title="Clica para ver a foto comprovativa ampliada"
                  >
                    <img
                      src={task.checkIn.photoDataUrl}
                      alt="Comprovativo"
                      className="w-12 h-12 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </button>
                  <button
                    onClick={() => onOpenCheckIn(task)}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-600 hover:underline px-2 py-1"
                  >
                    Substituir foto
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-xs font-bold text-amber-800">
                    Por Confirmar (Upload de foto obrigatório)
                  </span>
                </div>
                <button
                  onClick={() => onOpenCheckIn(task)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-95 text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-red-200 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Fazer Check-in com Foto</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High-res photo preview modal */}
      {showPhotoModal && task.checkIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Foto Comprovativa • {task.subjectCode}
                </p>
                <h4 className="text-sm font-extrabold">{task.title}</h4>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-white hover:text-red-400 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={task.checkIn.photoDataUrl}
                alt="Foto comprovativa em tamanho grande"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Registado em: {formattedCheckInDate}</span>
              {task.checkIn.notes && <span className="italic">"{task.checkIn.notes}"</span>}
              <button
                onClick={() => setShowPhotoModal(false)}
                className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-red-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
