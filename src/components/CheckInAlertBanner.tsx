import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  X,
  Share2,
  Image as ImageIcon,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { CheckInAlert } from '../types';
import { SUBJECTS } from '../data/timetableData';

interface CheckInAlertBannerProps {
  alert: CheckInAlert | null;
  onDismiss: () => void;
  onViewPhoto?: (photoUrl: string, title: string) => void;
}

export const CheckInAlertBanner: React.FC<CheckInAlertBannerProps> = ({
  alert,
  onDismiss,
  onViewPhoto,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!alert) return;

    setProgress(100);
    const duration = 10000; // 10 seconds auto-dismiss
    const interval = 100;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const subject = SUBJECTS[alert.subjectCode] || {
    name: alert.subjectCode,
    color: '#dc2626',
  };

  const typeLabels: Record<string, string> = {
    tpc: 'TPC',
    teste: 'Teste / Avaliação',
    trabalho: 'Trabalho de Grupo / Individual',
    mochila: 'Mochila',
    outro: 'Tarefa',
  };

  const typeName = typeLabels[alert.taskType] || 'Trabalho';

  // Format time (e.g., 17:35)
  const timeFormatted = new Date(alert.timestamp).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Pre-formatted WhatsApp message
  const author = alert.authorName || 'O Francisco';
  const waText = encodeURIComponent(
    `✅ *Confirmação de Check-in (Foco 9º B)*\n` +
      `📌 *${typeName} de ${subject.name}*: "${alert.taskTitle}"\n` +
      `👤 Concluído por: *${author}*\n` +
      `🕒 Horário: ${timeFormatted}\n` +
      `📸 Foto do caderno/trabalho validada na aplicação escolar!`
  );
  const waUrl = `https://api.whatsapp.com/send?text=${waText}`;

  return (
    <div
      id="checkin-alert-toast"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-top duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-red-500/40 overflow-hidden ring-4 ring-red-500/15">
        {/* Top bar with alert badge */}
        <div className="bg-gradient-to-r from-red-600 via-red-600 to-rose-700 px-4 py-2 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
            <span className="tracking-wide uppercase text-[11px] font-bold text-white flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-300" />
              Notificação Geral da Família
            </span>
          </div>

          <span className="text-red-100 text-[11px] font-medium">{timeFormatted}</span>
        </div>

        {/* Content area */}
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Thumbnail or Icon */}
            {alert.photoDataUrl ? (
              <button
                type="button"
                onClick={() => onViewPhoto && onViewPhoto(alert.photoDataUrl!, alert.taskTitle)}
                className="relative group shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-white/20 shadow-md hover:border-red-400 transition"
                title="Clica para ampliar a fotografia enviada"
              >
                <img
                  src={alert.photoDataUrl}
                  alt="Foto do trabalho"
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <ImageIcon className="w-4 h-4 text-white" />
                </div>
              </button>
            ) : (
              <div className="shrink-0 w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                  {subject.name}
                </span>
                <span className="text-xs text-slate-400">
                  {typeName} concluído
                </span>
              </div>

              <h4 className="font-bold text-sm sm:text-base text-white mt-1 leading-snug">
                Check-in: {alert.taskTitle} concluído!
              </h4>

              <p className="text-xs text-slate-300 mt-0.5">
                {author} enviou a fotografia do caderno e confirmou a tarefa.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
            {alert.photoDataUrl && onViewPhoto && (
              <button
                type="button"
                onClick={() => onViewPhoto(alert.photoDataUrl!, alert.taskTitle)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 hover:border-slate-600"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Ver Foto</span>
              </button>
            )}

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Partilhar no grupo WhatsApp da família"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Fechar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-red-500 h-1 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
