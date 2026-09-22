import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Activity,
  Calendar,
  BookOpen,
  Filter,
  TrendingDown,
  Info,
} from 'lucide-react';
import { SchoolTask, ActivityLog } from '../types';
import { SUBJECTS } from '../data/timetableData';

interface ParentAnalyticsChartsProps {
  tasks: SchoolTask[];
  logs: ActivityLog[];
  studentName?: string;
}

export const ParentAnalyticsCharts: React.FC<ParentAnalyticsChartsProps> = ({
  tasks,
  logs,
  studentName = 'Francisco',
}) => {
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [overdueSubjectFilter, setOverdueSubjectFilter] = useState<string>('ALL');

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // 1. Calculations regarding Overdue Tasks & Homework
  const taskMetrics = useMemo(() => {
    let total = tasks.length;
    let completedOnTime = 0;
    let completedLate = 0;
    let pendingOnTime = 0;
    let pendingOverdue = 0;

    const overdueTaskList: Array<{
      task: SchoolTask;
      daysExceeded: number;
      isCompleted: boolean;
    }> = [];

    const subjectBreakdown: Record<
      string,
      { total: number; overdue: number; onTime: number; completed: number }
    > = {};

    tasks.forEach((task) => {
      const sub = task.subjectCode || 'OUTRO';
      if (!subjectBreakdown[sub]) {
        subjectBreakdown[sub] = { total: 0, overdue: 0, onTime: 0, completed: 0 };
      }
      subjectBreakdown[sub].total += 1;

      const dueDate = task.dueDate;
      const isDone = !!task.checkIn;

      if (isDone) {
        subjectBreakdown[sub].completed += 1;
        const checkInDate = task.checkIn!.timestamp.split('T')[0];
        if (checkInDate > dueDate) {
          completedLate += 1;
          const diffDays = Math.max(
            1,
            Math.floor(
              (new Date(checkInDate).getTime() - new Date(dueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          overdueTaskList.push({
            task,
            daysExceeded: diffDays,
            isCompleted: true,
          });
          subjectBreakdown[sub].overdue += 1;
        } else {
          completedOnTime += 1;
          subjectBreakdown[sub].onTime += 1;
        }
      } else {
        // Pending task
        if (dueDate < todayStr) {
          pendingOverdue += 1;
          const diffDays = Math.max(
            1,
            Math.floor(
              (new Date(todayStr).getTime() - new Date(dueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          overdueTaskList.push({
            task,
            daysExceeded: diffDays,
            isCompleted: false,
          });
          subjectBreakdown[sub].overdue += 1;
        } else {
          pendingOnTime += 1;
          subjectBreakdown[sub].onTime += 1;
        }
      }
    });

    // Sort overdue tasks: biggest delay first
    overdueTaskList.sort((a, b) => b.daysExceeded - a.daysExceeded);

    const totalOverdue = pendingOverdue + completedLate;
    const punctualityRate =
      total > 0 ? Math.round(((total - totalOverdue) / total) * 100) : 100;

    return {
      total,
      completedOnTime,
      completedLate,
      pendingOnTime,
      pendingOverdue,
      totalOverdue,
      punctualityRate,
      overdueTaskList,
      subjectBreakdown,
    };
  }, [tasks, todayStr]);

  // 2. Calculations regarding user activity & usage breakdown
  const userUsageMetrics = useMemo(() => {
    const userMap: Record<
      string,
      {
        email: string;
        name: string;
        totalActions: number;
        logins: number;
        checkIns: number;
        taskEdits: number;
        lastActive: string;
      }
    > = {};

    logs.forEach((log) => {
      const email = log.userEmail || 'Desconhecido';
      if (!userMap[email]) {
        userMap[email] = {
          email,
          name: log.userName || email.split('@')[0],
          totalActions: 0,
          logins: 0,
          checkIns: 0,
          taskEdits: 0,
          lastActive: log.timestamp,
        };
      }

      userMap[email].totalActions += 1;
      if (log.action === 'login') userMap[email].logins += 1;
      if (log.action === 'task_checkin') userMap[email].checkIns += 1;
      if (
        log.action === 'task_create' ||
        log.action === 'task_edit' ||
        log.action === 'task_delete'
      ) {
        userMap[email].taskEdits += 1;
      }

      if (new Date(log.timestamp) > new Date(userMap[email].lastActive)) {
        userMap[email].lastActive = log.timestamp;
      }
    });

    const userList = Object.values(userMap).sort(
      (a, b) => b.totalActions - a.totalActions
    );

    // Chart Data for User actions comparison
    const userBarData = userList.map((u) => ({
      name: u.name.length > 12 ? u.name.substring(0, 10) + '...' : u.name,
      fullName: u.name,
      email: u.email,
      ações: u.totalActions,
      checkIns: u.checkIns,
      tarefas: u.taskEdits,
    }));

    return {
      userList,
      userBarData,
      totalLogs: logs.length,
    };
  }, [logs]);

  // 3. Chart Data: Overdue vs On Time by Subject
  const subjectChartData = useMemo(() => {
    return (Object.entries(taskMetrics.subjectBreakdown) as [string, { total: number; overdue: number; onTime: number; completed: number }][])
      .map(([subCode, data]) => {
        const subName = SUBJECTS[subCode]?.name || subCode;
        return {
          subject: subCode,
          nomeCompleto: subName,
          aTempo: data.onTime,
          emAtraso: data.overdue,
          total: data.total,
        };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.emAtraso - a.emAtraso);
  }, [taskMetrics.subjectBreakdown]);

  // 4. Pie Chart: Overall Compliance Status
  const statusPieData = useMemo(() => {
    return [
      { name: 'Concluído no Prazo', value: taskMetrics.completedOnTime, color: '#10b981' },
      { name: 'Aguardando no Prazo', value: taskMetrics.pendingOnTime, color: '#3b82f6' },
      { name: 'Excedeu Tempo (Pendente)', value: taskMetrics.pendingOverdue, color: '#ef4444' },
      { name: 'Entregue Fora do Prazo', value: taskMetrics.completedLate, color: '#f59e0b' },
    ].filter((item) => item.value > 0);
  }, [taskMetrics]);

  // 5. Filtered Overdue List
  const filteredOverdueList = useMemo(() => {
    return taskMetrics.overdueTaskList.filter((item) => {
      if (overdueSubjectFilter === 'ALL') return true;
      return item.task.subjectCode === overdueSubjectFilter;
    });
  }, [taskMetrics.overdueTaskList, overdueSubjectFilter]);

  // 6. Filtered Logs table
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (selectedUserFilter === 'ALL') return true;
      return l.userEmail === selectedUserFilter;
    });
  }, [logs, selectedUserFilter]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks & Compliance Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Taxa de Cumprimento
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                taskMetrics.punctualityRate >= 80
                  ? 'bg-emerald-100 text-emerald-700'
                  : taskMetrics.punctualityRate >= 60
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {taskMetrics.punctualityRate}%
            </span>
            <span className="text-xs font-medium text-slate-500">no prazo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {taskMetrics.total - taskMetrics.totalOverdue} de {taskMetrics.total} trabalhos pontuais
          </p>
        </div>

        {/* Total Overdue */}
        <div className="bg-white rounded-2xl border border-red-200/80 bg-red-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              Excederam Tempo Limite
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-red-600">
              {taskMetrics.totalOverdue}
            </span>
            <span className="text-xs font-bold text-red-700">
              {taskMetrics.pendingOverdue > 0
                ? `(${taskMetrics.pendingOverdue} em atraso ativo)`
                : 'regularizados'}
            </span>
          </div>
          <p className="text-[11px] text-red-600/80 mt-1">
            {taskMetrics.completedLate} entregues com atraso • {taskMetrics.pendingOverdue} por concluir
          </p>
        </div>

        {/* Active Family Members / Users */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Utilizadores Ativos
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {userUsageMetrics.userList.length}
            </span>
            <span className="text-xs font-medium text-slate-500">contas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {userUsageMetrics.totalLogs} ações de utilização registadas
          </p>
        </div>

        {/* Check-ins with Photo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Comprovativos Enviados
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {taskMetrics.completedOnTime + taskMetrics.completedLate}
            </span>
            <span className="text-xs font-medium text-slate-500">validados</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Fotos de cadernos e TPCs concluídos
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Punctuality vs Overdue by Subject */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-red-600" />
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                Prazos por Disciplina (No Prazo vs Atrasos)
              </h4>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
              9º B
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Compara trabalhos concluídos a tempo com trabalhos que ultrapassaram a data limite por disciplina.
          </p>

          <div className="h-64 w-full">
            {subjectChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem tarefas registadas para exibir o gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={subjectChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <XAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fontWeight: 700 }}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                            <p className="font-extrabold text-amber-300">
                              {item.subject} • {item.nomeCompleto}
                            </p>
                            <p className="text-emerald-400 font-bold">
                              ✓ No Prazo: {item.aTempo}
                            </p>
                            <p className="text-red-400 font-bold">
                              ⚠️ Excedeu Tempo: {item.emAtraso}
                            </p>
                            <p className="text-slate-400 text-[10px]">
                              Total: {item.total} tarefas
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="aTempo" name="No Prazo" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="emAtraso" name="Excedeu Prazo" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              Cumprido no Prazo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-red-500 inline-block" />
              Excedeu Prazo / Em Atraso
            </span>
          </div>
        </div>

        {/* Chart 2: System Usage per User */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-600" />
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                Utilização da Plataforma por Utilizador
              </h4>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
              Interações
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Volume de atividade, check-ins e gestão de tarefas registado por cada membro da família.
          </p>

          <div className="h-64 w-full">
            {userUsageMetrics.userBarData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Ainda não foram registados logs de utilizador.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={userUsageMetrics.userBarData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                            <p className="font-extrabold text-amber-300">
                              {item.fullName}
                            </p>
                            <p className="text-slate-400 text-[10px]">{item.email}</p>
                            <p className="text-blue-400 font-bold">
                              Ações Totais: {item.ações}
                            </p>
                            <p className="text-emerald-400 font-bold">
                              Check-ins com Foto: {item.checkIns}
                            </p>
                            <p className="text-indigo-400 font-bold">
                              Criação/Edição Tarefas: {item.tarefas}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="ações" name="Ações Totais" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="checkIns" name="Check-ins Foto" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" />
              Ações Globais
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              Check-ins Submetidos
            </span>
          </div>
        </div>
      </div>

      {/* Section: Detalhe de Trabalhos/TPCs que Excederam o Prazo */}
      <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <h4 className="font-extrabold text-base text-slate-900">
                Auditoria de Trabalhos que Excederam o Tempo Limite ({filteredOverdueList.length})
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lista analítica detalhada com o número de dias excedidos em relação à data estipulada de entrega.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Disciplina:</span>
            <select
              value={overdueSubjectFilter}
              onChange={(e) => setOverdueSubjectFilter(e.target.value)}
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

        {filteredOverdueList.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50/50 rounded-xl border border-emerald-200/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-950">
              Excelente! Não há trabalhos com prazo excedido com este filtro.
            </p>
            <p className="text-xs text-emerald-800 mt-0.5">
              O Francisco está a cumprir o calendário e os prazos planeados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  <th className="p-3">Disciplina</th>
                  <th className="p-3">Trabalho / TPC</th>
                  <th className="p-3">Data Limite</th>
                  <th className="p-3 text-center">Dias Excedidos</th>
                  <th className="p-3">Estado Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOverdueList.map(({ task, daysExceeded, isCompleted }) => {
                  const sub = SUBJECTS[task.subjectCode];
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <span
                          className="font-extrabold px-2 py-0.5 rounded-md text-[11px] text-white"
                          style={{ backgroundColor: sub?.color || '#475569' }}
                        >
                          {task.subjectCode}
                        </span>
                        <span className="ml-2 font-bold text-slate-800 hidden sm:inline">
                          {sub?.name || task.subjectCode}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{task.title}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">
                          {task.description || 'Sem descrição adicional'}
                        </p>
                      </td>
                      <td className="p-3 font-semibold text-slate-600 whitespace-nowrap">
                        {new Date(task.dueDate).toLocaleDateString('pt-PT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-black text-red-700 bg-red-100/80 px-2.5 py-1 rounded-full text-xs">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>+{daysExceeded} {daysExceeded === 1 ? 'dia' : 'dias'}</span>
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>Entregue com atraso</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Atraso ativo (pendente)</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section: Logs de Auditoria & Utilização por Membro da Família */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h4 className="font-extrabold text-base text-slate-900">
                Registo Cronológico de Ações e Acessos ({filteredLogs.length})
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Histórico detalhado de logins, conclusões com foto e alterações na plataforma familiar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Filtrar Utilizador:</span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
            >
              <option value="ALL">Todos os Utilizadores</option>
              {userUsageMetrics.userList.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              Nenhum registo de atividade encontrado para este utilizador.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              As ações são registadas automaticamente quando um membro da família faz check-in ou gere tarefas.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleDateString('pt-PT', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
              let label = 'Ação Geral';

              switch (log.action) {
                case 'login':
                  badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                  label = 'Sessão Iniciada';
                  break;
                case 'task_checkin':
                  badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  label = 'Check-in com Foto';
                  break;
                case 'task_create':
                  badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                  label = 'Novo Trabalho';
                  break;
                case 'task_edit':
                  badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
                  label = 'Edição';
                  break;
                case 'task_delete':
                  badgeColor = 'bg-red-50 text-red-800 border-red-200';
                  label = 'Eliminação';
                  break;
                case 'backpack_toggle':
                  badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  label = 'Mochila Pronta';
                  break;
                case 'settings_update':
                  badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
                  label = 'Configurações';
                  break;
              }

              return (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${badgeColor}`}
                    >
                      {label}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {log.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {log.userName || log.userEmail}
                        </span>
                        <span>•</span>
                        <span>{log.userEmail}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-slate-500 shrink-0 whitespace-nowrap pl-2">
                    {dateStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
