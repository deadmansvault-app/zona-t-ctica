import React, { useState } from 'react';
import {
  Calendar,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  UploadCloud,
  DownloadCloud,
  Check,
  ShieldCheck,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { SchoolTask, AppSettings, AppUser } from '../types';
import {
  DEFAULT_GOOGLE_CALENDAR_ID,
  syncGoogleCalendarToTasks,
  pushTaskToGoogleCalendar,
  SyncResult,
} from '../lib/googleCalendarSync';
import {
  getCachedGoogleAccessToken,
  signInWithGoogle,
} from '../lib/firebase';
import { GoogleSignInButton } from './GoogleSignInButton';
import { exportAllToIcs, getHandballGoogleCalendarUrl } from '../lib/googleCalendar';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => Promise<void> | void;
  tasks: SchoolTask[];
  onSyncTasks: (tasks: SchoolTask[]) => Promise<void> | void;
  currentUser: User | AppUser | null;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  tasks,
  onSyncTasks,
  currentUser,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncResult | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User confirmation modal state for mutating Google Calendar (Mandatory by Workspace Integration Skill)
  const [showPushConfirmation, setShowPushConfirmation] = useState(false);

  // Calendar ID state (defaults to the user's specific group calendar)
  const calendarId = settings.googleCalendarId || DEFAULT_GOOGLE_CALENDAR_ID;
  const hasAccessToken = Boolean(getCachedGoogleAccessToken());

  if (!isOpen) return null;

  const handleConnectGoogle = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle(true);
      if (user && getCachedGoogleAccessToken()) {
        // Automatically trigger sync right after connecting!
        await handlePullSync();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar com a conta Google.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePullSync = async () => {
    const token = getCachedGoogleAccessToken();
    if (!token) {
      setErrorMessage('Por favor, liga primeiro a tua conta Google.');
      return;
    }

    setIsPulling(true);
    setErrorMessage(null);
    setSyncStatus(null);
    try {
      const res = await syncGoogleCalendarToTasks(
        calendarId,
        token,
        tasks,
        settings.academicYear
      );

      if (res.success) {
        setSyncStatus(res);
        await onSyncTasks(res.mergedTasks);
        const nowStr = new Date().toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
        });
        await onUpdateSettings({
          ...settings,
          googleCalendarLastSync: `Hoje às ${nowStr}`,
        });
      } else {
        setErrorMessage(res.error || 'Não foi possível ler os eventos do Google Calendar.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado na sincronização.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleExecutePushToCalendar = async () => {
    setShowPushConfirmation(false);
    const token = getCachedGoogleAccessToken();
    if (!token) {
      setErrorMessage('Por favor, liga primeiro a tua conta Google.');
      return;
    }

    setIsPushing(true);
    setErrorMessage(null);
    setPushStatus(null);

    try {
      let pushed = 0;
      const updatedTasks = [...tasks];

      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];
        try {
          const result = await pushTaskToGoogleCalendar(
            calendarId,
            token,
            task,
            settings.schoolName
          );
          if (result.eventId) {
            updatedTasks[i] = {
              ...task,
              googleCalendarEventId: result.eventId,
              googleCalendarSyncedAt: new Date().toISOString(),
            };
            pushed++;
          }
        } catch (taskErr) {
          console.warn(`Erro ao enviar tarefa ${task.title}:`, taskErr);
        }
      }

      await onSyncTasks(updatedTasks);
      setPushStatus(`${pushed} tarefas sincronizadas com o teu Google Agenda!`);
      const nowStr = new Date().toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
      });
      await onUpdateSettings({
        ...settings,
        googleCalendarLastSync: `Hoje às ${nowStr}`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao exportar tarefas para o Google Calendar.');
    } finally {
      setIsPushing(false);
    }
  };

  const directGoogleCalendarUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`;

  return (
    <div
      id="modal-google-calendar-sync"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Sincronização com Google Agenda</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Oficial
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Sincroniza testes, TPCs e horários em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Calendar Identifier Card */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                ID do Calendário Google Vinculado:
              </span>
              <a
                href={directGoogleCalendarUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline"
              >
                <span>Abrir na Google</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <code className="text-[11px] font-mono font-bold bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 text-slate-800 break-all select-all">
              {calendarId}
            </code>
            {settings.googleCalendarLastSync && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Última sincronização: {settings.googleCalendarLastSync}</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Aviso de Sincronização:</p>
                <p className="text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Sync Result Success */}
          {syncStatus && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-black text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sincronização concluída com sucesso!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-bold">
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  <div className="text-base text-emerald-700">{syncStatus.createdCount}</div>
                  <div className="text-[10px] text-slate-500">Novas Tarefas</div>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  <div className="text-base text-blue-700">{syncStatus.updatedCount}</div>
                  <div className="text-[10px] text-slate-500">Atualizadas</div>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  <div className="text-base text-slate-700">{syncStatus.totalFetched}</div>
                  <div className="text-[10px] text-slate-500">Total no Google</div>
                </div>
              </div>
            </div>
          )}

          {pushStatus && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600" />
              <span>{pushStatus}</span>
            </div>
          )}

          {/* Authentication & Connection Section */}
          {!hasAccessToken ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-slate-800">
                  Autenticação Google Necessária para Sincronizar
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Para ligar diretamente ao Google Calendar e importar/enviar os teus testes e TPCs, inicia sessão com a tua conta Google.
              </p>
              <GoogleSignInButton
                onClick={handleConnectGoogle}
                loading={isSigningIn}
                label="Ligar com Google para Sincronizar"
                className="w-full"
              />
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-emerald-950">
                    Conta Google Conectada ({currentUser?.email || 'Autorizado'})
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Pronto para sincronizar
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Pull from Google */}
                <button
                  type="button"
                  onClick={handlePullSync}
                  disabled={isPulling || isPushing}
                  className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-1.5">
                    <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                    <span>{isPulling ? 'A importar...' : 'Importar do Google'}</span>
                  </div>
                  <span className="text-[10px] font-normal text-blue-100">
                    Atualiza testes e TPCs do Google
                  </span>
                </button>

                {/* Push to Google with confirmation */}
                <button
                  type="button"
                  onClick={() => setShowPushConfirmation(true)}
                  disabled={isPulling || isPushing || tasks.length === 0}
                  className="p-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-extrabold text-xs flex flex-col items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-1.5">
                    <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                    <span>{isPushing ? 'A enviar...' : 'Enviar para o Google'}</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500">
                    Guarda {tasks.length} tarefas na Google Agenda
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Fallback & Utility Tools */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">
              Opções Alternativas
            </h4>

            {/* Direct Export to ICS */}
            <button
              onClick={() => exportAllToIcs(tasks, settings.schoolName)}
              className="w-full p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 flex items-center justify-center font-black text-xs transition-colors">
                  ICS
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Exportar Ficheiro .ics Universal
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Para importar em qualquer calendário manual ou telemóvel
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </button>

            {/* Handball Training to Google */}
            <a
              href={getHandballGoogleCalendarUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-100/60 transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-xs">
                  SLB
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Adicionar Treino de Andebol
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Seg, Qua e Sex das 20h00 às 22h00
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-amber-700" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Foco Escolar 9º B &bull; Google Calendar API
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* MANDATORY User Confirmation Modal for Mutating Google Calendar Operations */}
      {showPushConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Confirmar Envio para Google Agenda
                </h4>
                <p className="text-xs text-slate-500">
                  Operação no Google Calendar
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 leading-relaxed">
              <p>
                Esta ação irá criar ou atualizar <strong>{tasks.length} tarefa(s)</strong> no seguinte calendário Google:
              </p>
              <p className="font-mono font-bold text-[11px] text-blue-900 break-all bg-white p-2 rounded-lg border border-slate-200">
                {calendarId}
              </p>
              <p className="text-slate-500 text-[11px]">
                Os eventos incluirão os detalhes da disciplina, data de entrega e o plano de sessões de estudo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPushConfirmation(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutePushToCalendar}
                className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar e Sincronizar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
