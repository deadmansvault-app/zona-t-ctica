import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  Copy,
  ArrowRight,
  Bot,
  Users,
  BookOpen,
  FileCheck,
  CalendarCheck,
  ExternalLink,
  Download,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { SchoolTask, TaskType } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { generateIcsCalendar, downloadIcsFile } from '../lib/googleCalendar';
import {
  parseTasksFromText,
  convertParsedEntryToSchoolTask,
  ParsedTaskEntry,
} from '../lib/taskParser';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTask?: (task: SchoolTask) => void;
  onAddTask?: (task: SchoolTask) => void;
  onAddMultipleTasks?: (tasks: SchoolTask[]) => void;
  tasks?: SchoolTask[];
  settings?: any;
  schoolName?: string;
  academicYear?: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onImportTask,
  onAddTask,
  onAddMultipleTasks,
  tasks = [],
  settings,
  academicYear,
}) => {
  const [activeTab, setActiveTab] = useState<'parser' | 'groupwork' | 'google'>('parser');
  const [pastedText, setPastedText] = useState('');
  const [selectedType, setSelectedType] = useState<TaskType>('tpc');
  const [successMsg, setSuccessMsg] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [parsedEntries, setParsedEntries] = useState<ParsedTaskEntry[]>([]);

  const effectiveAcademicYear = academicYear || settings?.academicYear || '2026/2027';

  // Automatically detect multiple entries or structured lines when text changes
  useEffect(() => {
    if (!pastedText.trim()) {
      setParsedEntries([]);
      return;
    }
    const detected = parseTasksFromText(pastedText, {
      defaultType: selectedType,
      academicYear: effectiveAcademicYear,
    });
    setParsedEntries(detected);
  }, [pastedText, selectedType, effectiveAcademicYear]);

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

  // Dispatch created tasks to the parent handler
  const saveCreatedTasks = (tasksToSave: SchoolTask[]) => {
    if (tasksToSave.length === 0) return;

    if (onAddMultipleTasks) {
      onAddMultipleTasks(tasksToSave);
    } else {
      const handler = onAddTask || onImportTask;
      if (handler) {
        tasksToSave.forEach((t) => handler(t));
      }
    }

    setCreatedCount(tasksToSave.length);
    setSuccessMsg(true);
    setPastedText('');
    setParsedEntries([]);

    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1800);
  };

  // Group work state
  const [groupTitle, setGroupTitle] = useState('');
  const [groupSubject, setGroupSubject] = useState('CN');
  const [groupMembers, setGroupMembers] = useState('Francisco, Martim, Tiago');
  const [groupDueDate, setGroupDueDate] = useState('');
  const [groupStepCount, setGroupStepCount] = useState(3);

  if (!isOpen) return null;

  // Smart parser for quick pasted homework or multiple tests from Teams, Classroom, WhatsApp or Inovar
  const handleParseAndImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    // If multiple entries were detected, create all selected entries!
    if (parsedEntries.length > 1) {
      const selected = parsedEntries.filter((entry) => entry.selected !== false);
      const toConvert = selected.length > 0 ? selected : parsedEntries;
      const tasksToSave = toConvert.map((entry) =>
        convertParsedEntryToSchoolTask(entry, effectiveAcademicYear)
      );
      saveCreatedTasks(tasksToSave);
      return;
    }

    // If exactly one structured entry was detected, use it
    if (parsedEntries.length === 1) {
      const singleTask = convertParsedEntryToSchoolTask(parsedEntries[0], effectiveAcademicYear);
      saveCreatedTasks([singleTask]);
      return;
    }

    // Fallback: general unstructured text
    let detectedSubject = 'MAT';
    const upper = pastedText.toUpperCase();
    for (const code of Object.keys(SUBJECTS)) {
      if (upper.includes(code) || upper.includes(SUBJECTS[code].name.toUpperCase())) {
        detectedSubject = code;
        break;
      }
    }

    let detectedType: TaskType = selectedType;
    if (upper.includes('GRUPO') || upper.includes('TRABALHO DE GRUPO') || upper.includes('PROJETO')) {
      detectedType = 'trabalho';
    } else if (upper.includes('TESTE') || upper.includes('AVALIAÇÃO') || upper.includes('SUMATIVA') || upper.includes('EXAME')) {
      detectedType = 'teste';
    } else if (upper.includes('TPC') || upper.includes('DEVER') || upper.includes('EXERCÍCIOS')) {
      detectedType = 'tpc';
    }

    const due = new Date();
    due.setDate(due.getDate() + (detectedType === 'teste' ? 7 : detectedType === 'trabalho' ? 10 : 2));

    const importedTask: SchoolTask = {
      id: `task-ai-${Date.now()}`,
      title: pastedText.slice(0, 50).trim() || `Tarefa de ${SUBJECTS[detectedSubject]?.name || detectedSubject}`,
      subjectCode: detectedSubject,
      type: detectedType,
      description: pastedText.trim(),
      dueDate: due.toISOString().split('T')[0],
      academicYear: effectiveAcademicYear,
      studyPlanDaysBefore: detectedType === 'teste' ? 5 : detectedType === 'trabalho' ? 7 : undefined,
      createdAt: new Date().toISOString(),
    };

    saveCreatedTasks([importedTask]);
  };

  // Group work generator
  const handleCreateGroupWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim()) return;

    const due = groupDueDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split('T')[0];
    })();

    const members = groupMembers.split(',').map((m) => m.trim()).filter(Boolean);

    const steps = [
      `Definição do tema e pesquisa de fontes com o grupo (${members.join(', ')})`,
      'Desenvolvimento do conteúdo escrito e estrutura da apresentação',
      'Revisão com o grupo e preparação da entrega final',
    ].slice(0, groupStepCount);

    const dObj = new Date(due);
    const studySessions = steps.map((st, idx) => {
      const stepDate = new Date(dObj);
      stepDate.setDate(stepDate.getDate() - (steps.length - idx) * 3);
      return {
        id: `s-group-${Date.now()}-${idx}`,
        date: stepDate.toISOString().split('T')[0],
        timeRange: '17:30 - 18:45',
        topic: `Etapa ${idx + 1}: ${st}`,
        completed: false,
      };
    });

    const newTask: SchoolTask = {
      id: `task-group-${Date.now()}`,
      title: groupTitle.trim(),
      subjectCode: groupSubject,
      type: 'trabalho',
      description: `Trabalho de Grupo de ${SUBJECTS[groupSubject]?.name || groupSubject}.\nElementos: ${members.join(', ')}\n\nPassos Planeados:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      dueDate: due,
      academicYear: settings?.academicYear || '2026/2027',
      studyPlanDaysBefore: 7,
      studySessions,
      createdAt: new Date().toISOString(),
    };

    onImportTask(newTask);
    setGroupTitle('');
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1200);
  };

  // Google Calendar Sync action
  const handleExportGoogleCalendar = () => {
    const icsContent = generateIcsCalendar(tasks, [], settings || { academicYear: '2026/2027', studentName: 'Francisco' });
    downloadIcsFile(`agenda-escolar-${settings?.studentName || 'francisco'}.ics`, icsContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                  Assistente AI Escolar
                </h3>
                <span className="text-[10px] uppercase font-black tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full">
                  AI
                </span>
              </div>
              <p className="text-xs text-red-100">
                Criar TPCs, Testes, Trabalhos de Grupo & Sincronização Google
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

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('parser')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'parser'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Colar Texto / Teams / Inovar</span>
          </button>

          <button
            onClick={() => setActiveTab('groupwork')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'groupwork'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Trabalho de Grupo AI</span>
          </button>

          <button
            onClick={() => setActiveTab('google')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'google'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Google Agenda</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-slate-700 text-xs sm:text-sm">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in zoom-in-95">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-black text-sm">
                  {createdCount > 1
                    ? `🎉 ${createdCount} eventos adicionados à tua agenda!`
                    : '🎉 Evento adicionado com sucesso!'}
                </h4>
                <p className="text-xs text-emerald-700">
                  Os eventos escolares e planos de estudo foram guardados e já estão visíveis no teu calendário e na lista de tarefas.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'parser' && !successMsg && (
            <form onSubmit={handleParseAndImport} className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Deteção Inteligente Multi-Evento:</strong> Se colares um texto com várias linhas ou testes (ex: Físico-Química, Matemática, História), a IA reconhece cada linha e <strong>cria múltiplos eventos independentes</strong> na tua agenda!
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-red-600" />
                    <span>Texto do TPC, Teste ou Múltiplas Avaliações:</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {parsedEntries.length > 1 && (
                      <span className="text-[11px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
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
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Exemplo de múltiplos testes:
24-05-2027 (08:15-09:05)	Teste de Físico-Química, Sandra Cristina Furtado Lopes	Sandra Lopes
24-05-2027 (09:15-10:05)	Teste de Físico-Química, Sandra Cristina Furtado Lopes	Sandra Lopes
21-05-2027 (10:25-11:15)	Teste de Matemática, Cláudia Marisa de Oliveira Martinho	Cláudia Martinho
21-05-2027 (11:25-12:15)	Teste de Matemática, Cláudia Marisa de Oliveira Martinho	Cláudia Martinho
10-05-2027 (13:25-14:15)	Teste de História, Alexandra Maria Rodrigues Brito	Alexandra Brito"
                  className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              {/* Multi-Entry Detected Section */}
              {parsedEntries.length > 1 ? (
                <div className="bg-slate-50 border-2 border-red-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        {parsedEntries.length}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">
                          {parsedEntries.length} Eventos Detetados no Texto
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Confirma ou edita antes de adicionar à tua agenda escolar:
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-xs font-bold text-red-600 hover:text-red-700 underline"
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
                                  <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 shrink-0" title="Teste de 2 tempos / 2 horas unificado">
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

                  {/* Batch Action Bar */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600">
                      {parsedEntries.filter((e) => e.selected !== false).length} de {parsedEntries.length} eventos selecionados
                    </span>
                    <button
                      type="submit"
                      disabled={parsedEntries.filter((e) => e.selected !== false).length === 0}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Criar os {parsedEntries.filter((e) => e.selected !== false).length} Eventos no Calendário</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Tipo pretendido:</span>
                    {(['tpc', 'teste', 'trabalho'] as TaskType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedType(t)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                          selectedType === t
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t === 'tpc' ? 'TPC' : t === 'teste' ? 'Teste' : 'Trabalho de Grupo'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Ano Letivo: <strong>{effectiveAcademicYear}</strong>
                    </span>
                    <button
                      type="submit"
                      disabled={!pastedText.trim()}
                      className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${
                        pastedText.trim()
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Criar Tarefa com AI</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {activeTab === 'groupwork' && (
            <form onSubmit={handleCreateGroupWork} className="space-y-3.5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Divisão Inteligente de Trabalho de Grupo:</strong> A IA divide o projeto em 3 fases estruturadas (Pesquisa, Elaboração, Entrega Final) e associa as datas ideais de trabalho antes do prazo.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tema ou Título do Trabalho de Grupo:
                </label>
                <input
                  type="text"
                  required
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Ex: Trabalho de Grupo sobre Energias Renováveis"
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Disciplina:
                  </label>
                  <select
                    value={groupSubject}
                    onChange={(e) => setGroupSubject(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden font-semibold"
                  >
                    {Object.values(SUBJECTS).map((sub) => (
                      <option key={sub.code} value={sub.code}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Data Limite de Entrega:
                  </label>
                  <input
                    type="date"
                    value={groupDueDate}
                    onChange={(e) => setGroupDueDate(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Colegas do Grupo (separados por vírgula):
                </label>
                <input
                  type="text"
                  value={groupMembers}
                  onChange={(e) => setGroupMembers(e.target.value)}
                  placeholder="Francisco, Tiago, Martim..."
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={!groupTitle.trim()}
                  className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${
                    groupTitle.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Gerar Plano de Grupo com AI</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Integração com o Google Agenda:</strong> Sincroniza todos os testes, entregas de TPC, trabalhos de grupo e treinos de andebol diretamente no Google Calendar do telemóvel ou computador.
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-red-600" />
                  <span>Opção 1: Descarregar Calendário Completo (.ics)</span>
                </h4>
                <p className="text-xs text-slate-600">
                  Descarrega o ficheiro da agenda escolar do Francisco ({settings?.academicYear || '2026/2027'}) e importa diretamente no Google Calendar, iPhone ou Outlook.
                </p>
                <button
                  onClick={handleExportGoogleCalendar}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Descarregar Ficheiro para Google Agenda (.ics)</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <span>Opção 2: Abrir o Google Calendar Web</span>
                </h4>
                <p className="text-xs text-slate-600">
                  Acede diretamente ao teu Google Agenda para verificar os eventos sincronizados ou importar o ficheiro .ics na secção <em>Definições &gt; Importar e Exportar</em>.
                </p>
                <a
                  href="https://calendar.google.com/calendar/u/0/r/settings/export"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4 text-slate-600" />
                  <span>Abrir Importação no Google Calendar</span>
                </a>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-black text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tarefa criada com sucesso e adicionada ao calendário escolar!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
