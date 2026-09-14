import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, Shield, Calendar, Copy, ArrowRight } from 'lucide-react';
import { SchoolTask } from '../types';
import { SUBJECTS } from '../data/timetableData';

interface TeamsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTask: (task: SchoolTask) => void;
}

export const TeamsSyncModal: React.FC<TeamsSyncModalProps> = ({
  isOpen,
  onClose,
  onImportTask,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  // Smart parser for quick pasted homework from Teams or Inovar
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

    // Default due in 2 days
    const due = new Date();
    due.setDate(due.getDate() + 2);

    const importedTask: SchoolTask = {
      id: `task-teams-${Date.now()}`,
      title: pastedText.slice(0, 50).trim() || 'Tarefa importada do Teams',
      subjectCode: detectedSubject,
      type: upper.includes('TESTE') || upper.includes('AVALIAÇÃO') ? 'teste' : 'tpc',
      description: pastedText.trim(),
      dueDate: due.toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    onImportTask(importedTask);
    setPastedText('');
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                Sincronização com Microsoft Teams & Escola
              </h3>
              <p className="text-xs text-red-100">
                Opções técnicas e alternativas práticas para o 9º B
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

        <div className="p-5 overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm">
          {/* Explanation 1: Why automatic sync with public schools has technical constraints */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-600" />
              <span>1. Como funciona a API do Microsoft Teams nas Escolas Públicas?</span>
            </h4>
            <p className="text-xs leading-relaxed text-slate-600">
              Para uma aplicação web sincronizar automaticamente com a conta Microsoft Teams da Escola Básica António Gedeão (Office 365 Educação), a Microsoft exige que o <strong>administrador de TI do Ministério da Educação / Agrupamento</strong> conceda consentimento administrativo (<i>Tenant Admin Consent</i> para a permissão <code>EduAssignments.Read</code>).
            </p>
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
              <strong>Limitação Real:</strong> Por questões de privacidade do RGPD e proteção de menores, os agrupamentos escolares portugueses não abrem a API a aplicações externas familiares.
            </div>
          </div>

          {/* Explanation 2: Best Available Alternatives */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              <span>2. As Melhores Alternativas Práticas</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-200">
                <p className="font-bold text-red-900">Opção A: Copiar & Colar Rápido (Recomendada)</p>
                <p className="text-slate-600 mt-1 leading-snug text-[11px]">
                  Basta selecionar o texto do aviso ou trabalho no Teams/Inovar e colar no campo abaixo. A app cria logo o cartão!
                </p>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <p className="font-bold text-blue-900">Opção B: Feed de Calendário Outlook (iCal)</p>
                <p className="text-slate-600 mt-1 leading-snug text-[11px]">
                  O aluno pode subscrever o calendário escolar no telemóvel e consultar tudo num só ecrã.
                </p>
              </div>
            </div>
          </div>

          {/* Practical Tool: Quick Paste Import */}
          <form onSubmit={handleParseAndImport} className="bg-slate-100/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-red-600" />
                <span>Importação Rápida: Cola aqui o texto de um TPC ou Teste do Teams:</span>
              </label>
              <textarea
                rows={3}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Exemplo: 'Para quarta-feira, fazer exercícios 4 e 5 da pág 30 de Ciências Naturais' ou 'Teste de História dia 22 de outubro'..."
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Deteta automaticamente a disciplina e o tipo de tarefa.
              </span>
              <button
                type="submit"
                disabled={!pastedText.trim()}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                  pastedText.trim()
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Criar Tarefa a partir do Texto</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {successMsg && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-100 p-2 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Tarefa importada com sucesso para a agenda!</span>
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
