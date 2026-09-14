import React, { useState, useEffect } from 'react';
import { X, Calendar, Pencil, BookOpen, Clock, Dumbbell, Sparkles, AlertCircle } from 'lucide-react';
import { SchoolTask, TaskType } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { generateStudyPlan } from '../lib/studyPlanner';

interface EditTaskModalProps {
  isOpen: boolean;
  task: SchoolTask | null;
  onClose: () => void;
  onSaveTask: (updatedTask: SchoolTask) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onSaveTask,
}) => {
  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('MAT');
  const [type, setType] = useState<TaskType>('tpc');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [updatePlan, setUpdatePlan] = useState(false);
  const [sessionsCount, setSessionsCount] = useState(3);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setSubjectCode(task.subjectCode || 'MAT');
      setType(task.type || 'tpc');
      setDescription(task.description || '');
      setDueDate(task.dueDate || '');
      setUpdatePlan(false);
      setSessionsCount(task.studySessions?.length || 3);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const sub = SUBJECTS[subjectCode];

    // Determine study sessions
    let studySessions = task.studySessions;
    if (updatePlan || (type === 'teste' && (!task.studySessions || task.studySessions.length === 0))) {
      studySessions = generateStudyPlan(sub?.name || subjectCode, dueDate, sessionsCount);
    } else if (task.dueDate !== dueDate && task.studySessions && task.studySessions.length > 0) {
      // If date changed and we have study sessions, adjust or regenerate if user chose
      if (updatePlan) {
        studySessions = generateStudyPlan(sub?.name || subjectCode, dueDate, sessionsCount);
      }
    }

    const updatedTask: SchoolTask = {
      ...task,
      title: title.trim(),
      subjectCode,
      type,
      description: description.trim(),
      dueDate,
      studySessions,
      studyPlanDaysBefore: task.studyPlanDaysBefore || (type === 'teste' ? 5 : undefined),
    };

    onSaveTask(updatedTask);
    onClose();
  };

  const hasDateChanged = task.dueDate !== dueDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-white" />
            <h3 className="font-extrabold text-base sm:text-lg">
              Editar Tarefa / Alterar Data
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Tarefa
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('tpc')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  type === 'tpc'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                TPC
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('teste');
                  if (!task.studySessions || task.studySessions.length === 0) {
                    setUpdatePlan(true);
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  type === 'teste'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Teste / Avaliação
              </button>
              <button
                type="button"
                onClick={() => setType('trabalho')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  type === 'trabalho'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Trabalho de Grupo
              </button>
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Disciplina (9º B)
            </label>
            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {Object.values(SUBJECTS).map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} - {sub.name} (Prof. {sub.teacher})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Título da Tarefa
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Ficha de Equações pág. 32 ou 1º Teste de Avaliação"
              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Due Date - Highlighted */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
            <label className="block text-xs font-black text-blue-900 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Data Limite / Data do Teste</span>
              </span>
              {hasDateChanged && (
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-extrabold">
                  Data alterada
                </span>
              )}
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (type === 'teste' || (task.studySessions && task.studySessions.length > 0)) {
                  setUpdatePlan(true);
                }
              }}
              className="w-full text-sm font-bold text-slate-900 border border-blue-300 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-blue-700 mt-1">
              Podes alterar o dia a qualquer momento sem perder o histórico.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas / Páginas / Conteúdo
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Rever capítulos 2 e 3; levar calculadora..."
              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Study Plan Options for Tests or existing plans */}
          {(type === 'teste' || (task.studySessions && task.studySessions.length > 0)) && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updatePlan}
                  onChange={(e) => setUpdatePlan(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recalcular plano de estudo para a nova data</span>
                </span>
              </label>

              {updatePlan && (
                <div className="pl-6 pt-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Número de sessões de estudo:
                  </label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSessionsCount(num)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                          sessionsCount === num
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {num} sessões {num === 3 ? '(recomendado)' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <Dumbbell className="w-3 h-3 text-amber-500" />
                    <span>Mantém a proteção dos treinos de andebol às 20h00.</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Check-in status notification if already done */}
          {task.checkIn && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800">
              <AlertCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Esta tarefa já tem check-in realizado com comprovativo. As alterações irão manter o registo de conclusão.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-200 transition-all flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Guardar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
