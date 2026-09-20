export type TaskType = 'tpc' | 'teste' | 'trabalho' | 'mochila' | 'outro';

export type AlertColor = 'verde' | 'amarelo' | 'vermelho';

export interface CheckInRecord {
  id: string;
  taskId: string;
  timestamp: string; // ISO string
  photoDataUrl: string; // Base64 data URL
  notes?: string;
  confirmedBy: 'filho' | 'pais';
}

export interface CheckInAlert {
  id: string;
  taskId: string;
  taskTitle: string;
  subjectCode: string;
  taskType: TaskType;
  message: string;
  timestamp: string; // ISO string
  authorName?: string;
  photoDataUrl?: string;
  read?: boolean;
}

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  timeRange: string; // e.g. "18:00 - 18:45"
  topic: string;
  completed: boolean;
  checkInId?: string;
}

export interface SchoolTask {
  id: string;
  title: string;
  subjectCode: string; // e.g. "MAT", "CN"
  type: TaskType;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  studyPlanDaysBefore?: number;
  studySessions?: StudySession[];
  checkIn?: CheckInRecord;
  academicYear?: string; // e.g. "2026/2027"
  createdAt: string;
}

export interface SubjectInfo {
  code: string;
  name: string;
  teacher: string;
  color: string; // Tailwind color or hex
  icon?: string;
  backpackItems: string[];
}

export interface TimetableSlot {
  timeIndex: number;
  timeRange: string; // "08:15-09:05"
  startTime: string; // "08:15"
  endTime: string; // "09:05"
}

export interface ScheduleItem {
  id: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5; // 1 = Segunda, 5 = Sexta
  timeIndex: number;
  subjectCode: string;
  room: string;
  academicYear?: string; // e.g. "2026/2027"
  note?: string;
}

export interface AppSettings {
  greenDaysThreshold: number; // e.g. > 5 days
  yellowDaysThreshold: number; // e.g. 3 to 5 days
  parentPin: string; // Default "290912"
  studentName: string;
  favoriteTeam: string;
  academicYear: string; // e.g. "2026/2027"
  availableAcademicYears?: string[]; // e.g. ['2025/2026', '2026/2027', '2027/2028']
  schoolName: string; // e.g. "Escola Básica António Gedeão"
  studentClass: string; // e.g. "9º B"
  allowedEmails: string[]; // Access allowlist, e.g. ['meiraxx@gmail.com']
}
