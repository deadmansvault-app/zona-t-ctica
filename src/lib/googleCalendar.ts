import { SchoolTask, ScheduleItem, AppSettings } from '../types';
import { SUBJECTS, TIME_SLOTS, HANDBALL_TRAINING } from '../data/timetableData';

interface GoogleEventOptions {
  title: string;
  details?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

/**
 * Format Date into Google Calendar URL format (YYYYMMDDTHHmm00Z or YYYYMMDD)
 */
function formatGoogleDate(dateStr: string, timeStr?: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  if (!timeStr) {
    return cleanDate;
  }
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Builds an official Google Calendar Web Intent URL
 * Clicking this URL opens Google Calendar with the event pre-filled!
 */
export function createGoogleCalendarUrl(options: GoogleEventOptions): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

  const startFormatted = formatGoogleDate(options.startDate, options.startTime);
  // Default end time + 1 hour if startTime exists, or next day for all-day events
  let endFormatted = startFormatted;

  if (options.startTime) {
    if (options.endTime) {
      endFormatted = formatGoogleDate(options.endDate || options.startDate, options.endTime);
    } else {
      const [h, m] = options.startTime.split(':').map(Number);
      const nextH = String(Math.min(23, h + 1)).padStart(2, '0');
      endFormatted = formatGoogleDate(options.endDate || options.startDate, `${nextH}:${String(m).padStart(2, '0')}`);
    }
  } else {
    // All-day event in Google Calendar requires end date to be the next day
    const [y, m, d] = options.startDate.split('-').map(Number);
    const nextDate = new Date(y, m - 1, d + 1);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextD = String(nextDate.getDate()).padStart(2, '0');
    endFormatted = `${nextY}${nextM}${nextD}`;
  }

  const params = new URLSearchParams({
    text: options.title,
    dates: `${startFormatted}/${endFormatted}`,
  });

  if (options.details) {
    params.set('details', options.details);
  }
  if (options.location) {
    params.set('location', options.location);
  }

  return `${baseUrl}&${params.toString()}`;
}

/**
 * Creates Google Calendar URL directly from a SchoolTask
 */
export function getTaskGoogleCalendarUrl(task: SchoolTask, schoolName = 'Escola Básica António Gedeão'): string {
  const subject = SUBJECTS[task.subjectCode]?.name || task.subjectCode;
  const teacher = SUBJECTS[task.subjectCode]?.teacher || '';
  const typeLabel = task.type === 'teste' ? '📝 TESTE' : task.type === 'trabalho' ? '👥 TRABALHO' : '📖 TPC';

  const title = `[${task.subjectCode}] ${typeLabel}: ${task.title}`;
  const details = [
    `Disciplina: ${subject} (${task.subjectCode})`,
    teacher ? `Professor(a): ${teacher}` : '',
    `Descrição: ${task.description}`,
    task.studySessions?.length ? `\nSessões de Estudo Planeadas:\n` + task.studySessions.map(s => `- ${s.date} (${s.timeRange}): ${s.topic}`).join('\n') : '',
    `\nZona de Treino`,
  ].filter(Boolean).join('\n');

  return createGoogleCalendarUrl({
    title,
    details,
    location: schoolName,
    startDate: task.dueDate,
    startTime: task.dueTime,
  });
}

/**
 * Generates an iCalendar (.ics) string with all tasks, tests, handball, and timetable slots.
 * This can be imported into Google Calendar, Android, iPhone, Outlook, etc.
 */
export function generateIcsCalendar(
  tasks: SchoolTask[],
  schedule: ScheduleItem[],
  settings: AppSettings
): string {
  const schoolName = settings.schoolName || 'Escola Básica António Gedeão';
  const studentName = settings.studentName || 'Francisco';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zona de Treino//Agenda Escolar//PT',
    `X-WR-CALNAME:Zona de Treino - ${studentName}`,
    'X-WR-TIMEZONE:Europe/Lisbon',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  // Helper to format ISO date to ICS format (YYYYMMDDTHHmm00)
  const formatIcsDate = (dateStr: string, timeStr?: string) => {
    const cleanDate = dateStr.replace(/-/g, '');
    if (!timeStr) {
      return { value: cleanDate, isDateOnly: true };
    }
    const cleanTime = timeStr.replace(/:/g, '') + '00';
    return { value: `${cleanDate}T${cleanTime}`, isDateOnly: false };
  };

  // Add tasks
  tasks.forEach((task) => {
    const subject = SUBJECTS[task.subjectCode]?.name || task.subjectCode;
    const typeLabel = task.type === 'teste' ? 'TESTE' : task.type === 'trabalho' ? 'TRABALHO' : 'TPC';
    const uid = `task-${task.id}@focoescolar.local`;
    const dt = formatIcsDate(task.dueDate, task.dueTime);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    if (dt.isDateOnly) {
      lines.push(`DTSTART;VALUE=DATE:${dt.value}`);
    } else {
      lines.push(`DTSTART:${dt.value}`);
    }
    lines.push(`SUMMARY:[${task.subjectCode}] ${typeLabel}: ${escapeIcs(task.title)}`);
    lines.push(`DESCRIPTION:${escapeIcs(`Disciplina: ${subject}\\n${task.description}`)}`);
    lines.push(`LOCATION:${escapeIcs(schoolName)}`);
    if (task.type === 'teste') {
      lines.push('PRIORITY:1');
    }
    lines.push('END:VEVENT');

    // Add study sessions as distinct events
    if (task.studySessions) {
      task.studySessions.forEach((session) => {
        const [startTime, endTime] = session.timeRange.split(' - ').map((s) => s.trim());
        const sDt = formatIcsDate(session.date, startTime);
        const sEnd = formatIcsDate(session.date, endTime);

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:session-${session.id}@focoescolar.local`);
        lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
        lines.push(`DTSTART:${sDt.value}`);
        lines.push(`DTEND:${sEnd.value}`);
        lines.push(`SUMMARY:Estudo: ${escapeIcs(task.subjectCode)} - ${escapeIcs(session.topic)}`);
        lines.push(`DESCRIPTION:${escapeIcs(`Preparação para ${task.title}\\nMeta: ${session.topic}`)}`);
        lines.push('END:VEVENT');
      });
    }
  });

  // Add Handball Training as recurring weekly event
  lines.push('BEGIN:VEVENT');
  lines.push('UID:andebol-treino-slb@focoescolar.local');
  lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
  lines.push('DTSTART:20260907T200000');
  lines.push('DTEND:20260907T220000');
  lines.push('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR');
  lines.push('SUMMARY:🤾 Treino de Andebol');
  lines.push('DESCRIPTION:Treino no Pavilhão (Segundas, Quartas e Sextas das 20h00 às 22h00)');
  lines.push('LOCATION:Pavilhão Desportivo');
  lines.push('END:VEVENT');

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeIcs(str: string): string {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Triggers browser download of an .ics calendar file
 */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Direct helper to export all tasks to .ics file and trigger download
 */
export function exportAllToIcs(tasks: SchoolTask[], schoolName = 'Escola Básica António Gedeão'): void {
  const dummySettings: AppSettings = {
    studentName: 'Francisco',
    studentClass: '9º B',
    schoolName,
    academicYear: '2026/2027',
    greenDaysThreshold: 5,
    yellowDaysThreshold: 3,
    parentPin: '290912',
    favoriteTeam: 'SLB',
    allowedEmails: [],
    availableAcademicYears: ['2026/2027', '2027/2028'],
  };
  const ics = generateIcsCalendar(tasks, [], dummySettings);
  downloadIcsFile('zona_de_treino_calendario.ics', ics);
}

/**
 * Returns Google Calendar web template URL for Handball training
 */
export function getHandballGoogleCalendarUrl(): string {
  return createGoogleCalendarUrl({
    title: '🤾 Treino de Andebol',
    details: 'Treino de Andebol - Pavilhão Desportivo. Segundas, Quartas e Sextas das 20h00 às 22h00.',
    location: 'Pavilhão Desportivo',
    startDate: '2026-09-07',
    startTime: '20:00',
    endTime: '22:00',
  });
}
