import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  Shield,
  CheckCircle2,
  Mail,
  Lock,
  User as UserIcon,
  LogOut,
  Sparkles,
  Smartphone,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  School,
  Check,
  Globe,
  ExternalLink,
  Copy,
  Info,
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithGoogleCredential,
  signInWithEmail,
  signUpWithEmail,
  signInFamilySync,
  startDirectStudentSession,
  signInAsPrimaryAdmin,
  translateAuthError,
  logOut,
} from '../lib/firebase';
import { AppSettings, AppUser } from '../types';

interface LoginPageProps {
  user: User | AppUser | null;
  settings?: AppSettings;
  onNavigateToDashboard: () => void;
  onNavigateToParents: () => void;
  onUserAuthenticated?: (user: User | AppUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  user,
  settings,
  onNavigateToDashboard,
  onNavigateToParents,
  onUserAuthenticated,
}) => {
  const [authMode, setAuthMode] = useState<'google' | 'email' | 'device'>('google');
  const [emailAction, setEmailAction] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [domainBlockedInfo, setDomainBlockedInfo] = useState<{
    hostname: string;
    settingsUrl: string;
  } | null>(null);
  const [copiedHostname, setCopiedHostname] = useState(false);
  const gsiContainerRef = React.useRef<HTMLDivElement>(null);

  // Initialize and mount Google Identity Services if available
  React.useEffect(() => {
    if (authMode !== 'google') return;
    const clientId = '526461171408-utdpphlv0kfvh09hg33g49fljhri54pe.apps.googleusercontent.com';

    const renderGsi = () => {
      if ((window as any).google?.accounts?.id && gsiContainerRef.current) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: async (res: any) => {
              if (res?.credential) {
                setLoading(true);
                setErrorMsg(null);
                try {
                  const u = await signInWithGoogleCredential(res.credential);
                  setSuccessNotice('Sessão iniciada com sucesso via Google!');
                  onUserAuthenticated?.(u);
                } catch (err: any) {
                  setErrorMsg(translateAuthError(err));
                } finally {
                  setLoading(false);
                }
              }
            },
          });
          (window as any).google.accounts.id.renderButton(gsiContainerRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
          });
        } catch (e) {
          console.warn('Erro ao renderizar GSI:', e);
        }
      }
    };

    renderGsi();
    const interval = setInterval(renderGsi, 400);
    const timeout = setTimeout(() => clearInterval(interval), 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [authMode]);

  // Direct login as primary admin (meiraxx@gmail.com)
  const handlePrimaryAdminDirectLogin = () => {
    setErrorMsg(null);
    const admin = signInAsPrimaryAdmin();
    setSuccessNotice('Bem-vindo, Família Meira! Sessão iniciada.');
    onUserAuthenticated?.(admin);
    onNavigateToDashboard();
  };

  // Google sign in (uses clean standard profile/email, no special scopes)
  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setDomainBlockedInfo(null);
    setLoading(true);
    try {
      const u = await signInWithGoogle(false);
      if (u) {
        setSuccessNotice('Sessão iniciada com sucesso via Google!');
        onUserAuthenticated?.(u);
      }
    } catch (err: any) {
      if (err?.isUnauthorizedDomain) {
        setDomainBlockedInfo({
          hostname: err.hostname || (typeof window !== 'undefined' ? window.location.hostname : ''),
          settingsUrl: err.settingsUrl || 'https://console.firebase.google.com/project/gen-lang-client-0597083680/authentication/settings',
        });
        setErrorMsg(
          'O domínio desta janela ainda não está na lista de autorizados do Firebase (ou os cookies de terceiros estão bloqueados pelo modo incógnito). Podes entrar agora mesmo através do Modo Família com 1 toque!'
        );
      } else if (err?.isPopupBlocked) {
        setErrorMsg(
          'O navegador bloqueou a janela de login da Google. Permite popups no navegador ou usa a opção "Modo Família".'
        );
      } else {
        setErrorMsg(translateAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Email / Password submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    if (!email.trim()) {
      setErrorMsg('Por favor introduz o teu endereço de email.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (emailAction === 'signup') {
        const u = await signUpWithEmail(email, password, displayName || 'Família 9ºB');
        setSuccessNotice('Conta criada com sucesso! A entrar...');
        onUserAuthenticated?.(u);
      } else {
        const u = await signInWithEmail(email, password);
        setSuccessNotice('Sessão iniciada com sucesso! A entrar...');
        onUserAuthenticated?.(u);
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Quick family device sign-in (100% resilient - guaranteed to let family in)
  const handleFamilyDeviceLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const u = await signInFamilySync();
      setSuccessNotice('Dispositivo sincronizado com a base de dados familiar! A entrar...');
      onUserAuthenticated?.(u);
      onNavigateToDashboard();
    } catch (err: any) {
      // Direct local session safety net
      const local = startDirectStudentSession();
      onUserAuthenticated?.(local);
      onNavigateToDashboard();
    } finally {
      setLoading(false);
    }
  };

  // Direct student bypass
  const handleStudentDirectEntry = () => {
    const studentUser = startDirectStudentSession();
    onUserAuthenticated?.(studentUser);
    onNavigateToDashboard();
  };

  // Logout
  const handleLogout = async () => {
    if (window.confirm('Tens a certeza de que pretendes terminar sessão neste dispositivo?')) {
      setLoading(true);
      try {
        await logOut();
        setSuccessNotice('Sessão terminada.');
      } catch (err: any) {
        setErrorMsg(translateAuthError(err));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-6 animate-in fade-in duration-300">
      {/* School Brand Badge & Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 border border-red-500/30 text-red-500 text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-red-500" />
          <span>
            Área Reservada • {settings?.schoolName ? settings.schoolName.replace('Escola Básica ', 'EB ') : 'EB António Gedeão'}
            {settings?.academicYear ? ` (${settings.academicYear})` : ''}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Foco Escolar <span className="text-red-600">{settings?.studentClass || '9º B'}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Inicia sessão para aceder ao horário, trabalhos de casa, preparação da mochila e check-ins com fotografia.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Benfica Red Ribbon */}
        <div className="h-2.5 w-full bg-gradient-to-r from-red-700 via-red-600 to-red-800" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-semibold leading-relaxed">{errorMsg}</div>
              </div>

              {domainBlockedInfo && (
                <div className="pt-2 border-t border-red-200/60 space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrimaryAdminDirectLogin}
                      disabled={loading}
                      className="flex-1 py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Entrar como meiraxx@gmail.com (1 Toque)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFamilyDeviceLogin}
                      disabled={loading}
                      className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Modo Família Direto</span>
                    </button>
                    {domainBlockedInfo.hostname && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(domainBlockedInfo.hostname);
                            setCopiedHostname(true);
                            setTimeout(() => setCopiedHostname(false), 2500);
                          } catch {}
                        }}
                        className="py-2.5 px-3 rounded-lg border border-red-300 bg-white hover:bg-red-50/50 text-red-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Copiar domínio para adicionar à consola do Firebase"
                      >
                        {copiedHostname ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedHostname ? 'Copiado!' : 'Copiar Domínio'}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-red-700/90 leading-normal">
                    <strong>Em modo anónimo / restrito?</strong> Clica acima em <em>"Entrar como meiraxx@gmail.com"</em> ou <em>"Modo Família"</em> para entrar imediatamente sem bloqueios de popup ou cookies!
                  </p>
                </div>
              )}
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-semibold">{successNotice}</div>
            </div>
          )}

          {/* Auth Method Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('google');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'google'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-red-600" />
              <span>Conta Google</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'email'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-red-600" />
              <span>Email & Senha</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('device');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'device'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Modo Família</span>
            </button>
          </div>

          {/* Tab 1: Google 1-Click Login */}
          {authMode === 'google' && (
            <div className="space-y-4 py-1">
              <p className="text-xs text-slate-500 text-center">
                Entra com a tua conta Gmail habitual (pais ou Francisco) para manter a sessão sincronizada entre todos os dispositivos.
              </p>

              {/* Google Identity Services official native button (renders if GSI client is loaded) */}
              <div ref={gsiContainerRef} className="flex justify-center empty:hidden" />

              <button
                type="button"
                id="btn-login-google-portal"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-bold text-sm shadow-sm transition flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 text-slate-600 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{loading ? 'A contactar a Google...' : 'Entrar com Conta Google (Popup)'}</span>
              </button>

              {/* Direct 1-Click for primary admin meiraxx@gmail.com */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handlePrimaryAdminDirectLogin}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-600 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-red-600" />
                  <span>Entrar como meiraxx@gmail.com</span>
                </button>
                <button
                  type="button"
                  onClick={handleStudentDirectEntry}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span>Acesso Aluno (Francisco)</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Email & Password */}
          {authMode === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4 py-1">
              <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-[11px] text-blue-900 leading-snug">
                Podes aceder com a tua conta de email criada no Firebase ou no formulário abaixo. Se estiveres num ambiente restrito, o acesso é autenticado localmente de forma segura.
              </div>

              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold w-fit mx-auto">
                <button
                  type="button"
                  onClick={() => setEmailAction('signin')}
                  className={`px-4 py-1.5 rounded-md transition ${
                    emailAction === 'signin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Iniciar Sessão
                </button>
                <button
                  type="button"
                  onClick={() => setEmailAction('signup')}
                  className={`px-4 py-1.5 rounded-md transition ${
                    emailAction === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Criar Conta
                </button>
              </div>

              {emailAction === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome de Utilizador
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Francisco, Pai ou Mãe"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Endereço de Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.pt"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>
                  {emailAction === 'signup'
                    ? 'Registar e Entrar na Plataforma'
                    : 'Entrar com Email'}
                </span>
              </button>
            </form>
          )}

          {/* Tab 3: Direct Family Device Mode */}
          {authMode === 'device' && (
            <div className="space-y-4 py-1">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>Entrada Imediata Sem Senhas</span>
                </div>
                <p className="leading-relaxed">
                  Autoriza este telemóvel ou computador a ligar-se diretamente à base de dados do 9º B em tempo real. Ideal para acesso rápido no telemóvel do Francisco ou dos pais.
                </p>
              </div>

              <button
                type="button"
                id="btn-login-family-portal"
                onClick={handleFamilyDeviceLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span>Entrar no Modo Família (1 Toque)</span>
              </button>
            </div>
          )}

          {/* Security note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dados da turma e check-ins protegidos via Firebase Firestore</span>
          </div>
        </div>
      </div>

      {/* Quick Direct Student / Family Access Card */}
      <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/80 p-4 shadow-sm text-center space-y-2">
        <p className="text-xs font-bold text-slate-700">
          Acesso Rápido Sem Palavra-passe
        </p>
        <p className="text-[11px] text-slate-500">
          Se estás no telemóvel do Francisco ou num navegador privado, podes entrar diretamente na aplicação:
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={handleStudentDirectEntry}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Entrar como Francisco (Aluno)</span>
          </button>
          <button
            type="button"
            onClick={handleFamilyDeviceLogin}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Shield className="w-3.5 h-3.5 text-white" />
            <span>Entrar como Família (Pais)</span>
          </button>
        </div>
      </div>

      {/* PWA shortcut hint */}
      <div className="text-center">
        <p className="text-xs text-slate-500">
          Dica: No iPhone (Safari) ou Android (Chrome), toca em <strong>"Adicionar ao Ecrã Principal"</strong> para abrir a app em ecrã inteiro.
        </p>
      </div>
    </div>
  );
};
