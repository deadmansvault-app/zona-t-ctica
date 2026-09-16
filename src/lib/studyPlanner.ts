import { StudySession, AlertColor } from '../types';
import { formatLocalDate } from './storage';

/**
 * Calculates alert color based on days remaining:
 * Verde: ainda há tempo confortável para estudar (> greenThreshold, ex: > 5 dias)
 * Amarelo: prazo a aproximar-se, convém começar a estudar (yellowThreshold até greenThreshold, ex: 3 a 5 dias)
 * Vermelho: prazo apertado / última oportunidade (<= redLimit, ex: 2 dias ou hoje)
 */
export function getUrgencyStatus(
  dueDateStr: string,
  greenThreshold = 5,
  yellowThreshold = 3
): { color: AlertColor; label: string; daysRemaining: number; bgBadge: string; textBadge: string; borderAccent: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining > greenThreshold) {
    return {
      color: 'verde',
      label: `Tempo confortável (${daysRemaining} dias)`,
      daysRemaining,
      bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      textBadge: 'text-emerald-700',
      borderAccent: 'border-l-4 border-l-emerald-500',
    };
  }

  if (daysRemaining >= yellowThreshold) {
    return {
      color: 'amarelo',
      label: `Atenção: Começar a rever (${daysRemaining} dias)`,
      daysRemaining,
      bgBadge: 'bg-amber-100 text-amber-800 border-amber-300',
      textBadge: 'text-amber-700',
      borderAccent: 'border-l-4 border-l-amber-500',
    };
  }

  if (daysRemaining >= 0) {
    return {
      color: 'vermelho',
      label: daysRemaining === 0 ? 'Prazo Termina Hoje!' : `Prazo Apertado! (${daysRemaining} dia${daysRemaining > 1 ? 's' : ''})`,
      daysRemaining,
      bgBadge: 'bg-red-100 text-red-800 border-red-300',
      textBadge: 'text-red-700',
      borderAccent: 'border-l-4 border-l-red-600',
    };
  }

  return {
    color: 'vermelho',
    label: `Atrasado (${Math.abs(daysRemaining)} dia${Math.abs(daysRemaining) > 1 ? 's' : ''})`,
    daysRemaining,
    bgBadge: 'bg-rose-200 text-rose-900 border-rose-400',
    textBadge: 'text-rose-800',
    borderAccent: 'border-l-4 border-l-rose-700',
  };
}

/**
 * Generates an automated study plan (2 to 3 sessions) before a test or deadline.
 * Strictly respects handball training on Mondays, Wednesdays, and Fridays (20h00 - 22h00).
 */
export function generateStudyPlan(
  subjectName: string,
  dueDateStr: string,
  sessionsCount = 3
): StudySession[] {
  const targetDate = new Date(dueDateStr);
  targetDate.setHours(0, 0, 0, 0);

  const sessions: StudySession[] = [];
  const topicsDefault = [
    `Leitura inicial, resumo dos conceitos-chave e ver apontamentos do caderno de ${subjectName}`,
    `Resolução de fichas práticas, exercícios do manual e dúvidas frequentes`,
    `Simulação rápida de teste e revisão final dos pontos mais difíceis`,
  ];

  let dayOffset = 1;
  while (sessions.length < sessionsCount && dayOffset <= 14) {
    const candidateDate = new Date(targetDate);
    candidateDate.setDate(targetDate.getDate() - dayOffset);
    const dayOfWeek = candidateDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const isHandballDay = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5; // Segundas, Quartas, Sextas
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let timeRange = '18:00 - 18:45';
    if (isHandballDay) {
      // Must be well before handball starts at 20:00!
      timeRange = '17:45 - 18:35 (Antes do Andebol das 20h)';
    } else if (isWeekend) {
      timeRange = '10:30 - 11:20 (Manhã de fim de semana)';
    } else {
      timeRange = '18:15 - 19:00';
    }

    const isoDate = formatLocalDate(candidateDate);
    const sessionIdx = sessions.length;

    sessions.unshift({
      id: `session-${Date.now()}-${sessionIdx}`,
      date: isoDate,
      timeRange,
      topic: topicsDefault[sessionIdx % topicsDefault.length],
      completed: false,
    });

    dayOffset += dayOffset === 1 ? 2 : 2; // Spread across preceding days
  }

  return sessions;
}
