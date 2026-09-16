import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  Copy,
  ArrowRight,
  Bot,
  Users,
  BookOpen,
  FileCheck,
  CalendarCheck,
  ExternalLink,
  Download
} from 'lucide-react';
import { SchoolTask, TaskType } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { formatLocalDate } from '../lib/storage';
import { generateIcsCalendar, downloadIcsFile } from '../lib/googleCalendar';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTask: (task: SchoolTask) => void;
  tasks?: SchoolTask[];
  settings?: any;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onImportTask,
  tasks = [],
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'parser' | 'groupwork' | 'google'>('parser');
  const [pastedText, setPastedText] = useState('');
  const [selectedType, setSelectedType] = useState<TaskType>('tpc');
  const [successMsg, setSuccessMsg] = useState(false);

  // Group work state
  const [groupTitle, setGroupTitle] = useState('');
  const [groupSubject, setGroupSubject] = useState('CN');
  const [groupMembers, setGroupMembers] = useState('Francisco, Martim, Tiago');
  const [groupDueDate, setGroupDueDate] = useState('');
  const [groupStepCount, setGroupStepCount] = useState(3);

  if (!isOpen) return null;

  // Smart parser for quick pasted homework from Teams, Classroom, WhatsApp or Inovar
  const handleParseAndImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    // Detect subject code if mentioned
    let detectedSubject = 'MAT';
    const upper = pastedText.toUpperCase();
    for (const code of Object.keys(SUBJECTS)) {
      if (upper.includes(code) || upper.includes(SUBJECTS[code].name.toUpperCase())) {
        detectedSubject = code;
        break;
      }
    }

    // Detect task type
    let detectedType: TaskType = selectedType;
    if (upper.includes('GRUPO') || upper.includes('TRABALHO DE GRUPO') || upper.includes('PROJETO')) {
      detectedType = 'trabalho';
    } else if (upper.includes('TESTE') || upper.includes('AVALIAÇÃO') || upper.includes('SUMATIVA') || upper.includes('EXAME')) {
      detectedType = 'teste';
    } else if (upper.includes('TPC') || upper.includes('DEVER') || upper.includes('EXERCÍCIOS')) {
      detectedType = 'tpc';
    }

    // Default due in 2 days if not found
    const due = new Date();
    due.setDate(due.getDate() + (detectedType === 'teste' ? 7 : detectedType === 'trabalho' ? 10 : 2));

    // Generate study sessions or milestones if test or group work
    let studySessions = undefined;
    if (detectedType === 'teste') {
      const s1 = new Date();
      s1.setDate(s1.getDate() + 2);
      const s2 = new Date();
      s2.setDate(s2.getDate() + 4);
      studySessions = [
        {
          id: `s-ai-${Date.now()}-1`,
          date: formatLocalDate(s1),
          timeRange: '17:30 - 18:30',
          topic: `Revisão inicial da matéria de ${SUBJECTS[detectedSubject]?.name || detectedSubject}`,
          completed: false,
        },
        {
          id: `s-ai-${Date.now()}-2`,
          date: formatLocalDate(s2),
          timeRange: '18:00 - 19:15',
          topic: 'Exercícios práticos e simulador de teste',
          completed: false,
        },
      ];
    } else if (detectedType === 'trabalho') {
      const s1 = new Date();
      s1.setDate(s1.getDate() + 3);
      const s2 = new Date();
      s2.setDate(s2.getDate() + 7);
      studySessions = [
        {
          id: `s-ai-${Date.now()}-1`,
          date: formatLocalDate(s1),
          timeRange: '17:00 - 18:00',
          topic: 'Fase 1: Pesquisa inicial e divisão de tarefas do grupo',
          completed: false,
        },
        {
          id: `s-ai-${Date.now()}-2`,
          date: formatLocalDate(s2),
          timeRange: '17:30 - 19:00',
          topic: 'Fase 2: Redação final e montagem dos slides',
          completed: false,
        },
      ];
    }

    const importedTask: SchoolTask = {
      id: `task-ai-${Date.now()}`,
      title: pastedText.slice(0, 50).trim() || `Tarefa de ${SUBJECTS[detectedSubject]?.name || detectedSubject}`,
      subjectCode: detectedSubject,
      type: detectedType,
      description: pastedText.trim(),
      dueDate: formatLocalDate(due),
      academicYear: settings?.academicYear || '2026/2027',
      studyPlanDaysBefore: detectedType === 'teste' ? 5 : detectedType === 'trabalho' ? 7 : undefined,
      studySessions,
      createdAt: new Date().toISOString(),
    };

    onImportTask(importedTask);
    setPastedText('');
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1200);
  };

  // Group work generator
  const handleCreateGroupWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim()) return;

    const due = groupDueDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return formatLocalDate(d);
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
        date: formatLocalDate(stepDate),
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
          {activeTab === 'parser' && (
            <form onSubmit={handleParseAndImport} className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Deteção Inteligente:</strong> Cola o texto do aviso do professor (vindo do Microsoft Teams, Classroom, Inovar ou WhatsApp). A IA reconhece a disciplina, o tipo (TPC, Teste ou Trabalho) e cria as sessões de estudo!
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-red-600" />
                  <span>Texto do TPC, Teste ou Trabalho:</span>
                </label>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Exemplo: 'Para 4ª feira, TPC de Português: ler páginas 40 a 45 e responder às perguntas 1 a 4' ou 'Teste sumativo de História no dia 28 de outubro sobre o Século XX' ou 'Trabalho de Grupo de Ciências Naturais com Francisco e Tiago sobre placas tectónicas'..."
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

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
                  Ano Letivo: <strong>{settings?.academicYear || '2026/2027'}</strong>
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
