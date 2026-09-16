import { SchoolTask } from '../types';
import { SUBJECTS } from '../data/timetableData';
import { automateCalendarEvent } from './calendarAutomation';

export const DEFAULT_GOOGLE_CALENDAR_ID =
  '3fad003f0a2cb499176386bd47c51340ea4add46ea5d16693a2075cedb33a1b0@group.calendar.google.com';

export interface GoogleCalendarApiEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start?: {
    date?: string; // YYYY-MM-DD for all-day events
    dateTime?: string; // ISO 8601 string
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  created?: string;
  updated?: string;
}

export interface SyncResult {
  success: boolean;
  totalFetched: number;
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  mergedTasks: SchoolTask[];
  error?: string;
}

/**
 * Fetches all events from the specified Google Calendar ID using the OAuth access token.
 */
export async function fetchGoogleCalendarEvents(
  calendarId: string,
  accessToken: string,
  timeMin?: string
): Promise<GoogleCalendarApiEvent[]> {
  const targetId = calendarId.trim() || DEFAULT_GOOGLE_CALENDAR_ID;
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetId)}/events`
  );

  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  if (timeMin) {
    url.searchParams.set('timeMin', timeMin);
  } else {
    // Default to start of September 2026 for academic year sync
    url.searchParams.set('timeMin', '2026-09-01T00:00:00Z');
  }

  url.searchParams.set('maxResults', '250');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || response.statusText;
    } catch {
      errorDetail = `Código HTTP ${response.status}`;
    }
    throw new Error(`Erro ao aceder ao Google Calendar: ${errorDetail}`);
  }

  const data = await response.json();
  return (data.items || []) as GoogleCalendarApiEvent[];
}

/**
 * Extracts date (YYYY-MM-DD) and optional time (HH:mm) from a Google Calendar event.
 */
export function extractDateFromGoogleEvent(event: GoogleCalendarApiEvent): {
  dateStr: string;
  timeStr?: string;
} {
  if (event.start?.date) {
    return { dateStr: event.start.date };
  }
  if (event.start?.dateTime) {
    const dt = new Date(event.start.dateTime);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      const hours = String(dt.getHours()).padStart(2, '0');
      const minutes = String(dt.getMinutes()).padStart(2, '0');
      return {
        dateStr: `${y}-${m}-${d}`,
        timeStr: `${hours}:${minutes}`,
      };
    }
  }
  // Fallback to today
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return { dateStr: `${y}-${m}-${d}` };
}

/**
 * Syncs events from Google Calendar into the application's task list.
 * Automatically runs the classification engine (detecting Teste, TPC, Trabalho de Grupo),
 * generates study sessions avoiding handball, and links by googleCalendarEventId.
 */
export async function syncGoogleCalendarToTasks(
  calendarId: string,
  accessToken: string,
  existingTasks: SchoolTask[],
  academicYear: string
): Promise<SyncResult> {
  try {
    const events = await fetchGoogleCalendarEvents(calendarId, accessToken);
    const validEvents = events.filter((e) => e.status !== 'cancelled' && (e.summary || e.description));

    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    const taskMap = new Map<string, SchoolTask>();
    existingTasks.forEach((t) => {
      taskMap.set(t.id, { ...t });
    });

    for (const event of validEvents) {
      const { dateStr, timeStr } = extractDateFromGoogleEvent(event);
      const fullText = [event.summary || '', event.description || '', event.location || '']
        .filter(Boolean)
        .join(' - ');

      // Check if a task already exists with this Google Event ID
      let existingByGId = Array.from(taskMap.values()).find(
        (t) => t.googleCalendarEventId === event.id
      );

      // If not found by ID, check if there is an existing task on same day with same subject / title similarity
      if (!existingByGId) {
        const autoPreview = automateCalendarEvent(fullText, dateStr, academicYear);
        existingByGId = Array.from(taskMap.values()).find(
          (t) =>
            t.dueDate === dateStr &&
            (t.title.toLowerCase().trim() === autoPreview.title.toLowerCase().trim() ||
              (t.subjectCode === autoPreview.subjectCode &&
                t.title.toLowerCase().includes(autoPreview.title.toLowerCase())))
        );
      }

      if (existingByGId) {
        // Update existing task if due date or title changed in Google Calendar
        const needsUpdate =
          existingByGId.dueDate !== dateStr ||
          existingByGId.googleCalendarEventId !== event.id;

        if (needsUpdate) {
          const updated: SchoolTask = {
            ...existingByGId,
            dueDate: dateStr,
            dueTime: timeStr || existingByGId.dueTime,
            googleCalendarEventId: event.id,
            googleCalendarSyncedAt: new Date().toISOString(),
          };
          taskMap.set(updated.id, updated);
          updatedCount++;
        } else {
          // Just update sync timestamp and ID if missing
          if (!existingByGId.googleCalendarEventId) {
            const updated: SchoolTask = {
              ...existingByGId,
              googleCalendarEventId: event.id,
              googleCalendarSyncedAt: new Date().toISOString(),
            };
            taskMap.set(updated.id, updated);
            updatedCount++;
          } else {
            unchangedCount++;
          }
        }
      } else {
        // Create new automated task with full study planning
        const automated = automateCalendarEvent(fullText, dateStr, academicYear);
        const newTask: SchoolTask = {
          ...automated,
          id: `gcal-${event.id.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now().toString(36)}`,
          dueTime: timeStr,
          googleCalendarEventId: event.id,
          googleCalendarSyncedAt: new Date().toISOString(),
          createdAt: event.created || new Date().toISOString(),
        };

        taskMap.set(newTask.id, newTask);
        createdCount++;
      }
    }

    const mergedTasks = Array.from(taskMap.values()).sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    return {
      success: true,
      totalFetched: validEvents.length,
      createdCount,
      updatedCount,
      unchangedCount,
      mergedTasks,
    };
  } catch (error: any) {
    return {
      success: false,
      totalFetched: 0,
      createdCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      mergedTasks: existingTasks,
      error: error?.message || 'Falha ao sincronizar com o Google Calendar.',
    };
  }
}

/**
 * Pushes a local task to Google Calendar.
 * MANDATORY: Call this only after explicit user confirmation in UI!
 */
export async function pushTaskToGoogleCalendar(
  calendarId: string,
  accessToken: string,
  task: SchoolTask,
  schoolName = 'Escola Básica António Gedeão'
): Promise<{ eventId: string; htmlLink?: string }> {
  const targetId = calendarId.trim() || DEFAULT_GOOGLE_CALENDAR_ID;
  const subject = SUBJECTS[task.subjectCode]?.name || task.subjectCode;
  const typeLabel =
    task.type === 'teste' ? 'TESTE' : task.type === 'trabalho' ? 'TRABALHO' : 'TPC';

  const summary = `[${task.subjectCode}] ${typeLabel}: ${task.title}`;
  const descriptionParts = [
    `Disciplina: ${subject} (${task.subjectCode})`,
    `Descrição: ${task.description}`,
  ];
  if (task.groupMembers && task.groupMembers.length > 0) {
    descriptionParts.push(`Equipa: ${task.groupMembers.join(', ')}`);
  }
  if (task.studySessions && task.studySessions.length > 0) {
    descriptionParts.push(`\nSessões de Estudo Planeadas:`);
    task.studySessions.forEach((s) => {
      descriptionParts.push(`- ${s.date} (${s.timeRange}): ${s.topic}`);
    });
  }
  descriptionParts.push(`\nFoco Escolar - 9º B`);

  const description = descriptionParts.join('\n');

  let start: { date?: string; dateTime?: string };
  let end: { date?: string; dateTime?: string };

  if (task.dueTime) {
    const startIso = `${task.dueDate}T${task.dueTime}:00`;
    const [h, m] = task.dueTime.split(':').map(Number);
    const endH = String(Math.min(23, h + 1)).padStart(2, '0');
    const endIso = `${task.dueDate}T${endH}:${String(m).padStart(2, '0')}:00`;
    start = { dateTime: new Date(startIso).toISOString() };
    end = { dateTime: new Date(endIso).toISOString() };
  } else {
    // All day event: start is the date, end is next day in Google Calendar
    const [y, m, d] = task.dueDate.split('-').map(Number);
    const nextDate = new Date(y, m - 1, d + 1);
    const ny = nextDate.getFullYear();
    const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nd = String(nextDate.getDate()).padStart(2, '0');

    start = { date: task.dueDate };
    end = { date: `${ny}-${nm}-${nd}` };
  }

  const payload: Record<string, any> = {
    summary,
    description,
    location: schoolName,
    start,
    end,
  };

  const isUpdate = Boolean(task.googleCalendarEventId);
  const endpoint = isUpdate
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetId)}/events/${encodeURIComponent(task.googleCalendarEventId!)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetId)}/events`;

  const response = await fetch(endpoint, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = '';
    try {
      const err = await response.json();
      msg = err.error?.message || response.statusText;
    } catch {
      msg = `Status ${response.status}`;
    }
    throw new Error(`Falha ao guardar no Google Calendar: ${msg}`);
  }

  const result = await response.json();
  return {
    eventId: result.id,
    htmlLink: result.htmlLink,
  };
}
