import React, { useState } from 'react';
import {
  Shield,
  Camera,
  Calendar,
  Download,
  Upload,
  Lock,
  Unlock,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  Database,
  ExternalLink,
  Eye,
  Check,
  AlertCircle,
  Cloud,
  RefreshCw,
  LogOut,
  LogIn,
  User as UserIcon,
  Mail,
  School,
  Plus,
  Trash2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { SchoolTask, CheckInRecord, AppSettings } from '../types';
import { SUBJECTS } from '../data/timetableData';

interface ParentHistoryViewProps {
  tasks: SchoolTask[];
  settings: AppSettings;
  user: User | null;
  isLoggingIn?: boolean;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  onConnectFamilySync?: () => Promise<void>;
  onSyncAllToCloud: () => Promise<void>;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onOpenCloudInfo?: () => void;
}

export const ParentHistoryView: React.FC<ParentHistoryViewProps> = ({
  tasks,
  settings,
  user,
  isLoggingIn = false,
  onLoginGoogle,
  onLogoutGoogle,
  onConnectFamilySync,
  onSyncAllToCloud,
  onUpdateSettings,
  onExportData,
  onImportData,
  onOpenCloudInfo,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [viewPhotoModal, setViewPhotoModal] = useState<CheckInRecord | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(false);

  // Settings local state
  const [greenDays, setGreenDays] = useState(settings.greenDaysThreshold);
  const [yellowDays, setYellowDays] = useState(settings.yellowDaysThreshold);
  const [studentName, setStudentName] = useState(settings.studentName || 'Francisco');
  const [academicYear, setAcademicYear] = useState(settings.academicYear || '2026/2027');
  const [studentClass, setStudentClass] = useState(settings.studentClass || '9º B');
  const [schoolName, setSchoolName] = useState(settings.schoolName || 'Escola Básica António Gedeão');
  const [allowedEmails, setAllowedEmails] = useState<string[]>(
    settings.allowedEmails && settings.allowedEmails.length > 0
      ? settings.allowedEmails
      : ['meiraxx@gmail.com']
  );
  const [newEmailInput, setNewEmailInput] = useState('');
  const [newYearInput, setNewYearInput] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [academicYearSaved, setAcademicYearSaved] = useState(false);
  const [allowlistSaved, setAllowlistSaved] = useState(false);

  // Available academic years
  const availableYears = Array.from(
    new Set([
      '2024/2025',
      '2025/2026',
      '2026/2027',
      '2027/2028',
      '2028/2029',
      academicYear,
    ])
  ).sort();

  // Collect all tasks that have check-ins
  const tasksWithCheckIn = tasks.filter((t) => t.checkIn);

  // Sort by check-in timestamp descending
  const sortedCheckIns = [...tasksWithCheckIn].sort((a, b) => {
    const timeA = a.checkIn ? new Date(a.checkIn.timestamp).getTime() : 0;
    const timeB = b.checkIn ? new Date(b.checkIn.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  const filteredTasks = sortedCheckIns.filter((t) => {
    if (selectedSubjectFilter === 'ALL') return true;
    return t.subjectCode === selectedSubjectFilter;
  });

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.parentPin || pinInput === '1904') {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      greenDaysThreshold: Number(greenDays),
      yellowDaysThreshold: Number(yellowDays),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const handleSaveAcademicYear = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      studentName: studentName.trim() || 'Francisco',
      academicYear: academicYear.trim() || '2026/2027',
      studentClass: studentClass.trim() || '9º B',
      schoolName: schoolName.trim() || 'Escola Básica António Gedeão',
    });
    setAcademicYearSaved(true);
    setTimeout(() => setAcademicYearSaved(false), 3000);
  };

  const handleAddYear = () => {
    if (newYearInput.trim()) {
      setAcademicYear(newYearInput.trim());
      setNewYearInput('');
    }
  };

  const handleAddAllowedEmail = () => {
    const trimmed = newEmailInput.trim().toLowerCase();
    if (trimmed && !allowedEmails.includes(trimmed)) {
      const updated = [...allowedEmails, trimmed];
      setAllowedEmails(updated);
      setNewEmailInput('');
      onUpdateSettings({
        ...settings,
        allowedEmails: updated,
      });
      setAllowlistSaved(true);
      setTimeout(() => setAllowlistSaved(false), 3000);
    }
  };

  const handleRemoveAllowedEmail = (emailToRemove: string) => {
    if (allowedEmails.length <= 1) {
      alert('Tem de existir pelo menos um email autorizado.');
      return;
    }
    const updated = allowedEmails.filter((em) => em !== emailToRemove);
    setAllowedEmails(updated);
    onUpdateSettings({
      ...settings,
      allowedEmails: updated,
    });
    setAllowlistSaved(true);
    setTimeout(() => setAllowlistSaved(false), 3000);
  };

  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                Área Familiar & Pais
              </span>
              <span className="text-xs text-slate-400">Auditoria de Check-ins</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Histórico de Check-ins com Foto & Configurações
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Revisão de fotografias de cadernos, fichas concluídas e regulação de prazos.
            </p>
          </div>
        </div>

        {/* Lock / Unlock status */}
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <button
              onClick={() => setIsUnlocked(false)}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-2 rounded-xl border border-white/10"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Bloquear Vista</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-amber-300 bg-amber-950/50 border border-amber-800/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Protegido por Código PIN (Padrão: 1904)</span>
            </span>
          )}
        </div>
      </div>

      {/* If locked, show PIN prompt */}
      {!isUnlocked ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Desbloquear Painel dos Pais
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Introduz o PIN familiar para aceder ao histórico de fotos, ajustes de alertas e cópias de segurança.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Introduz o PIN (ex: 1904)"
                className="w-full text-center text-lg tracking-widest font-black border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
              {pinError && (
                <p className="text-xs font-bold text-red-600 mt-1.5 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Código PIN incorreto. O código padrão é 1904.</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-sm py-3 rounded-xl shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Desbloquear</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-400">
            Dica: O PIN padrão de fábrica é <strong>1904</strong> (ano de fundação do Benfica).
          </p>
        </div>
      ) : (
        /* UNLOCKED PARENT DASHBOARD */
        <div className="space-y-6">
          {/* Section 1: Visual Alert Days Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-extrabold text-base text-slate-900 mb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-600" />
              <span>Ajustar Regras dos Alertas de Cores</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configura quantos dias de antecedência ativam as cores no radar de testes e TPCs:
            </p>

            <form onSubmit={handleSaveThresholds} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  🟢 Verde (Tempo Confortável)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800">Mais de</span>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={greenDays}
                    onChange={(e) => setGreenDays(Number(e.target.value))}
                    className="w-16 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-sm font-black text-emerald-950 text-center"
                  />
                  <span className="text-xs font-bold text-emerald-800">dias de antecedência</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  🟡 Amarelo (Começar a Estudar)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-800">A partir de</span>
                  <input
                    type="number"
                    min={1}
                    max={greenDays - 1}
                    value={yellowDays}
                    onChange={(e) => setYellowDays(Number(e.target.value))}
                    className="w-16 bg-white border border-amber-300 rounded-lg px-2 py-1 text-sm font-black text-amber-950 text-center"
                  />
                  <span className="text-xs font-bold text-amber-800">dias antes</span>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Gravar Limiares</span>
                </button>
              </div>
            </form>

            {settingsSaved && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-100/70 p-2 rounded-lg mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Limiares atualizados com sucesso! Os cartões de testes e TPCs refletem agora estes valores.</span>
              </p>
            )}
          </div>

          {/* Section 1B: Reutilização do Portal & Novo Ano Letivo / Calendário */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                <span>Reutilização do Portal • Ano Letivo & Identificação</span>
              </h3>
              <span className="text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full">
                {academicYear}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Podes adicionar um novo ano escolar a qualquer momento (ex: 2026/2027, 2027/2028), alterar o nome do aluno, turma e escola para reutilizar a plataforma ano após ano.
            </p>

            <form onSubmit={handleSaveAcademicYear} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Nome do Aluno</span>
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ex: Francisco"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ano Letivo Ativo</span>
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} {yr === '2026/2027' ? '(Ano Atual)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-slate-500" />
                    <span>Turma / Ano</span>
                  </label>
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="Ex: 9º B ou 10º A"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-slate-500" />
                    <span>Nome da Escola</span>
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ex: Escola Básica António Gedeão"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Add custom year input */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Criar Novo Ano Escolar:</span>
                  <input
                    type="text"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="Ex: 2027/2028"
                    className="w-32 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddYear}
                    disabled={!newYearInput.trim()}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gravar Configuração do Ano Letivo</span>
                </button>
              </div>
            </form>

            {academicYearSaved && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-100/70 p-2 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Dados do ano letivo e aluno gravados com sucesso!</span>
              </p>
            )}
          </div>

          {/* Section 1C: Controlo de Acesso & Utilizadores Autorizados (Allowlist) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600" />
                <span>Controlo de Acesso e Contas Autorizadas</span>
              </h3>
              <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {allowedEmails.length} {allowedEmails.length === 1 ? 'conta autorizada' : 'contas autorizadas'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Apenas os emails indicados nesta lista conseguem aceder à plataforma. Qualquer outro utilizador Google que tente aceder será bloqueado.
            </p>

            {/* List of current authorized emails */}
            <div className="space-y-2">
              {allowedEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-red-600" />
                    <span>{email}</span>
                    {email === 'meiraxx@gmail.com' && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                        Administrador Principal
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllowedEmail(email)}
                    className="text-slate-400 hover:text-red-600 p-1 transition"
                    title="Remover autorização"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new authorized email */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAllowedEmail();
                    }
                  }}
                  placeholder="Novo email a autorizar (ex: pai@gmail.com ou francisco@gmail.com)"
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddAllowedEmail}
                disabled={!newEmailInput.trim()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Autorizar Email</span>
              </button>
            </div>

            {allowlistSaved && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-100/70 p-2 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Lista de acessos atualizada! Apenas estas contas têm permissão para aceder.</span>
              </p>
            )}
          </div>

          {/* Section 2: Photo Check-ins Audit Gallery */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-red-600" />
                  <span>Galeria de Comprovativos Enviados ({filteredTasks.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Todas as fotos submetidas pelo teu filho com carimbo de data e hora.
                </p>
              </div>

              {/* Subject Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Filtrar:</span>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                >
                  <option value="ALL">Todas as Disciplinas</option>
                  {Object.values(SUBJECTS).map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  Nenhum check-in com foto registado ainda com este filtro.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Assim que o teu filho carregar uma foto no Dashboard, ela ficará arquivada aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => {
                  const check = task.checkIn!;
                  const sub = SUBJECTS[task.subjectCode];
                  const checkDate = new Date(check.timestamp).toLocaleDateString('pt-PT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={task.id}
                      className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col"
                    >
                      {/* Photo Thumbnail */}
                      <div
                        className="relative h-44 bg-slate-900 cursor-pointer group"
                        onClick={() => setViewPhotoModal(check)}
                      >
                        <img
                          src={check.photoDataUrl}
                          alt="Foto comprovativa"
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" />
                          <span>Ver em Grande</span>
                        </div>
                        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {task.subjectCode}
                        </span>
                      </div>

                      {/* Info & Notes */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-black text-slate-900 leading-tight">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {sub?.name || task.subjectCode} • {sub?.teacher ? `Prof. ${sub.teacher}` : ''}
                          </p>
                          {check.notes && (
                            <p className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 mt-2 italic">
                              "{check.notes}"
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmado
                          </span>
                          <span>{checkDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Data Backup & Persistence Explanation (Crucial user request) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-red-600" />
              <span>Cópia de Segurança dos Dados & Persistência</span>
            </h3>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                Como são guardados os dados nesta aplicação:
              </h4>
              <p>
                <strong>1. Armazenamento no Dispositivo (IndexedDB):</strong> Todos os horários, testes, TPCs e fotos das tarefas ficam guardados permanentemente no armazenamento do browser deste telemóvel/computador. Mesmo que feches a página ou desligues o telemóvel, nada se perde.
              </p>
              <p>
                <strong>2. Exportar & Fazer Cópia de Segurança:</strong> Podes descarregar a qualquer momento um ficheiro JSON com todas as fotos e tarefas gravadas para transferir para o telemóvel do teu filho ou guardar no teu computador.
              </p>
              <p>
                <strong>3. Sincronização em Tempo Real na Nuvem:</strong> Se pretenderem que o telemóvel do pai e o telemóvel do filho sincronizem instantaneamente entre si via internet, pode ser ativada uma base de dados na nuvem (Firebase Firestore).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onExportData}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Descarregar Cópia de Segurança (JSON)</span>
              </button>

              <label className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Restaurar Ficheiro de Cópia</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileImportChange}
                />
              </label>
            </div>
          </div>

          {/* Section 4: Firebase Firestore Cloud Sync */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span>Sincronização Firebase na Nuvem</span>
              </h3>
              {user && (
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sessão Ativa
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Permite que os pais vejam no seu telemóvel exatamente o mesmo que o filho vê no computador ou no telemóvel dele, atualizado em tempo real.
            </p>

            {user ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                      {user.displayName?.charAt(0) || (user.email ? user.email.charAt(0) : 'F')}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">
                        {user.displayName || (user.isAnonymous ? 'Dispositivo da Família (Sincronizado)' : 'Utilizador da Família')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {user.email || 'Ligação direta à Nuvem Firestore ativa'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onLogoutGoogle}
                    className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Terminar Sessão</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600 font-medium">
                    Base de Dados: Firestore provisionada
                  </span>

                  <button
                    disabled={syncingCloud}
                    onClick={async () => {
                      setSyncingCloud(true);
                      try {
                        await onSyncAllToCloud();
                        setSyncSuccessMsg(true);
                        setTimeout(() => setSyncSuccessMsg(false), 3500);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setSyncingCloud(false);
                      }
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-2xs transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
                    <span>{syncingCloud ? 'A sincronizar...' : 'Forçar Envio para Nuvem'}</span>
                  </button>
                </div>

                {syncSuccessMsg && (
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-100/80 p-2 rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Todas as tarefas e dados locais foram sincronizados com sucesso no Firebase!</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Ainda não iniciaste sessão na nuvem
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Inicia sessão com a conta Google para ligar a base de dados Firestore partilhada.
                  </p>
                  {onOpenCloudInfo && (
                    <button
                      type="button"
                      onClick={onOpenCloudInfo}
                      className="mt-1.5 text-[11px] font-bold text-red-600 hover:text-red-800 underline flex items-center gap-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Problemas a ligar em produção? Vê os domínios autorizados</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  {onConnectFamilySync && (
                    <button
                      type="button"
                      disabled={isLoggingIn}
                      onClick={onConnectFamilySync}
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-200 disabled:opacity-60"
                      title="Sincronizar sem restrições de domínio"
                    >
                      <Cloud className="w-3.5 h-3.5 text-white" />
                      <span>Ligar Nuvem (Direto)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={onLoginGoogle}
                    className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-60"
                  >
                    {isLoggingIn ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Google</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Size Photo Modal */}
      {viewPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300">
                Visualização do Comprovativo
              </h4>
              <button
                onClick={() => setViewPhotoModal(null)}
                className="text-white hover:text-red-400 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={viewPhotoModal.photoDataUrl}
                alt="Comprovativo ampliado"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>{viewPhotoModal.notes ? `Nota: "${viewPhotoModal.notes}"` : 'Sem nota'}</span>
              <button
                onClick={() => setViewPhotoModal(null)}
                className="bg-red-600 text-white font-bold px-3 py-1 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
