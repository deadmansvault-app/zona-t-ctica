import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  Sparkles,
  BookOpen,
  Clock,
  Dumbbell,
  Users,
  Wand2,
  FileText,
} from 'lucide-react';
import { SchoolTask, TaskType } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { generateStudyPlan } from '../lib/studyPlanner';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: SchoolTask) => void;
  initialDueDate?: string;
  academicYear?: string;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  initialDueDate,
  academicYear,
}) => {
  // Mode: 'manual' | 'text'
  const [creationMode, setCreationMode] = useState<'manual' | 'text'>('manual');

  // Core Form State
  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('MAT');
  const [type, setType] = useState<TaskType>('tpc');
  const [description, setDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState('Francisco, Martim, Tiago');

  // Default due date: initialDueDate or tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDue = initialDueDate || tomorrow.toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState(defaultDue);

  useEffect(() => {
    if (initialDueDate) {
      setDueDate(initialDueDate);
    }
  }, [initialDueDate]);

  // Plan Settings
  const [generatePlan, setGeneratePlan] = useState(false);
  const [sessionsCount, setSessionsCount] = useState(3);
  const [daysBefore, setDaysBefore] = useState(5);

  // Text Helper State
  const [aiPromptText, setAiPromptText] = useState('');
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Text Helper inside modal
  const handleApplyAiText = () => {
    if (!aiPromptText.trim()) return;

    const upper = aiPromptText.toUpperCase();

    // Detect subject
    let matchedSub = subjectCode;
    for (const code of Object.keys(SUBJECTS)) {
      if (upper.includes(code) || upper.includes(SUBJECTS[code].name.toUpperCase())) {
        matchedSub = code;
        break;
      }
    }
    setSubjectCode(matchedSub);

    // Detect type
    if (upper.includes('GRUPO') || upper.includes('TRABALHO') || upper.includes('PROJETO')) {
      setType('trabalho');
      setGeneratePlan(true);
    } else if (upper.includes('TESTE') || upper.includes('AVALIAÇÃO') || upper.includes('SUMATIVA')) {
      setType('teste');
      setGeneratePlan(true);
    } else {
      setType('tpc');
    }

    // Set title and description
    setTitle(aiPromptText.slice(0, 60).trim());
    setDescription(aiPromptText.trim());

    setAiSuccessMsg('✨ Campos preenchidos automaticamente!');
    setTimeout(() => setAiSuccessMsg(''), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const sub = SUBJECTS[subjectCode];
    let studySessions = undefined;

    if (type === 'trabalho' && generatePlan) {
      const members = groupMembers.split(',').map((m) => m.trim()).filter(Boolean);
      const dObj = new Date(dueDate);
      const phases = [
        `Fase 1: Pesquisa e divisão de tarefas (${members.join(', ')})`,
        'Fase 2: Elaboração do conteúdo e slides',
        'Fase 3: Revisão final e ensaio de apresentação',
      ];
      studySessions = phases.map((phase, idx) => {
        const pDate = new Date(dObj);
        pDate.setDate(pDate.getDate() - (phases.length - idx) * 2);
        return {
          id: `session-group-${Date.now()}-${idx}`,
          date: pDate.toISOString().split('T')[0],
          timeRange: '17:30 - 18:30',
          topic: phase,
          completed: false,
        };
      });
    } else if (generatePlan || type === 'teste') {
      studySessions = generateStudyPlan(sub?.name || subjectCode, dueDate, sessionsCount);
    }

    const finalDescription =
      type === 'trabalho' && groupMembers.trim()
        ? `${description.trim() ? description.trim() + '\n\n' : ''}Membros do Grupo: ${groupMembers.trim()}`
        : description.trim();

    const newTask: SchoolTask = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      subjectCode,
      type,
      description: finalDescription,
      dueDate,
      studyPlanDaysBefore: generatePlan || type === 'teste' ? daysBefore : undefined,
      studySessions,
      academicYear: academicYear || undefined,
      createdAt: new Date().toISOString(),
    };

    onAddTask(newTask);
    onClose();

    // Reset fields
    setTitle('');
    setDescription('');
    setType('tpc');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-700 px-5 py-4 text-white flex items-center justify-between shadow-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                Registar Tarefa / Trabalho Escolar
              </h3>
              <p className="text-xs text-red-100">
                Zona de Treino • Organização de Estudo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Creation Mode Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setCreationMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              creationMode === 'manual'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Preenchimento Manual</span>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              creationMode === 'text'
                ? 'bg-white text-amber-900 shadow-xs border border-amber-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Colar Texto / Teams</span>
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
          {/* TEXT HELPER SECTION */}
          {creationMode === 'text' && (
            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2.5 animate-in slide-in-from-top-1">
              <label className="block text-xs font-bold text-amber-950">
                Cola aqui o texto do Teams, Classroom ou apontamento do professor:
              </label>
              <textarea
                rows={3}
                value={aiPromptText}
                onChange={(e) => setAiPromptText(e.target.value)}
                placeholder="Ex: 'Para quarta-feira, TPC de Português: exercícios da página 45 números 1 a 4 sobre orações subordinadas'..."
                className="w-full text-xs border border-amber-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <div className="flex items-center justify-between gap-2">
                {aiSuccessMsg ? (
                  <span className="text-xs font-black text-emerald-700">{aiSuccessMsg}</span>
                ) : (
                  <span className="text-[10px] text-amber-800">
                    Deteta a disciplina, o tipo e o prazo automaticamente.
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleApplyAiText}
                  disabled={!aiPromptText.trim()}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Preencher Campos</span>
                </button>
              </div>
            </div>
          )}

          {/* FORM FIELDS (Shared by all modes) */}
          <form id="add-task-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tipo de Tarefa
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('tpc');
                    setGeneratePlan(false);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                    type === 'tpc'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  TPC
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('teste');
                    setGeneratePlan(true);
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
                  onClick={() => {
                    setType('trabalho');
                    setGeneratePlan(true);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                    type === 'trabalho'
                      ? 'bg-red-600 text-white shadow-xs'
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
                Disciplina
              </label>
              <select
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
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
                Título / O que é preciso fazer
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Ficha de Equações pág. 32 ou Trabalho sobre Vulcões"
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            {/* Group Teammates if Trabalho de Grupo */}
            {type === 'trabalho' && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Membros do Grupo (separados por vírgula):</span>
                </label>
                <input
                  type="text"
                  value={groupMembers}
                  onChange={(e) => setGroupMembers(e.target.value)}
                  placeholder="Francisco, Tiago, Martim..."
                  className="w-full text-xs sm:text-sm border border-blue-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            )}

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>Data Limite / Data de Entrega ou do Teste</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            {/* Description / Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Páginas / Exercícios / Instruções Detalhadas
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Exercícios 2, 4 e 5 da pág. 45; apresentar com capa e introdução..."
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            {/* Study / Group Plan Generator */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generatePlan || type === 'teste' || type === 'trabalho'}
                  onChange={(e) => setGeneratePlan(e.target.checked)}
                  className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {type === 'trabalho'
                    ? 'Gerar etapas automáticas de trabalho de grupo'
                    : 'Gerar automaticamente plano de estudo'}
                </span>
              </label>

              {(generatePlan || type === 'teste') && type !== 'trabalho' && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Número de sessões de estudo:</span>
                    <select
                      value={sessionsCount}
                      onChange={(e) => setSessionsCount(Number(e.target.value))}
                      className="border border-slate-300 rounded-lg px-2 py-1 font-bold bg-white"
                    >
                      <option value={2}>2 sessões (Curto)</option>
                      <option value={3}>3 sessões (Recomendado)</option>
                      <option value={4}>4 sessões (Aprofundado)</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <Dumbbell className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Proteção de Andebol:</strong> O plano ignora automaticamente as segundas, quartas e sextas das 20h00 às 22h00.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="add-task-form"
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Gravar Tarefa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
