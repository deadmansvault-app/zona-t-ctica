import React, { useState } from 'react';
import {
  Calendar,
  Shield,
  Clock,
  BookOpen,
  Sparkles,
  CalendarDays,
  Cloud,
  LogIn,
  LogOut,
  Bell,
  BellRing,
  CheckCircle2,
  MessageCircle,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { CheckInAlert, AppSettings, AppUser } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { requestBrowserNotificationPermission } from '../lib/sound';

interface NavbarProps {
  activeTab: 'dashboard' | 'calendario' | 'horario' | 'tarefas' | 'pais';
  setActiveTab: (tab: 'dashboard' | 'calendario' | 'horario' | 'tarefas' | 'pais') => void;
  pendingCount: number;
  user: User | AppUser | null;
  settings?: AppSettings;
  alerts?: CheckInAlert[];
  isLoggingIn?: boolean;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  onOpenAiModal: () => void;
  onOpenTeamsModal?: () => void;
  onOpenAddTask: () => void;
  onViewPhoto?: (photoUrl: string, title: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  user,
  settings,
  alerts = [],
  isLoggingIn = false,
  onLoginGoogle,
  onLogoutGoogle,
  onOpenAiModal,
  onOpenTeamsModal,
  onOpenAddTask,
  onViewPhoto,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission === 'granted'
      : false
  );

  const handleEnableNotifications = async () => {
    const granted = await requestBrowserNotificationPermission();
    setNotificationPermissionGranted(granted);
  };

  // Format current date in European Portuguese
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-red-100 shadow-xs">
      {/* Benfica Red Accent Top Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-700 via-red-600 to-red-800" />

      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Logo & Student Badge */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center shadow-md shadow-red-200 border border-red-500 relative flex-shrink-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tighter">SLB</span>
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-amber-400 text-slate-950 font-bold px-1 rounded-full border border-white">
                {settings?.studentClass || '9ºB'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  Foco Escolar <span className="text-red-600 font-black">{settings?.studentClass || '9º B'}</span>
                </h1>
                <span className="hidden md:inline-flex text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                  {settings?.schoolName ? settings.schoolName.replace('Escola Básica ', 'EB ') : 'EB António Gedeão'}
                </span>
                {settings?.academicYear && (
                  <span className="hidden lg:inline-flex text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                    {settings.academicYear}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 capitalize flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {dateFormatted}
              </p>
            </div>
          </div>

          {/* Action Buttons & Firebase Cloud Sync Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Firebase Cloud Sync Button / Badge */}
            {user ? (
              <div className="relative">
                <button
                  id="btn-cloud-user"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                  title={`Conectado ao Firebase como ${user.displayName || user.email}`}
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline truncate max-w-[110px]">
                    {user.displayName?.split(' ')[0] || (user.isAnonymous ? 'Família' : 'Nuvem Ativa')}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user.displayName || (user.isAnonymous ? 'Dispositivo da Família' : 'Utilizador')}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email || 'Ligação direta à Nuvem'}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Firebase Firestore Sincronizado</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setActiveTab('pais');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors border-b border-slate-100"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      <span>Área dos Pais & Configurações</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogoutGoogle();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Terminar Sessão</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Notification Bell / Central de Alertas */}
            <div className="relative">
              <button
                id="btn-alerts-bell"
                onClick={() => setShowAlertsMenu(!showAlertsMenu)}
                className={`relative p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                  alerts.length > 0
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Central de Notificações e Check-ins Partilhados"
              >
                {alerts.length > 0 ? (
                  <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-500" />
                )}

                <span className="hidden md:inline">Alertas</span>

                {alerts.length > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    {alerts.length}
                  </span>
                )}
              </button>

              {showAlertsMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in max-h-[85vh] flex flex-col">
                  <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-red-600" />
                        Alertas de Check-in da Família
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Confirmações automáticas recebidas por todos
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {alerts.length} registo{alerts.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Browser notification permission request banner */}
                  {!notificationPermissionGranted && (
                    <div className="mx-3 my-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Receber avisos no ecrã do telemóvel/computador?</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0 transition"
                      >
                        Ativar
                      </button>
                    </div>
                  )}

                  {/* Alerts List */}
                  <div className="overflow-y-auto max-h-72 divide-y divide-slate-100 px-2">
                    {alerts.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs px-4">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                        <p className="font-semibold text-slate-600">Ainda não há check-ins recentes</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Quando o Francisco submeter a foto de um TPC ou trabalho, todos recebem o alerta aqui.
                        </p>
                      </div>
                    ) : (
                      alerts.map((al) => {
                        const sub = SUBJECTS[al.subjectCode] || { name: al.subjectCode };
                        const timeStr = new Date(al.timestamp).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const dateStr = new Date(al.timestamp).toLocaleDateString('pt-PT', {
                          day: 'numeric',
                          month: 'short',
                        });

                        const waText = encodeURIComponent(
                          `✅ *Check-in Concluído (Foco 9º B)*\n` +
                            `📚 *${sub.name}*: "${al.taskTitle}"\n` +
                            `👤 Aluno: ${al.authorName || 'Francisco'}\n` +
                            `🕒 Hora: ${timeStr} (${dateStr})\n` +
                            `📸 Foto confirmada!`
                        );
                        const waUrl = `https://api.whatsapp.com/send?text=${waText}`;

                        return (
                          <div
                            key={al.id}
                            className="p-2.5 hover:bg-slate-50 rounded-xl transition flex items-start gap-2.5"
                          >
                            {/* Photo or icon */}
                            {al.photoDataUrl ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAlertsMenu(false);
                                  if (onViewPhoto) onViewPhoto(al.photoDataUrl!, al.taskTitle);
                                }}
                                className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:opacity-80 transition group relative"
                                title="Ver foto"
                              >
                                <img
                                  src={al.photoDataUrl}
                                  alt="Miniatura"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <ImageIcon className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-red-50 text-red-700 border border-red-200">
                                  {sub.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {dateStr} às {timeStr}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                                {al.taskTitle}
                              </p>

                              <p className="text-[11px] text-slate-500 truncate">
                                Check-in concluído por {al.authorName || 'Francisco'}
                              </p>

                              <div className="flex items-center gap-2 mt-1.5">
                                {al.photoDataUrl && onViewPhoto && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowAlertsMenu(false);
                                      onViewPhoto(al.photoDataUrl!, al.taskTitle);
                                    }}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    <ImageIcon className="w-3 h-3" />
                                    Ver Foto
                                  </button>
                                )}

                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                                  title="Partilhar no WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  WhatsApp
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="px-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Notificações em tempo real ativas</span>
                    <button
                      type="button"
                      onClick={() => setShowAlertsMenu(false)}
                      className="text-slate-600 hover:text-slate-900 font-bold"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              id="btn-ai-assistant"
              onClick={onOpenAiModal}
              className="flex items-center gap-1 sm:gap-1.5 text-xs font-black text-amber-950 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 hover:from-amber-300 hover:to-amber-200 px-2.5 sm:px-3 py-2 rounded-xl transition-all border border-amber-300 shadow-2xs active:scale-95"
              title="Assistente AI: Criar TPC, Teste ou Trabalho de Grupo por texto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              <span className="tracking-wide">AI</span>
            </button>

            <button
              id="btn-add-task-nav"
              onClick={onOpenAddTask}
              className="flex items-center gap-1 sm:gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xs transition-all shadow-red-200"
            >
              <span className="text-base leading-none font-black">+</span>
              <span className="hidden sm:inline">Novo Teste / TPC</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (ADHD friendly: big targets, clean icons) */}
        <nav className="flex items-center gap-1 sm:gap-2 border-t border-slate-100 py-2 overflow-x-auto no-scrollbar">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Hoje & Amanhã</span>
            {pendingCount > 0 && (
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'dashboard' ? 'bg-white text-red-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>

          {/* New Monthly Calendar Tab */}
          <button
            id="tab-calendario"
            onClick={() => setActiveTab('calendario')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'calendario'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Calendário Mensal</span>
          </button>

          <button
            id="tab-horario"
            onClick={() => setActiveTab('horario')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'horario'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Horário Escolar</span>
          </button>

          <button
            id="tab-tarefas"
            onClick={() => setActiveTab('tarefas')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'tarefas'
                ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Testes & Trabalhos</span>
          </button>

          <button
            id="tab-pais"
            onClick={() => setActiveTab('pais')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'pais'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Área dos Pais & Fotos</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
