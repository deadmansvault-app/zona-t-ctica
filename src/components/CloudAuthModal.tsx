import React, { useState } from 'react';
import {
  Cloud,
  Shield,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  X,
  Lock,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { FirebaseAuthErrorInfo } from '../lib/firebase';

interface CloudAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorInfo: FirebaseAuthErrorInfo | null;
  onRetryLogin: () => Promise<void>;
  onConnectFamilySync: () => Promise<void>;
  isLoggingIn: boolean;
}

export const CloudAuthModal: React.FC<CloudAuthModalProps> = ({
  isOpen,
  onClose,
  errorInfo,
  onRetryLogin,
  onConnectFamilySync,
  isLoggingIn,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const hostname =
    errorInfo?.hostname ||
    (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const projectId = errorInfo?.projectId || 'mega-land-h7c1c';
  const settingsUrl =
    errorInfo?.settingsUrl ||
    `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const handleCopyHostname = async () => {
    try {
      await navigator.clipboard.writeText(hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const isUnauthorized =
    errorInfo?.isUnauthorizedDomain ||
    errorInfo?.code === 'auth/unauthorized-domain' ||
    errorInfo?.message?.toLowerCase().includes('unauthorized-domain');

  const isPopupBlocked =
    errorInfo?.isPopupBlocked ||
    errorInfo?.code === 'auth/popup-blocked' ||
    errorInfo?.message?.toLowerCase().includes('popup-blocked');

  return (
    <div
      id="modal-cloud-auth"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Benfica Red Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-700 via-red-600 to-red-800" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              {isUnauthorized ? (
                <Globe className="w-5 h-5 text-red-600" />
              ) : isPopupBlocked ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <Cloud className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                  Sincronização Nuvem
                </span>
                <span className="text-[11px] text-slate-500 font-bold">Firebase Google Auth</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
                {isUnauthorized
                  ? 'Autorizar Domínio de Produção no Firebase'
                  : isPopupBlocked
                  ? 'Janela de Sessão Bloqueada'
                  : 'Configuração da Ligação à Nuvem'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
          {isUnauthorized ? (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Porque é que o botão não respondeu?</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-normal">
                  Por motivos de segurança da Google, o Firebase bloqueia o início de sessão em novos
                  domínios de produção (como o <strong>GitHub Pages</strong> ou domínios partilhados)
                  até que o domínio seja adicionado à lista de autorizações do projeto.
                </p>
              </div>

              {/* Hostname Box to Copy */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                  1. O teu domínio de produção atual:
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-slate-900 text-white rounded-xl font-mono text-xs border border-slate-800">
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="flex-1 truncate font-bold text-amber-300">{hostname}</span>
                  <button
                    type="button"
                    onClick={handleCopyHostname}
                    className="flex items-center gap-1 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg transition-colors border border-white/10 shrink-0"
                    title="Copiar domínio para a área de transferência"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-black">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <p className="font-black text-slate-900 text-xs">
                  2. Como ativar em 30 segundos na Consola do Firebase:
                </p>
                <ol className="space-y-2 text-[11px] text-slate-700 list-decimal list-inside leading-snug">
                  <li>
                    Clica no botão vermelho abaixo para abrir as{' '}
                    <strong>Definições de Autenticação do Firebase</strong>.
                  </li>
                  <li>
                    No separador <strong>Definições (Settings)</strong>, desce até ao bloco{' '}
                    <strong>Domínios autorizados (Authorized domains)</strong>.
                  </li>
                  <li>
                    Clica em <strong>Adicionar domínio</strong>, cola{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold text-slate-900 font-mono text-[10px]">
                      {hostname}
                    </code>{' '}
                    e clica em <strong>Adicionar</strong>.
                  </li>
                  <li>
                    Regressa a esta página e clica em <strong>«Tentar Ligar Novamente»</strong>.
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Immediate 1-Click Alternative that bypasses domain restrictions */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                      Solução Imediata
                    </span>
                    <span className="font-extrabold text-emerald-950 text-xs">
                      Ligar Sincronização da Família Agora
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-normal">
                    Não precisas de aceder à consola do Firebase. Ativa a ligação direta da família na nuvem
                    (Firestore) sem restrições de domínio, sincronizando tarefas e fotos de imediato.
                  </p>
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={async () => {
                      await onConnectFamilySync();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm py-2.5 rounded-xl shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>{isLoggingIn ? 'A ativar ligação...' : 'Ativar Sincronização Direta da Família'}</span>
                  </button>
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  — Ou adicionar o domínio manualmente —
                </div>

                <a
                  href={settingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-xl border border-slate-200 transition-all text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Consola do Firebase (Authentication)</span>
                </a>

                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={async () => {
                    await onRetryLogin();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoggingIn ? 'animate-spin' : ''}`} />
                  <span>{isLoggingIn ? 'A ligar à Google...' : 'Já adicionei, Tentar Login Google'}</span>
                </button>
              </div>
            </>
          ) : isPopupBlocked ? (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-1">
                <p className="font-bold text-xs">A janela pop-up foi bloqueada pelo navegador.</p>
                <p className="text-[11px] text-amber-900">
                  Em telemóveis (Safari ou Chrome), as janelas de login da Google são por vezes
                  bloqueadas. Clica no botão abaixo diretamente para abrir a janela.
                </p>
              </div>

              <button
                type="button"
                disabled={isLoggingIn}
                onClick={async () => {
                  await onRetryLogin();
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs sm:text-sm py-3 rounded-xl shadow-md shadow-red-200 transition-all disabled:opacity-50"
              >
                <Cloud className="w-4 h-4" />
                <span>{isLoggingIn ? 'A abrir...' : 'Abrir Início de Sessão Google'}</span>
              </button>
            </>
          ) : (
            <>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="font-bold text-slate-800">
                  {errorInfo?.message ||
                    'O início de sessão com a conta Google permite sincronizar tarefas e fotos entre telemóveis da família em tempo real.'}
                </p>
                {errorInfo?.code && (
                  <p className="text-[10px] font-mono text-slate-500 bg-white p-2 rounded border border-slate-200">
                    Código do erro: {errorInfo.code}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={isLoggingIn}
                onClick={async () => {
                  await onRetryLogin();
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs sm:text-sm py-3 rounded-xl shadow-md shadow-red-200 transition-all disabled:opacity-50"
              >
                <Cloud className="w-4 h-4" />
                <span>{isLoggingIn ? 'A ligar...' : 'Iniciar Sessão com Google'}</span>
              </button>
            </>
          )}

          {/* Offline & Local data assurance note */}
          <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              <strong>Os teus dados estão 100% seguros:</strong> Todos os testes, horários e
              fotografias já funcionam e ficam gravados localmente no telemóvel mesmo sem a nuvem ligada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
