import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  BookOpen,
  Users,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { SchoolTask, TaskType } from '../types';
import { SUBJECTS } from '../data/timetableData';
import {
  automateCalendarEvent,
  detectSubjectFromText,
  detectTypeFromText,
  extractGroupMembers,
  extractDateFromText,
  generateAutomatedSessions,
} from '../lib/calendarAutomation';

interface CalendarEventAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  academicYear?: string;
  onAddTask: (task: SchoolTask) => Promise<void> | void;
  onOpenFullForm?: (prefill: { title: string; date: string; subject: string; type: TaskType }) => void;
}

export const CalendarEventAutomationModal: React.FC<CalendarEventAutomationModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  academicYear = '2026/2027',
  onAddTask,
  onOpenFullForm,
}) => {
  const [eventInput, setEventInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [manualType, setManualType] = useState<TaskType | null>(null);
  const [manualSubject, setManualSubject] = useState<string | null>(null);
  const [manualGroupMembers, setManualGroupMembers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Update selectedDate if initialDate changes
  React.useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Real-time automated detection
  const analysis = useMemo(() => {
    if (!eventInput.trim()) {
      return null;
    }
    const detectedSub = detectSubjectFromText(eventInput);
    const detectedT = detectTypeFromText(eventInput);
    const members = extractGroupMembers(eventInput);
    const dateInText = extractDateFromText(eventInput, selectedDate);

    const activeType = manualType || detectedT.type;
    const activeSubject = manualSubject || detectedSub.code;
    const activeMembers = manualGroupMembers
      ? manualGroupMembers.split(',').map((s) => s.trim()).filter(Boolean)
      : members;

    const subName = SUBJECTS[activeSubject]?.name || activeSubject;
    const sessions = generateAutomatedSessions(activeType, subName, selectedDate, activeMembers);

    return {
      type: activeType,
      typeReason: detectedT.reason,
      subjectCode: activeSubject,
      subjectName: subName,
      date: selectedDate || dateInText,
      groupMembers: activeMembers,
      sessions,
      confidence: detectedT.confidence,
    };
  }, [eventInput, selectedDate, manualType, manualSubject, manualGroupMembers]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!eventInput.trim()) return;
    setIsSubmitting(true);

    try {
      const activeType = manualType || (analysis ? analysis.type : 'tpc');
      const activeSubject = manualSubject || (analysis ? analysis.subjectCode : 'MAT');
      const subName = SUBJECTS[activeSubject]?.name || activeSubject;
      const members = analysis?.groupMembers && analysis.groupMembers.length > 0 ? analysis.groupMembers : undefined;

      const automatedTask: SchoolTask = {
        id: `task-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: eventInput.trim().split('\n')[0].substring(0, 80),
        subjectCode: activeSubject,
        type: activeType,
        dueDate: selectedDate,
        description: eventInput.trim(),
        academicYear,
        groupMembers: activeType === 'trabalho' ? members : undefined,
        studyPlanDaysBefore: activeType === 'teste' ? 5 : activeType === 'trabalho' ? 7 : undefined,
        studySessions: generateAutomatedSessions(activeType, subName, selectedDate, members),
        createdAt: new Date().toISOString(),
      };

      await onAddTask(automatedTask);

      setSuccessNotice(`Criado com sucesso: [${activeType.toUpperCase()}] ${automatedTask.title}`);
      setTimeout(() => {
        setSuccessNotice(null);
        setEventInput('');
        setManualType(null);
        setManualSubject(null);
        setManualGroupMembers('');
        onClose();
      }, 900);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickTemplate = (text: string) => {
    setEventInput(text);
    setManualType(null);
    setManualSubject(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Novo Evento no Calendário
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                  Automação Ativa
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Escreve qualquer evento: a automação classifica em Teste, TPC ou Trabalho de Grupo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Event Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>O que tens marcado no calendário?</span>
              <span className="text-[11px] font-medium text-slate-500">Ex: "Teste de História cap 3"</span>
            </label>
            <textarea
              id="input-calendar-automation"
              rows={3}
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              placeholder="Exemplos:&#10;• Teste de Matemática sobre funções e matriz&#10;• Trabalho de Grupo de Ciências Naturais com o Pedro e a Sofia&#10;• TPC de Português pág 42 ex 1 a 4"
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-hidden resize-none font-medium text-slate-900 bg-slate-50/50"
              autoFocus
            />
          </div>

          {/* Quick suggestions chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500">Exemplos rápidos:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickTemplate('Teste de Matemática sobre Funções')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
              >
                📝 Teste de Mat
              </button>
              <button
                type="button"
                onClick={() => handleQuickTemplate('Trabalho de Grupo de Ciências com o Tomás e a Inês')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                👥 Trabalho de Grupo CN
              </button>
              <button
                type="button"
                onClick={() => handleQuickTemplate('TPC de Físico-Química exercícios pág 56')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                📖 TPC de FQ
              </button>
              <button
                type="button"
                onClick={() => handleQuickTemplate('Teste de História da Europa no século XX')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                📝 Teste de História
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>Data no Calendário</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-200 outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Disciplina (Auto-detetada ou manual)</span>
              </label>
              <select
                value={manualSubject || (analysis?.subjectCode ?? 'MAT')}
                onChange={(e) => setManualSubject(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-200 outline-hidden bg-white"
              >
                {Object.values(SUBJECTS).map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Automation Analysis Box */}
          {analysis && (
            <div className="p-3.5 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-amber-50/80 border border-amber-200 rounded-xl space-y-2.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Automação em Ação</span>
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                  {analysis.typeReason}
                </span>
              </div>

              {/* Type selector toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700">Tipo de Entrada:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManualType('teste')}
                    className={`text-xs font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                      analysis.type === 'teste'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📝 Teste
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('trabalho')}
                    className={`text-xs font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                      analysis.type === 'trabalho'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    👥 Trabalho de Grupo
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('tpc')}
                    className={`text-xs font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                      analysis.type === 'tpc'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📖 TPC
                  </button>
                </div>
              </div>

              {/* Group members input if trabalho */}
              {analysis.type === 'trabalho' && (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-700" />
                    <span>Membros da Equipa (separados por vírgula):</span>
                  </label>
                  <input
                    type="text"
                    value={manualGroupMembers || analysis.groupMembers.join(', ')}
                    onChange={(e) => setManualGroupMembers(e.target.value)}
                    placeholder="Ex: Pedro, Inês, Sofia"
                    className="w-full text-xs font-bold p-2 rounded-lg border border-blue-200 bg-white text-blue-950 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Generated Automation Sessions Details */}
              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200 text-xs text-slate-700 space-y-1">
                <p className="font-extrabold text-amber-950 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {analysis.type === 'teste' && (
                    <span>Plano Automático: 3 sessões de estudo planeadas antes da prova (sem coincidir com Andebol).</span>
                  )}
                  {analysis.type === 'trabalho' && (
                    <span>Plano Automático: 3 etapas de grupo (pesquisa, redação, apresentação/slides).</span>
                  )}
                  {analysis.type === 'tpc' && (
                    <span>Plano Automático: 1 sessão de resolução e verificação no caderno diário.</span>
                  )}
                </p>
                <div className="pl-4 space-y-0.5 text-[11px] text-slate-600">
                  {analysis.sessions.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="font-semibold text-slate-800">{s.date} ({s.timeRange}):</span>
                      <span className="truncate">{s.topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
          {onOpenFullForm && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullForm({
                  title: eventInput,
                  date: selectedDate,
                  subject: manualSubject || (analysis?.subjectCode ?? 'MAT'),
                  type: manualType || (analysis?.type ?? 'tpc'),
                });
              }}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
            >
              Formulário detalhado
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>

            <button
              id="btn-confirm-auto-task"
              type="button"
              disabled={!eventInput.trim() || isSubmitting}
              onClick={handleCreate}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs shadow-red-200 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Criar Entrada com Automação</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
