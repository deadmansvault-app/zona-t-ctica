import { SchoolTask, TaskType } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { generateStudyPlan } from './studyPlanner';

export interface ParsedTaskEntry {
  id: string;
  title: string;
  subjectCode: string; // e.g. "FG", "MAT", "HIST"
  subjectName?: string;
  type: TaskType;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  timeRange?: string; // "08:15-09:05"
  teacher?: string;
  selected?: boolean;
  isTwoHourBlock?: boolean; // Identified as 2-hour / 2-period test
  slotCount?: number; // Number of periods merged (e.g. 2)
  estimatedMinutes?: number; // Estimated duration in minutes (e.g. 100, 110)
}

// Map common subject names, acronyms, and teacher names to subject codes
const SUBJECT_ALIASES: Record<string, string> = {
  // Matemática
  'MAT': 'MAT',
  'MATEMATICA': 'MAT',
  'MATEMÁTICA': 'MAT',
  'MATH': 'MAT',
  'CLAUDIA MARTINHO': 'MAT',
  'CLÁUDIA MARTINHO': 'MAT',
  'CLAUDIA MARISA DE OLIVEIRA MARTINHO': 'MAT',
  'CLÁUDIA MARISA DE OLIVEIRA MARTINHO': 'MAT',

  // Português
  'POR': 'POR',
  'PORT': 'POR',
  'PORTUGUES': 'POR',
  'PORTUGUÊS': 'POR',
  'LINGUA PORTUGUESA': 'POR',
  'LÍNGUA PORTUGUESA': 'POR',
  'ELSA OLIVEIRA': 'POR',

  // Físico-Química (code in timetableData is FG)
  'FG': 'FG',
  'FQ': 'FG',
  'CFQ': 'FG',
  'FISICO-QUIMICA': 'FG',
  'FÍSICO-QUÍMICA': 'FG',
  'FISICO QUIMICA': 'FG',
  'FÍSICO QUÍMICA': 'FG',
  'FISICA E QUIMICA': 'FG',
  'FÍSICA E QUÍMICA': 'FG',
  'SANDRA LOPES': 'FG',
  'SANDRA CRISTINA FURTADO LOPES': 'FG',

  // História
  'HIST': 'HIST',
  'HISTORIA': 'HIST',
  'HISTÓRIA': 'HIST',
  'ALEXANDRA BRITO': 'HIST',
  'ALEXANDRA MARIA RODRIGUES BRITO': 'HIST',

  // Ciências Naturais
  'CN': 'CN',
  'CIENCIAS': 'CN',
  'CIÊNCIAS': 'CN',
  'CIENCIAS NATURAIS': 'CN',
  'CIÊNCIAS NATURAIS': 'CN',
  'ELVIRA CORCEIRO': 'CN',

  // Geografia
  'GEO': 'GEO',
  'GEOGRAFIA': 'GEO',
  'MARGARIDA DIAS': 'GEO',

  // Inglês
  'ING': 'ING',
  'INGLES': 'ING',
  'INGLÊS': 'ING',
  'ENGLISH': 'ING',
  'ANA PAULA DIAS': 'ING',

  // Francês
  'FRA': 'FRA',
  'FRAN': 'FRA',
  'FRANCES': 'FRA',
  'FRANCÊS': 'FRA',
  'FRANÇAIS': 'FRA',
  'ANABELA ROMBA': 'FRA',

  // Educação Física
  'EF': 'EF',
  'EDUCACAO FISICA': 'EF',
  'EDUCAÇÃO FÍSICA': 'EF',
  'ED. FISICA': 'EF',
  'ED. FÍSICA': 'EF',
  'ANA VICENTE': 'EF',

  // Educação Visual
  'EV': 'EV',
  'EDUCACAO VISUAL': 'EV',
  'EDUCAÇÃO VISUAL': 'EV',
  'ED. VISUAL': 'EV',

  // TIC
  'TIC': 'TIC',
  'TECNOLOGIAS': 'TIC',
  'INFORMATICA': 'TIC',
  'INFORMÁTICA': 'TIC',

  // Cidadania
  'CD': 'CD',
  'CIDADANIA': 'CD',
  'CIDADANIA E DESENVOLVIMENTO': 'CD',
};

const MONTH_NAMES_PT: Record<string, string> = {
  'janeiro': '01',
  'jan': '01',
  'fevereiro': '02',
  'fev': '02',
  'marco': '03',
  'março': '03',
  'mar': '03',
  'abril': '04',
  'abr': '04',
  'maio': '05',
  'mai': '05',
  'junho': '06',
  'jun': '06',
  'julho': '07',
  'jul': '07',
  'agosto': '08',
  'ago': '08',
  'setembro': '09',
  'set': '09',
  'outubro': '10',
  'out': '10',
  'novembro': '11',
  'nov': '11',
  'dezembro': '12',
  'dez': '12',
};

/**
 * Normalizes text for matching by removing accents and lowercasing.
 */
function normalizeForMatching(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Detects the subject code from raw text snippet or teacher name.
 */
export function detectSubject(text: string): string {
  const norm = normalizeForMatching(text);

  // 1. Direct check against aliases
  for (const [alias, code] of Object.entries(SUBJECT_ALIASES)) {
    const normAlias = normalizeForMatching(alias);
    // Use word boundary check or inclusion
    const regex = new RegExp(`(^|[^A-Z0-9])${normAlias}([^A-Z0-9]|$)`, 'i');
    if (regex.test(norm)) {
      return code;
    }
  }

  // 2. Check SUBJECTS official list
  for (const [code, info] of Object.entries(SUBJECTS)) {
    if (norm.includes(code)) return code;
    if (norm.includes(normalizeForMatching(info.name))) return code;
    if (info.teacher && norm.includes(normalizeForMatching(info.teacher))) return code;
  }

  return 'MAT'; // Fallback
}

/**
 * Detects the task type from raw text.
 */
export function detectTaskType(text: string, defaultType: TaskType = 'tpc'): TaskType {
  const norm = normalizeForMatching(text);

  if (
    norm.includes('TESTE') ||
    norm.includes('AVALIACAO') ||
    norm.includes('SUMATIVA') ||
    norm.includes('EXAME') ||
    norm.includes('MINITESTE') ||
    norm.includes('PROVA')
  ) {
    return 'teste';
  }

  if (
    norm.includes('TRABALHO') ||
    norm.includes('PROJETO') ||
    norm.includes('PROJECTO') ||
    norm.includes('GRUPO') ||
    norm.includes('APRESENTACAO') ||
    norm.includes('SLIDES') ||
    norm.includes('RELATORIO')
  ) {
    return 'trabalho';
  }

  if (
    norm.includes('TPC') ||
    norm.includes('DEVER') ||
    norm.includes('EXERCICIO') ||
    norm.includes('EXERCICIOS') ||
    norm.includes('FICHA') ||
    norm.includes('PAGINA') ||
    norm.includes('PAG.')
  ) {
    return 'tpc';
  }

  if (
    norm.includes('VISITA') ||
    norm.includes('PALESTRA') ||
    norm.includes('REUNIAO') ||
    norm.includes('ATIVIDADE')
  ) {
    return 'outro';
  }

  return defaultType;
}

/**
 * Extracts a date from a text line and converts to YYYY-MM-DD.
 */
export function extractDate(line: string, defaultYear = '2027'): { dateStr: string; rawMatch: string } | null {
  // Pattern 1: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = line.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0');
    const month = String(dmyMatch[2]).padStart(2, '0');
    const year = dmyMatch[3];
    return {
      dateStr: `${year}-${month}-${day}`,
      rawMatch: dmyMatch[0],
    };
  }

  // Pattern 2: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = line.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = String(ymdMatch[2]).padStart(2, '0');
    const day = String(ymdMatch[3]).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
      rawMatch: ymdMatch[0],
    };
  }

  // Pattern 3: DD de Mês (de YYYY)?
  const ptDateMatch = line.match(/\b(\d{1,2})\s+de\s+([a-zA-ZçÇ]+)(?:\s+de\s+(\d{4}))?\b/i);
  if (ptDateMatch) {
    const day = String(ptDateMatch[1]).padStart(2, '0');
    const monthName = ptDateMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const month = MONTH_NAMES_PT[monthName];
    if (month) {
      const year = ptDateMatch[3] || defaultYear;
      return {
        dateStr: `${year}-${month}-${day}`,
        rawMatch: ptDateMatch[0],
      };
    }
  }

  // Pattern 4: DD-MM or DD/MM (assume defaultYear)
  const dmMatch = line.match(/\b(\d{1,2})[-/](\d{1,2})\b/);
  if (dmMatch) {
    const day = String(dmMatch[1]).padStart(2, '0');
    const month = String(dmMatch[2]).padStart(2, '0');
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return {
        dateStr: `${defaultYear}-${month}-${day}`,
        rawMatch: dmMatch[0],
      };
    }
  }

  return null;
}

/**
 * Extracts a time range or time from a text line (e.g. "(08:15-09:05)", "08:15-09:05", "10:25").
 */
export function extractTime(line: string): { dueTime?: string; timeRange?: string; rawMatch?: string } {
  // Range: (08:15-09:05) or 08:15 - 09:05 or 08:15 às 09:05
  const rangeMatch = line.match(/\(?(\d{1,2}:\d{2})\s*(?:[-–—]|(?:às|as|a))\s*(\d{1,2}:\d{2})\)?/i);
  if (rangeMatch) {
    const start = rangeMatch[1];
    const end = rangeMatch[2];
    return {
      dueTime: start,
      timeRange: `${start} - ${end}`,
      rawMatch: rangeMatch[0],
    };
  }

  // Single time: às 14:30 or (14:30) or 14:30
  const singleMatch = line.match(/(?:às|as)?\s*\(?(\d{1,2}:\d{2})\)?/i);
  if (singleMatch) {
    return {
      dueTime: singleMatch[1],
      timeRange: singleMatch[1],
      rawMatch: singleMatch[0],
    };
  }

  return {};
}

/**
 * Cleans the title and extracts clean title and teacher.
 */
function extractTitleAndTeacher(
  line: string,
  subjectCode: string,
  type: TaskType,
  timeRange?: string
): { cleanTitleText: string; detectedTeacher?: string } {
  // If line has tab separation
  const tabColumns = line.split(/[\t]+/).map((col) => col.trim()).filter(Boolean);

  let candidateTitle = '';
  let candidateTeacher = '';

  if (tabColumns.length >= 2) {
    // Column 0 is usually date/time, Column 1 is "Teste de X, Teacher", Column 2 is "Teacher"
    const contentCol = tabColumns[1];
    if (tabColumns.length > 2) {
      candidateTeacher = tabColumns[2];
    }

    if (contentCol.includes(',')) {
      const commaParts = contentCol.split(',');
      candidateTitle = commaParts[0].trim();
      if (!candidateTeacher && commaParts.length > 1) {
        candidateTeacher = commaParts.slice(1).join(',').trim();
      }
    } else {
      candidateTitle = contentCol;
    }
  } else {
    // Single line without tabs: strip date and time patterns
    let stripped = line
      .replace(/\b\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?\b/g, '')
      .replace(/\(?\d{1,2}:\d{2}\s*[-–—aàs]*\s*\d{1,2}:\d{2}\)?/gi, '')
      .replace(/\(?\d{1,2}:\d{2}\)?/g, '')
      .replace(/^[-–,\s]+|[-–,\s]+$/g, '')
      .trim();

    if (stripped.includes(',')) {
      const commaParts = stripped.split(',');
      candidateTitle = commaParts[0].trim();
      candidateTeacher = commaParts.slice(1).join(',').trim();
    } else {
      candidateTitle = stripped;
    }
  }

  // Remove redundant punctuation and extra spaces
  candidateTitle = candidateTitle.replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();

  // If candidateTitle is too generic or empty, create a clean default
  const sub = SUBJECTS[subjectCode];
  if (!candidateTitle || candidateTitle.length < 3) {
    const subName = sub?.name || subjectCode;
    const typeLabel = type === 'teste' ? 'Teste' : type === 'trabalho' ? 'Trabalho' : type === 'tpc' ? 'TPC' : 'Atividade';
    candidateTitle = `${typeLabel} de ${subName}`;
  }

  return {
    cleanTitleText: candidateTitle,
    detectedTeacher: candidateTeacher || sub?.teacher,
  };
}

/**
 * Converts a time string "HH:mm" to total minutes from midnight.
 */
export function parseTimeToMinutes(t?: string): number | null {
  if (!t) return null;
  const match = t.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Extracts start and end minutes from a timeRange string, e.g. "08:15-09:05" or "08:15 - 09:05".
 */
export function parseTimeRangeLimits(timeRange?: string): {
  startMinutes: number;
  endMinutes: number;
  startStr: string;
  endStr: string;
} | null {
  if (!timeRange) return null;
  const match = timeRange.match(/(\d{1,2}:\d{2})\s*(?:[-–—]|(?:às|as|a))\s*(\d{1,2}:\d{2})/i);
  if (!match) return null;
  const startMinutes = parseTimeToMinutes(match[1]);
  const endMinutes = parseTimeToMinutes(match[2]);
  if (startMinutes === null || endMinutes === null) return null;
  return {
    startMinutes,
    endMinutes,
    startStr: match[1],
    endStr: match[2],
  };
}

/**
 * Checks whether two entries are consecutive periods/blocks of the same test on the same day.
 */
export function areConsecutiveTestEntries(
  a: ParsedTaskEntry,
  b: ParsedTaskEntry
): boolean {
  // Must be same date
  if (a.dueDate !== b.dueDate) return false;

  // Must be same subject
  if (a.subjectCode !== b.subjectCode) return false;

  // Must both be tests (or evaluation lines)
  const isTestA = a.type === 'teste' || a.title.toLowerCase().includes('teste');
  const isTestB = b.type === 'teste' || b.title.toLowerCase().includes('teste');
  if (!isTestA && !isTestB) return false;

  // Time-based check
  const limitsA = parseTimeRangeLimits(a.timeRange);
  const limitsB = parseTimeRangeLimits(b.timeRange);

  if (limitsA && limitsB) {
    const first = limitsA.startMinutes <= limitsB.startMinutes ? limitsA : limitsB;
    const second = limitsA.startMinutes <= limitsB.startMinutes ? limitsB : limitsA;

    // In Portuguese schools, consecutive periods typically have 0 to 25 mins interval between them
    // (e.g. 09:05 -> 09:15 is a 10 min break, or 10:25-11:15 & 11:25-12:15 is a 10 min break)
    const gap = second.startMinutes - first.endMinutes;
    const startDifference = second.startMinutes - first.startMinutes;

    if ((gap >= -5 && gap <= 30) || (startDifference >= 40 && startDifference <= 110)) {
      return true;
    }
  }

  // If timeRange is missing or only single times exist
  const minA = parseTimeToMinutes(a.dueTime);
  const minB = parseTimeToMinutes(b.dueTime);
  if (minA !== null && minB !== null) {
    const diff = Math.abs(minA - minB);
    if (diff >= 40 && diff <= 110) {
      return true;
    }
  }

  // Fallback: If both entries are identical tests on the exact same day
  // (In Portuguese schools, students never have two separate tests of the same subject on the same day)
  const normTitleA = a.title.toLowerCase().replace(/[^a-z]/g, '');
  const normTitleB = b.title.toLowerCase().replace(/[^a-z]/g, '');
  if (normTitleA === normTitleB || (normTitleA.includes('teste') && normTitleB.includes('teste'))) {
    return true;
  }

  return false;
}

/**
 * Detects consecutive/multi-line test periods (e.g. 2 hours / 2 tempos) and merges
 * them into a single consolidated test entry with accurate total duration.
 */
export function mergeConsecutiveTestEntries(entries: ParsedTaskEntry[]): ParsedTaskEntry[] {
  if (entries.length <= 1) return entries;

  const merged: ParsedTaskEntry[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    if (visited.has(current.id)) continue;

    // Look for matching consecutive entries with current
    const matchingIndices: number[] = [i];

    for (let j = i + 1; j < entries.length; j++) {
      const candidate = entries[j];
      if (visited.has(candidate.id)) continue;

      if (areConsecutiveTestEntries(current, candidate)) {
        matchingIndices.push(j);
      }
    }

    if (matchingIndices.length > 1) {
      // 2-hour (or multi-tempo) test found in multiple lines!
      const matchingEntries = matchingIndices.map((idx) => entries[idx]);
      matchingIndices.forEach((idx) => visited.add(entries[idx].id));

      // Sort matching entries chronologically
      matchingEntries.sort((a, b) => {
        const timeA = parseTimeToMinutes(a.dueTime) ?? parseTimeRangeLimits(a.timeRange)?.startMinutes ?? 0;
        const timeB = parseTimeToMinutes(b.dueTime) ?? parseTimeRangeLimits(b.timeRange)?.startMinutes ?? 0;
        return timeA - timeB;
      });

      const first = matchingEntries[0];
      const last = matchingEntries[matchingEntries.length - 1];

      const limitsFirst = parseTimeRangeLimits(first.timeRange);
      const limitsLast = parseTimeRangeLimits(last.timeRange);

      let finalTimeRange = first.timeRange;
      let finalDueTime = first.dueTime;
      let totalMinutes = matchingEntries.length * 50;

      if (limitsFirst && limitsLast) {
        finalTimeRange = `${limitsFirst.startStr} - ${limitsLast.endStr} (2 tempos / 2h)`;
        finalDueTime = limitsFirst.startStr;
        totalMinutes = limitsLast.endMinutes - limitsFirst.startMinutes;
      } else if (limitsFirst) {
        finalTimeRange = `${limitsFirst.startStr} - ${limitsFirst.endStr} (2 tempos / 2h)`;
        finalDueTime = limitsFirst.startStr;
      } else if (first.dueTime && last.dueTime) {
        finalTimeRange = `${first.dueTime} - ${last.dueTime} (2 tempos / 2h)`;
        finalDueTime = first.dueTime;
      } else {
        finalTimeRange = '2 tempos (2 horas)';
      }

      // Format title cleanly
      let cleanTitle = first.title.trim().replace(/,\s*$/, '');
      if (
        !cleanTitle.toLowerCase().includes('2 tempos') &&
        !cleanTitle.toLowerCase().includes('2h') &&
        !cleanTitle.toLowerCase().includes('2 horas')
      ) {
        cleanTitle = `${cleanTitle} (2 tempos / 2h)`;
      }

      const teacher = matchingEntries.map((e) => e.teacher).find(Boolean) || first.teacher;

      // Consolidated description
      const descLines = matchingEntries.map((e) => e.description).filter(Boolean);
      const uniqueDescLines = Array.from(new Set(descLines));
      const consolidatedDesc = `Teste de 2 Tempos (2 Horas) • ${finalTimeRange}\nDocente: ${teacher || 'Não indicado'}\n${uniqueDescLines.join('\n')}`;

      merged.push({
        id: `merged-2h-${first.id}`,
        title: cleanTitle,
        subjectCode: first.subjectCode,
        subjectName: first.subjectName,
        type: 'teste',
        description: consolidatedDesc,
        dueDate: first.dueDate,
        dueTime: finalDueTime,
        timeRange: finalTimeRange,
        teacher,
        selected: true,
        isTwoHourBlock: true,
        slotCount: matchingEntries.length,
        estimatedMinutes: totalMinutes,
      });
    } else {
      visited.add(current.id);
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Main parser: takes any pasted text (multi-line, Inovar format, Teams format, natural language)
 * and extracts all entries. If multiple entries exist, returns all of them.
 */
export function parseTasksFromText(
  rawText: string,
  options?: {
    defaultType?: TaskType;
    academicYear?: string;
  }
): ParsedTaskEntry[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();
  const defaultType = options?.defaultType || 'tpc';
  const defaultYear = options?.academicYear ? options.academicYear.split('/')[1] || '2027' : '2027';

  const results: ParsedTaskEntry[] = [];

  // Split into candidate lines
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Check if line contains a date
    const dateInfo = extractDate(line, defaultYear);
    const timeInfo = extractTime(line);
    const subject = detectSubject(line);
    const taskType = detectTaskType(line, defaultType);

    if (dateInfo) {
      // Clean the line to form the title and description
      const { cleanTitleText, detectedTeacher } = extractTitleAndTeacher(line, subject, taskType, timeInfo.timeRange);
      const subInfo = SUBJECTS[subject];

      results.push({
        id: `parsed-${Date.now()}-${results.length}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitleText,
        subjectCode: subject,
        subjectName: subInfo?.name || subject,
        type: taskType,
        description: line,
        dueDate: dateInfo.dateStr,
        dueTime: timeInfo.dueTime,
        timeRange: timeInfo.timeRange,
        teacher: detectedTeacher || subInfo?.teacher,
        selected: true,
      });
    }
  }

  // If line-by-line parsing didn't find multiple items, but the text might have multiple dates inside a paragraph:
  if (results.length <= 1) {
    const dateRegex = /\b(\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{4})?)\b/g;
    const matches = Array.from(text.matchAll(dateRegex));

    if (matches.length > 1) {
      // We found multiple dates within a paragraph!
      const multiEntries: ParsedTaskEntry[] = [];

      for (let idx = 0; idx < matches.length; idx++) {
        const start = matches[idx].index || 0;
        const end = idx + 1 < matches.length ? matches[idx + 1].index || text.length : text.length;
        const chunk = text.slice(start, end).trim();

        const dateInfo = extractDate(chunk, defaultYear);
        if (dateInfo) {
          const timeInfo = extractTime(chunk);
          const subject = detectSubject(chunk);
          const taskType = detectTaskType(chunk, defaultType);
          const { cleanTitleText, detectedTeacher } = extractTitleAndTeacher(chunk, subject, taskType, timeInfo.timeRange);
          const subInfo = SUBJECTS[subject];

          multiEntries.push({
            id: `parsed-multi-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            title: cleanTitleText,
            subjectCode: subject,
            subjectName: subInfo?.name || subject,
            type: taskType,
            description: chunk,
            dueDate: dateInfo.dateStr,
            dueTime: timeInfo.dueTime,
            timeRange: timeInfo.timeRange,
            teacher: detectedTeacher || subInfo?.teacher,
            selected: true,
          });
        }
      }

      if (multiEntries.length > 1) {
        return mergeConsecutiveTestEntries(multiEntries);
      }
    }
  }

  // If no date was found at all, but text exists, return a single entry with tomorrow's date
  if (results.length === 0 && text.length > 0) {
    const subject = detectSubject(text);
    const taskType = detectTaskType(text, defaultType);
    const subInfo = SUBJECTS[subject];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + (taskType === 'teste' ? 7 : taskType === 'trabalho' ? 14 : 2));

    results.push({
      id: `parsed-single-${Date.now()}`,
      title: text.slice(0, 60).trim() || `${taskType.toUpperCase()} de ${subInfo?.name || subject}`,
      subjectCode: subject,
      subjectName: subInfo?.name || subject,
      type: taskType,
      description: text,
      dueDate: tomorrow.toISOString().split('T')[0],
      teacher: subInfo?.teacher,
      selected: true,
    });
  }

  return mergeConsecutiveTestEntries(results);
}

/**
 * Converts a ParsedTaskEntry into a complete SchoolTask object with study sessions and options.
 */
export function convertParsedEntryToSchoolTask(
  entry: ParsedTaskEntry,
  academicYear = '2026/2027'
): SchoolTask {
  let studySessions = undefined;
  const subInfo = SUBJECTS[entry.subjectCode];
  const subName = subInfo?.name || entry.subjectCode;

  if (entry.type === 'teste') {
    // Generate 4 study sessions for 2-hour tests, 3 for standard tests, protecting handball hours
    const sessionsCount = entry.isTwoHourBlock ? 4 : 3;
    studySessions = generateStudyPlan(subName, entry.dueDate, sessionsCount);
  } else if (entry.type === 'trabalho') {
    const dObj = new Date(entry.dueDate);
    const phases = [
      `Fase 1: Pesquisa de conteúdo e fontes (${subName})`,
      `Fase 2: Elaboração dos textos e estrutura de apresentação`,
      `Fase 3: Revisão final e ensaio`,
    ];
    studySessions = phases.map((phase, idx) => {
      const pDate = new Date(dObj);
      pDate.setDate(pDate.getDate() - (phases.length - idx) * 3);
      return {
        id: `session-group-${Date.now()}-${idx}`,
        date: pDate.toISOString().split('T')[0],
        timeRange: '17:30 - 18:30',
        topic: phase,
        completed: false,
      };
    });
  }

  // Format final description nicely
  let finalDesc = entry.description || '';
  if (entry.timeRange && !finalDesc.includes(entry.timeRange)) {
    finalDesc = `Horário: ${entry.timeRange}\n${finalDesc}`;
  }
  if (entry.teacher && !finalDesc.includes(entry.teacher)) {
    finalDesc = `${finalDesc}\nDocente: ${entry.teacher}`;
  }

  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: entry.title.trim(),
    subjectCode: entry.subjectCode,
    type: entry.type,
    description: finalDesc.trim(),
    dueDate: entry.dueDate,
    dueTime: entry.dueTime,
    timeRange: entry.timeRange,
    teacher: entry.teacher,
    isTwoHourBlock: entry.isTwoHourBlock,
    slotCount: entry.slotCount || (entry.isTwoHourBlock ? 2 : 1),
    estimatedMinutes: entry.estimatedMinutes || (entry.isTwoHourBlock ? 100 : 50),
    studyPlanDaysBefore: entry.type === 'teste' ? (entry.isTwoHourBlock ? 6 : 5) : entry.type === 'trabalho' ? 7 : undefined,
    studySessions,
    academicYear,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Parses tasks trying server-side AI first, and seamlessly falling back to local deterministic parsing.
 */
export async function parseTasksWithAi(
  rawText: string,
  options?: {
    defaultType?: TaskType;
    academicYear?: string;
  }
): Promise<ParsedTaskEntry[]> {
  const localResults = parseTasksFromText(rawText, options);

  // If local parsing already found multiple structured entries with dates (like the user's example),
  // local results are 100% accurate, instantaneous, and deterministic!
  if (localResults.length > 1) {
    return localResults;
  }

  // Otherwise, try calling the server AI endpoint for fuzzy/unstructured extraction
  try {
    const response = await fetch('/api/ai/parse-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: rawText,
        defaultYear: options?.academicYear || '2026/2027',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        const rawAiTasks = data.tasks.map((t: any, idx: number) => ({
          id: `ai-parsed-${Date.now()}-${idx}`,
          title: t.title || 'Evento Escolar',
          subjectCode: t.subjectCode || 'MAT',
          subjectName: SUBJECTS[t.subjectCode]?.name || t.subjectCode,
          type: (t.type as TaskType) || options?.defaultType || 'teste',
          description: t.description || rawText,
          dueDate: t.dueDate,
          dueTime: t.dueTime,
          timeRange: t.timeRange,
          teacher: t.teacher || SUBJECTS[t.subjectCode]?.teacher,
          isTwoHourBlock: t.isTwoHourBlock,
          slotCount: t.slotCount,
          selected: true,
        }));
        return mergeConsecutiveTestEntries(rawAiTasks);
      }
    }
  } catch (err) {
    console.warn('AI endpoint unavailable, using local parser:', err);
  }

  return localResults;
}
