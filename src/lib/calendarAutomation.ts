import { SchoolTask, TaskType, StudySession } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { formatLocalDate } from './storage';
import { generateStudyPlan } from './studyPlanner';

export interface CalendarAutomationResult {
  type: TaskType;
  subjectCode: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  description: string;
  groupMembers?: string[];
  studySessions: StudySession[];
  confidence: number;
  reasons: string[];
}

/**
 * Normalizes text for keyword matching (lowercase, no accents)
 */
function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Detects the School Subject from text
 */
export function detectSubjectFromText(text: string): { code: string; matchName: string } {
  const norm = normalizeStr(text);

  const subjectKeywords: { code: string; matchName: string; keywords: string[] }[] = [
    { code: 'MAT', matchName: 'Matemática', keywords: ['matematica', 'mat', 'calculo', 'geometria', 'algebra', 'fracoes', 'equacoes'] },
    { code: 'POR', matchName: 'Português', keywords: ['portugues', 'por', 'gramatica', 'leitura', 'redacao', 'lusíadas', 'lusiadas', 'texto'] },
    { code: 'FG', matchName: 'Físico-Química', keywords: ['fisico-quimica', 'fisico quimica', 'fq', 'fg', 'fisica', 'quimica', 'tabela periodica', 'forcas', 'movimento'] },
    { code: 'CN', matchName: 'Ciências Naturais', keywords: ['ciencias', 'cn', 'biologia', 'vulcoes', 'vulcanismo', 'dna', 'genetica', 'corpo humano', 'celula'] },
    { code: 'HIST', matchName: 'História', keywords: ['historia', 'hist', 'descobrimentos', 'revolucao', 'seculo', 'guerra', 'imperio', 'monarquia', 'republica'] },
    { code: 'GEO', matchName: 'Geografia', keywords: ['geografia', 'geo', 'demografia', 'clima', 'relevo', 'mapa', 'paises', 'populacao', 'migracoes'] },
    { code: 'ING', matchName: 'Inglês', keywords: ['ingles', 'english', 'ing', 'vocabulary', 'reading', 'listening', 'present perfect'] },
    { code: 'FRA', matchName: 'Francês', keywords: ['frances', 'francais', 'fra', 'passé composé', 'vocabulaire', 'grammaire'] },
    { code: 'EF', matchName: 'Educação Física', keywords: ['educacao fisica', 'ed fisica', 'ef', 'ginastica', 'atletismo', 'aptidao'] },
    { code: 'EV', matchName: 'Educação Visual', keywords: ['educacao visual', 'ed visual', 'ev', 'desenho', 'perspetiva', 'geometria descritiva', 'sombras'] },
    { code: 'TIC', matchName: 'TIC', keywords: ['tic', 'informatica', 'programacao', 'scratch', 'computadores', 'excel', 'word'] },
    { code: 'CD', matchName: 'Cidadania e Desenvolvimento', keywords: ['cidadania', 'cd', 'direitos humanos', 'voluntariado', 'sustentabilidade'] },
    { code: 'EMRC', matchName: 'EMRC', keywords: ['emrc', 'religiao', 'moral', 'etica'] },
  ];

  for (const s of subjectKeywords) {
    for (const kw of s.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(norm)) {
        return { code: s.code, matchName: s.matchName };
      }
    }
  }

  return { code: 'MAT', matchName: 'Matemática' };
}

/**
 * Detects whether the event is a Test, Group Project, or Homework
 */
export function detectTypeFromText(text: string): { type: TaskType; reason: string; confidence: number } {
  const norm = normalizeStr(text);

  // 1. Check Group Work (Trabalho de Grupo)
  const groupKeywords = [
    'trabalho de grupo',
    'trabalho em grupo',
    'grupo',
    'projeto',
    'projecto',
    'apresentacao',
    'slides',
    'maquete',
    'relatorio',
    'equipa',
    'com o ',
    'com a ',
    'colegas',
  ];
  for (const kw of groupKeywords) {
    if (norm.includes(kw)) {
      return {
        type: 'trabalho',
        reason: `Palavra-chave de trabalho/grupo detetada: "${kw}"`,
        confidence: 0.95,
      };
    }
  }

  // 2. Check Test (Teste / Avaliação)
  const testKeywords = [
    'teste',
    'avaliacao',
    'ficha de avaliacao',
    'exame',
    'prova',
    'sumativa',
    'matriz',
    'mini-teste',
    'miniteste',
    'questao de aula',
    'oral',
    'estudo para',
    'materia do teste',
  ];
  for (const kw of testKeywords) {
    if (norm.includes(kw)) {
      return {
        type: 'teste',
        reason: `Palavra-chave de avaliação detetada: "${kw}"`,
        confidence: 0.95,
      };
    }
  }

  // 3. Check Homework (TPC)
  const tpcKeywords = [
    'tpc',
    'tpcs',
    'trabalho de casa',
    'trabalhos de casa',
    'exercicio',
    'exercicios',
    'pagina',
    'pag',
    'livro',
    'manual',
    'ficha de trabalho',
    'fazer',
    'ler',
    'resolver',
  ];
  for (const kw of tpcKeywords) {
    if (norm.includes(kw)) {
      return {
        type: 'tpc',
        reason: `Palavra-chave de TPC detetada: "${kw}"`,
        confidence: 0.9,
      };
    }
  }

  // Default to TPC if short/unspecified, or trabalho if "trabalho" alone
  if (norm.includes('trabalho')) {
    return {
      type: 'trabalho',
      reason: 'Termo "trabalho" identificado',
      confidence: 0.75,
    };
  }

  return {
    type: 'tpc',
    reason: 'Identificado como tarefa padrão de casa / TPC',
    confidence: 0.7,
  };
}

/**
 * Extracts group member names if present (e.g. "com o Pedro, Tiago e a Inês")
 */
export function extractGroupMembers(text: string): string[] {
  const norm = text.replace(/\n/g, ' ');
  const members: string[] = [];

  // Match "com o ...", "com a ...", "com ..."
  const withMatch = norm.match(/(?:com\s+(?:o\s+|a\s+)?|membros:\s*|grupo:\s*)([A-ZÀ-Úa-zà-ú\s,e]+)(?:$|\.|\;|\n)/i);
  if (withMatch && withMatch[1]) {
    const rawList = withMatch[1]
      .split(/,|\se\s|\sou\s/)
      .map((s) => s.replace(/^(o|a|os|as)\s+/i, '').trim())
      .filter((s) => s.length > 1 && s.length < 30 && !['no', 'na', 'para', 'de', 'do', 'da'].includes(s.toLowerCase()));

    rawList.forEach((m) => {
      if (!members.includes(m)) {
        members.push(m);
      }
    });
  }

  return members;
}

/**
 * Extracts date from text if explicitly stated (e.g. "2026-10-15", "dia 25/10", "15 de outubro")
 */
export function extractDateFromText(text: string, fallbackDate?: string): string {
  // 1. Match ISO format: YYYY-MM-DD
  const isoMatch = text.match(/\b(202[5-9])-([0-1][0-9])-([0-3][0-9])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // 2. Match DD/MM or DD/MM/YYYY
  const slashMatch = text.match(/\b([0-3]?[0-9])\/([0-1]?[0-9])(?:\/(202[5-9]))?\b/);
  if (slashMatch) {
    const day = String(Number(slashMatch[1])).padStart(2, '0');
    const month = String(Number(slashMatch[2])).padStart(2, '0');
    const year = slashMatch[3] || new Date().getFullYear().toString();
    return `${year}-${month}-${day}`;
  }

  // 3. Fallback date or tomorrow
  if (fallbackDate) {
    return fallbackDate;
  }

  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

/**
 * Cleans the raw event string into a succinct title
 */
export function cleanEventTitle(text: string, subjectName: string): string {
  let cleaned = text
    .split('\n')[0]
    .trim()
    .replace(/^([0-9\/\-\:\s]+)/, '')
    .trim();

  if (cleaned.length > 70) {
    cleaned = cleaned.substring(0, 67) + '...';
  }

  if (!cleaned) {
    return `Atividade de ${subjectName}`;
  }

  return cleaned;
}

/**
 * Generates automated milestones or study sessions based on detected type
 */
export function generateAutomatedSessions(
  type: TaskType,
  subjectName: string,
  dueDateStr: string,
  groupMembers: string[] = []
): StudySession[] {
  if (type === 'teste') {
    // Automated study plan with 3 sessions avoiding handball times
    return generateStudyPlan(subjectName, dueDateStr, 3);
  }

  if (type === 'trabalho') {
    // Automated group project milestones
    const targetDate = new Date(dueDateStr);
    const steps = [
      'Etapa 1: Pesquisa inicial e divisão de tarefas',
      'Etapa 2: Elaboração dos conteúdos e redação',
      'Etapa 3: Revisão final e preparação da apresentação / slides',
    ];

    return steps.map((step, idx) => {
      const stepDate = new Date(targetDate);
      stepDate.setDate(targetDate.getDate() - (steps.length - idx) * 3);
      const isHandball = [1, 3, 5].includes(stepDate.getDay());
      return {
        id: `auto-group-${Date.now()}-${idx}`,
        date: formatLocalDate(stepDate),
        timeRange: isHandball ? '17:30 - 18:30 (Antes do Andebol)' : '18:00 - 19:15',
        topic: groupMembers.length > 0 ? `${step} (Equipa: ${groupMembers.join(', ')})` : step,
        completed: false,
      };
    });
  }

  // TPC: 1 preparation session before deadline
  const tpcDate = new Date(dueDateStr);
  tpcDate.setDate(tpcDate.getDate() - 1);
  return [
    {
      id: `auto-tpc-${Date.now()}`,
      date: formatLocalDate(tpcDate),
      timeRange: '17:30 - 18:15',
      topic: `Resolução dos exercícios e conferência no caderno de ${subjectName}`,
      completed: false,
    },
  ];
}

/**
 * Main function: Analyzes any calendar event input and returns a fully automated SchoolTask
 */
export function automateCalendarEvent(
  rawEventText: string,
  defaultDate?: string,
  academicYear = '2026/2027'
): SchoolTask {
  const { code: subjectCode, matchName: subjectName } = detectSubjectFromText(rawEventText);
  const { type, reason, confidence } = detectTypeFromText(rawEventText);
  const dueDate = extractDateFromText(rawEventText, defaultDate);
  const groupMembers = type === 'trabalho' ? extractGroupMembers(rawEventText) : undefined;
  const title = cleanEventTitle(rawEventText, subjectName);
  const studySessions = generateAutomatedSessions(type, subjectName, dueDate, groupMembers);

  return {
    id: `task-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    subjectCode,
    type,
    description: rawEventText.trim(),
    dueDate,
    academicYear,
    groupMembers: groupMembers && groupMembers.length > 0 ? groupMembers : undefined,
    studyPlanDaysBefore: type === 'teste' ? 5 : type === 'trabalho' ? 7 : undefined,
    studySessions,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Parses Google Calendar iCalendar (.ics) content and converts all events into SchoolTasks with full automation
 */
export function parseIcsToAutomatedTasks(
  icsText: string,
  academicYear = '2026/2027'
): SchoolTask[] {
  const tasks: SchoolTask[] = [];
  const eventBlocks = icsText.split(/BEGIN:VEVENT/i).slice(1);

  for (const block of eventBlocks) {
    const summaryMatch = block.match(/SUMMARY:(.+?)(?:\r?\n|$)/i);
    const descMatch = block.match(/DESCRIPTION:(.+?)(?:\r?\n[A-Z]|$)/is);
    const dtstartMatch = block.match(/DTSTART(?:;[^:]+)?:(\d{4})(\d{2})(\d{2})/i);

    const summary = summaryMatch ? summaryMatch[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').trim() : '';
    const description = descMatch ? descMatch[1].replace(/\\n/g, '\n').replace(/\\,/g, ',').trim() : '';
    const dateStr = dtstartMatch ? `${dtstartMatch[1]}-${dtstartMatch[2]}-${dtstartMatch[3]}` : undefined;

    // Ignore generic handball reminder events to avoid duplicating SLB schedule
    if (summary.toLowerCase().includes('andebol') || summary.toLowerCase().includes('pavilhão')) {
      continue;
    }

    const fullText = `${summary}\n${description}`.trim();
    if (fullText) {
      const task = automateCalendarEvent(fullText, dateStr, academicYear);
      tasks.push(task);
    }
  }

  return tasks;
}
