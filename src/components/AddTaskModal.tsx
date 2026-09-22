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
  CheckCircle2,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';
import { SchoolTask, TaskType } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { generateStudyPlan } from '../lib/studyPlanner';
import { parseTasksFromText, convertParsedEntryToSchoolTask, ParsedTaskEntry } from '../lib/taskParser';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: SchoolTask) => void;
  onAddMultipleTasks?: (tasks: SchoolTask[]) => void;
  initialDueDate?: string;
  academicYear?: string;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onAddMultipleTasks,
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
  const [parsedEntries, setParsedEntries] = useState<ParsedTaskEntry[]>([]);

  // Automatically detect multiple entries or structured lines when text changes
  useEffect(() => {
    if (!aiPromptText.trim()) {
      setParsedEntries([]);
      return;
    }
    const detected = parseTasksFromText(aiPromptText, {
      defaultType: type,
      academicYear: academicYear || '2026/2027',
    });
    setParsedEntries(detected);
  }, [aiPromptText, type, academicYear]);

  if (!isOpen) return null;

  // Toggle selection for an individual detected entry
  const handleToggleEntry = (id: string) => {
    setParsedEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Update a single field on a parsed entry inline
  const handleUpdateEntry = (id: string, field: keyof ParsedTaskEntry, value: any) => {
    setParsedEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'subjectCode') {
          updated.subjectName = SUBJECTS[value]?.name || value;
        }
        return updated;
      })
    );
  };

  // Toggle all entries
  const handleToggleAll = () => {
    const allSelected = parsedEntries.every((e) => e.selected !== false);
    setParsedEntries((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
  };

  // Create all selected parsed tasks at once!
  const handleCreateMultipleTasks = () => {
    const selected = parsedEntries.filter((e) => e.selected !== false);
    if (selected.length === 0) return;

    const createdTasks = selected.map((entry) =>
      convertParsedEntryToSchoolTask(entry, academicYear || '2026/2027')
    );

    if (onAddMultipleTasks) {
      onAddMultipleTasks(createdTasks);
    } else {
      createdTasks.forEach((t) => onAddTask(t));
    }

    onClose();
  };

  // Load a single entry into the manual form
  const handleLoadEntryIntoForm = (entry: ParsedTaskEntry) => {
    setTitle(entry.title);
    setSubjectCode(entry.subjectCode);
    setType(entry.type);
    setDueDate(entry.dueDate);
    setDescription(entry.description);
    setCreationMode('manual');
    setAiSuccessMsg('✨ Dados carregados no formulário!');
    setTimeout(() => setAiSuccessMsg(''), 3000);
  };

  // Text Helper button inside modal (for single or general entry)
  const handleApplyAiText = () => {
    if (!aiPromptText.trim()) return;

    if (parsedEntries.length > 0) {
      const first = parsedEntries[0];
      handleLoadEntryIntoForm(first);
      return;
    }

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

  const selectedEntriesCount = parsedEntries.filter((e) => e.selected !== false).length;

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
            <div className="space-y-4 animate-in slide-in-from-top-1">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-950">
                    Cola aqui o texto do Teams, Classroom ou apontamento do professor:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {parsedEntries.length > 1 && (
                      <span className="text-[11px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                        {parsedEntries.length} eventos detetados
                      </span>
                    )}
                    {parsedEntries.some((e) => e.isTwoHourBlock) && (
                      <span className="text-[11px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-600" />
                        {parsedEntries.filter((e) => e.isTwoHourBlock).length} teste(s) 2h unificado(s)
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={aiPromptText}
                  onChange={(e) => setAiPromptText(e.target.value)}
                  placeholder="Exemplo com múltiplas entradas:
24-05-2027 (08:15-09:05)	Teste de Físico-Química...
24-05-2027 (09:15-10:05)	Teste de Físico-Química...
21-05-2027 (10:25-11:15)	Teste de Matemática..."
                  className="w-full text-xs font-mono border border-amber-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <div className="flex items-center justify-between gap-2">
                  {aiSuccessMsg ? (
                    <span className="text-xs font-black text-emerald-700">{aiSuccessMsg}</span>
                  ) : (
                    <span className="text-[11px] text-amber-800">
                      Deteta múltiplas datas, horários, disciplinas e docentes de uma só vez!
                    </span>
                  )}
                  {parsedEntries.length <= 1 && (
                    <button
                      type="button"
                      onClick={handleApplyAiText}
                      disabled={!aiPromptText.trim()}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Preencher Campos</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Entry Detected Panel */}
              {parsedEntries.length > 1 && (
                <div className="bg-slate-50 border-2 border-red-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-red-600 font-black text-xs">
                        {parsedEntries.length}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">
                          Múltiplos Eventos Detetados no Texto
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Seleciona os eventos que pretendes criar na agenda:
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                    >
                      {parsedEntries.every((e) => e.selected !== false) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                  </div>

                  {/* List of Detected Task Cards */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {parsedEntries.map((entry, idx) => (
                      <div
                        key={entry.id || idx}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          entry.selected !== false
                            ? 'bg-white border-red-300 shadow-xs'
                            : 'bg-slate-100/70 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleEntry(entry.id)}
                            className="mt-0.5 text-red-600 hover:text-red-700"
                          >
                            {entry.selected !== false ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          <div className="flex-1 space-y-1.5">
                            {/* Header row: Subject & Type Badges & Date */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={entry.subjectCode}
                                  onChange={(e) => handleUpdateEntry(entry.id, 'subjectCode', e.target.value)}
                                  className="text-[11px] font-black bg-slate-100 border border-slate-300 rounded-md px-1.5 py-0.5"
                                >
                                  {Object.keys(SUBJECTS).map((code) => (
                                    <option key={code} value={code}>
                                      {code} - {SUBJECTS[code].name}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  value={entry.type}
                                  onChange={(e) => handleUpdateEntry(entry.id, 'type', e.target.value as TaskType)}
                                  className="text-[11px] font-bold uppercase bg-slate-100 border border-slate-300 rounded-md px-1.5 py-0.5"
                                >
                                  <option value="teste">Teste</option>
                                  <option value="trabalho">Trabalho</option>
                                  <option value="tpc">TPC</option>
                                  <option value="outro">Outro</option>
                                </select>

                                {entry.isTwoHourBlock && (
                                  <span
                                    className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 shrink-0"
                                    title="Teste de 2 tempos / 2 horas unificado"
                                  >
                                    <Clock className="w-3 h-3 text-purple-600" /> 2 Tempos (2h)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                <Calendar className="w-3 h-3 text-red-600" />
                                <input
                                  type="date"
                                  value={entry.dueDate}
                                  onChange={(e) => handleUpdateEntry(entry.id, 'dueDate', e.target.value)}
                                  className="bg-transparent border-none text-[11px] font-bold p-0 focus:outline-hidden"
                                />
                                {entry.timeRange && (
                                  <span className="text-slate-500 font-semibold ml-1">
                                    • {entry.timeRange}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Title & Teacher input */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={entry.title}
                                onChange={(e) => handleUpdateEntry(entry.id, 'title', e.target.value)}
                                className="flex-1 font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-red-500 focus:outline-hidden bg-white"
                              />
                            </div>
                            {entry.teacher && (
                              <div className="text-[11px] text-slate-500">
                                Docente: <span className="font-semibold text-slate-700">{entry.teacher}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Bar for Multiple Entries */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600">
                      {selectedEntriesCount} de {parsedEntries.length} eventos selecionados
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const first = parsedEntries[0];
                          if (first) handleLoadEntryIntoForm(first);
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Carregar 1º no Formulário
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateMultipleTasks}
                        disabled={selectedEntriesCount === 0}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Criar Todos os {selectedEntriesCount} Eventos</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
