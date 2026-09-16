import { SubjectInfo, TimetableSlot, ScheduleItem, SchoolTask, AppSettings } from '../types';

export const TIME_SLOTS: TimetableSlot[] = [
  { timeIndex: 1, timeRange: '08:15 - 09:05', startTime: '08:15', endTime: '09:05' },
  { timeIndex: 2, timeRange: '09:15 - 10:05', startTime: '09:15', endTime: '10:05' },
  { timeIndex: 3, timeRange: '10:25 - 11:15', startTime: '10:25', endTime: '11:15' },
  { timeIndex: 4, timeRange: '11:25 - 12:15', startTime: '11:25', endTime: '12:15' },
  { timeIndex: 5, timeRange: '12:25 - 13:15', startTime: '12:25', endTime: '13:15' },
  { timeIndex: 6, timeRange: '13:25 - 14:15', startTime: '13:25', endTime: '14:15' },
  { timeIndex: 7, timeRange: '14:25 - 15:15', startTime: '14:25', endTime: '15:15' },
  { timeIndex: 8, timeRange: '15:25 - 16:15', startTime: '15:25', endTime: '16:15' },
  { timeIndex: 9, timeRange: '16:25 - 17:25', startTime: '16:25', endTime: '17:25' },
  { timeIndex: 10, timeRange: '17:35 - 18:25', startTime: '17:35', endTime: '18:25' },
];

export const SUBJECTS: Record<string, SubjectInfo> = {
  MAT: {
    code: 'MAT',
    name: 'Matemática',
    teacher: 'Cláudia Martinho',
    color: 'border-blue-500 bg-blue-50 text-blue-800',
    backpackItems: ['Manual de Matemática (Vol. 1)', 'Caderno diário quadriculado', 'Calculadora e estojo de geometria'],
  },
  POR: {
    code: 'POR',
    name: 'Português',
    teacher: 'Elsa Oliveira',
    color: 'border-amber-500 bg-amber-50 text-amber-800',
    backpackItems: ['Manual de Português 9º', 'Caderno diário', 'Livro de leitura extensiva / Gramática'],
  },
  CN: {
    code: 'CN',
    name: 'Ciências Naturais',
    teacher: 'Elvira Corceiro',
    color: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    backpackItems: ['Manual de Ciências Naturais', 'Caderno de atividades', 'Bata (se houver laboratório)'],
  },
  FG: {
    code: 'FG',
    name: 'Físico-Química',
    teacher: 'Sandra Lopes',
    color: 'border-purple-500 bg-purple-50 text-purple-800',
    backpackItems: ['Manual de Físico-Química', 'Caderno diário', 'Calculadora'],
  },
  HIST: {
    code: 'HIST',
    name: 'História',
    teacher: 'Alexandra Brito',
    color: 'border-rose-500 bg-rose-50 text-rose-800',
    backpackItems: ['Manual de História', 'Caderno diário'],
  },
  GEO: {
    code: 'GEO',
    name: 'Geografia',
    teacher: 'Margarida Dias',
    color: 'border-teal-500 bg-teal-50 text-teal-800',
    backpackItems: ['Manual de Geografia', 'Caderno de atividades', 'Atlas'],
  },
  ING: {
    code: 'ING',
    name: 'Inglês',
    teacher: 'Ana Paula Dias',
    color: 'border-indigo-500 bg-indigo-50 text-indigo-800',
    backpackItems: ['Student Book / Workbook de Inglês', 'Caderno'],
  },
  FRA: {
    code: 'FRA',
    name: 'Francês',
    teacher: 'Anabela Romba',
    color: 'border-cyan-500 bg-cyan-50 text-cyan-800',
    backpackItems: ['Manual de Francês', 'Cahier d’activités'],
  },
  EF: {
    code: 'EF',
    name: 'Educação Física',
    teacher: 'Ana Vicente',
    color: 'border-orange-500 bg-orange-50 text-orange-800',
    backpackItems: ['Sapatilhas de pavilhão', 'Equipamento desportivo / T-shirt de muda', 'Garrafa de água e toalha'],
  },
  EV: {
    code: 'EV',
    name: 'Educação Visual',
    teacher: 'H13 (Prof. EV)',
    color: 'border-pink-500 bg-pink-50 text-pink-800',
    backpackItems: ['Dossier / Bloco A4', 'Material de desenho (lápis H/B, borracha, esquadro)'],
  },
  CD: {
    code: 'CD',
    name: 'Cidadania e Desenvolvimento',
    teacher: 'Alexandra Brito',
    color: 'border-lime-500 bg-lime-50 text-lime-800',
    backpackItems: ['Caderno de apoio / Folhas'],
  },
  TIC: {
    code: 'TIC',
    name: 'TIC',
    teacher: 'H6 (Prof. TIC)',
    color: 'border-sky-500 bg-sky-50 text-sky-800',
    backpackItems: ['Pen drive / Credenciais da escola'],
  },
  PPFM: {
    code: 'PPFM',
    name: 'Projeto Pedagógico Foco Matemática',
    teacher: 'Cláudia Martinho',
    color: 'border-blue-600 bg-blue-100/60 text-blue-900',
    backpackItems: ['Fichas de apoio à Matemática'],
  },
  PPFP: {
    code: 'PPFP',
    name: 'Projeto Pedagógico Foco Português',
    teacher: 'Elsa Oliveira',
    color: 'border-amber-600 bg-amber-100/60 text-amber-900',
    backpackItems: ['Fichas de Português'],
  },
  LAC: {
    code: 'LAC',
    name: 'Laboratório de Aprendizagem Criativa',
    teacher: 'Andreia Carreira',
    color: 'border-violet-500 bg-violet-50 text-violet-800',
    backpackItems: ['Caderno de projetos criativos'],
  },
};

export const INITIAL_SCHEDULE: ScheduleItem[] = [
  // Segunda-feira (1): CN (S17) → FG (S18) → EF (CJ) → GEO (S19) → HIST (S07) → EV (S22)
  { id: 'mon-1', dayOfWeek: 1, timeIndex: 1, subjectCode: 'CN', room: 'S17' },
  { id: 'mon-2', dayOfWeek: 1, timeIndex: 2, subjectCode: 'FG', room: 'S18' },
  { id: 'mon-3', dayOfWeek: 1, timeIndex: 3, subjectCode: 'EF', room: 'CJ' },
  { id: 'mon-4', dayOfWeek: 1, timeIndex: 4, subjectCode: 'GEO', room: 'S19' },
  { id: 'mon-5', dayOfWeek: 1, timeIndex: 5, subjectCode: 'HIST', room: 'S07' },
  { id: 'mon-6', dayOfWeek: 1, timeIndex: 6, subjectCode: 'EV', room: 'S22' },

  // Terça-feira (2): ING (S15) → MAT (S15) → POR (GF) → FRA (S13) → CD (S10) / TIC (S01) → PPFM (S05) → PPFP (S08)
  { id: 'tue-1', dayOfWeek: 2, timeIndex: 1, subjectCode: 'ING', room: 'S15' },
  { id: 'tue-2', dayOfWeek: 2, timeIndex: 2, subjectCode: 'MAT', room: 'S15' },
  { id: 'tue-3', dayOfWeek: 2, timeIndex: 3, subjectCode: 'POR', room: 'GF' },
  { id: 'tue-4', dayOfWeek: 2, timeIndex: 4, subjectCode: 'FRA', room: 'S13' },
  { id: 'tue-5', dayOfWeek: 2, timeIndex: 5, subjectCode: 'CD', room: 'S10 (ou TIC S01)', note: 'CD / TIC quinzenal' },
  { id: 'tue-6', dayOfWeek: 2, timeIndex: 6, subjectCode: 'PPFM', room: 'S05' },
  { id: 'tue-7', dayOfWeek: 2, timeIndex: 7, subjectCode: 'PPFP', room: 'S08' },

  // Quarta-feira (3): EF (CJ) → ING (S03) → CN (S19) → FG (S21) → FRA (S22) → POR (AUD)
  { id: 'wed-1', dayOfWeek: 3, timeIndex: 1, subjectCode: 'EF', room: 'CJ' },
  { id: 'wed-2', dayOfWeek: 3, timeIndex: 2, subjectCode: 'ING', room: 'S03' },
  { id: 'wed-3', dayOfWeek: 3, timeIndex: 3, subjectCode: 'CN', room: 'S19' },
  { id: 'wed-4', dayOfWeek: 3, timeIndex: 4, subjectCode: 'FG', room: 'S21' },
  { id: 'wed-5', dayOfWeek: 3, timeIndex: 5, subjectCode: 'FRA', room: 'S22' },
  { id: 'wed-6', dayOfWeek: 3, timeIndex: 6, subjectCode: 'POR', room: 'AUD' },

  // Quinta-feira (4): CN (S26) → GEO (S02) → MAT (S12) → LAC (S19) → POR (S10)
  { id: 'thu-1', dayOfWeek: 4, timeIndex: 1, subjectCode: 'CN', room: 'S26' },
  { id: 'thu-2', dayOfWeek: 4, timeIndex: 2, subjectCode: 'GEO', room: 'S02' },
  { id: 'thu-3', dayOfWeek: 4, timeIndex: 3, subjectCode: 'MAT', room: 'S12' },
  { id: 'thu-4', dayOfWeek: 4, timeIndex: 4, subjectCode: 'LAC', room: 'S19' },
  { id: 'thu-5', dayOfWeek: 4, timeIndex: 5, subjectCode: 'POR', room: 'S10' },

  // Sexta-feira (5): HIST (S11) → FG (S10) → MAT (S10) → ING (S15)
  { id: 'fri-1', dayOfWeek: 5, timeIndex: 1, subjectCode: 'HIST', room: 'S11' },
  { id: 'fri-2', dayOfWeek: 5, timeIndex: 2, subjectCode: 'FG', room: 'S10' },
  { id: 'fri-3', dayOfWeek: 5, timeIndex: 3, subjectCode: 'MAT', room: 'S10' },
  { id: 'fri-4', dayOfWeek: 5, timeIndex: 4, subjectCode: 'ING', room: 'S15' },
];

export const HANDBALL_TRAINING = {
  days: [1, 3, 5], // Segundas, Quartas e Sextas
  daysLabel: 'Segundas, Quartas e Sextas',
  timeRange: '20:00 às 22:00',
  description: 'Treino de Andebol no Pavilhão (Horário protegido e bloqueado para estudo)',
};

export const DEFAULT_SETTINGS: AppSettings = {
  greenDaysThreshold: 5, // > 5 dias: Verde
  yellowDaysThreshold: 3, // 3 a 5 dias: Amarelo
  parentPin: '1904', // Ano de fundação do Glorioso SLB
  studentName: 'Francisco',
  favoriteTeam: 'Benfica',
  academicYear: '2026/2027',
  availableAcademicYears: ['2025/2026', '2026/2027', '2027/2028', '2028/2029'],
  schoolName: 'Escola Básica António Gedeão',
  studentClass: '9º B',
  allowedEmails: ['meiraxx@gmail.com'],
  googleCalendarId: '3fad003f0a2cb499176386bd47c51340ea4add46ea5d16693a2075cedb33a1b0@group.calendar.google.com',
  googleCalendarAutoSync: true,
};

// Initial realistic starter tasks (using 2026-09-14 as reference)
export const INITIAL_TASKS: SchoolTask[] = [
  {
    id: 'task-1',
    title: 'Ficha nº 1 de Equações e Inequações',
    subjectCode: 'MAT',
    type: 'tpc',
    description: 'Resolver os exercícios 3, 4 e 5 da página 24 do caderno de atividades.',
    dueDate: '2026-09-15', // Terça-feira (amanhã)
    academicYear: '2026/2027',
    studyPlanDaysBefore: 1,
    createdAt: '2026-09-14T08:00:00Z',
  },
  {
    id: 'task-2',
    title: 'Composição escrita: "Mon quartier"',
    subjectCode: 'FRA',
    type: 'tpc',
    description: 'Escrever texto de 8 a 10 linhas no caderno a descrever a rua ou o bairro em francês.',
    dueDate: '2026-09-16', // Quarta-feira
    academicYear: '2026/2027',
    studyPlanDaysBefore: 2,
    createdAt: '2026-09-14T08:30:00Z',
  },
  {
    id: 'task-3',
    title: '1º Teste de Avaliação de Ciências Naturais',
    subjectCode: 'CN',
    type: 'teste',
    description: 'Matéria: Estrutura interna da Terra e Tectónica de Placas (páginas 12 a 45).',
    dueDate: '2026-09-21', // Próxima segunda (7 dias - Verde)
    academicYear: '2026/2027',
    studyPlanDaysBefore: 5,
    studySessions: [
      {
        id: 's-1',
        date: '2026-09-17',
        timeRange: '18:00 - 18:45',
        topic: 'Revisão: Camadas da Terra (Crosta, Manto, Núcleo) e modelo químico/físico',
        completed: false,
      },
      {
        id: 's-2',
        date: '2026-09-19', // Sábado de manhã
        timeRange: '10:30 - 11:30',
        topic: 'Teoria da Deriva Continental e Limites de Placas Tectónicas',
        completed: false,
      },
      {
        id: 's-3',
        date: '2026-09-20', // Domingo de tarde
        timeRange: '16:00 - 17:00',
        topic: 'Resolução da ficha-tipo de teste e tirar dúvidas',
        completed: false,
      },
    ],
    createdAt: '2026-09-14T08:00:00Z',
  },
  {
    id: 'task-4',
    title: 'Minificha de Físico-Química (Reações Químicas)',
    subjectCode: 'FG',
    type: 'teste',
    description: 'Acerto de equações químicas e conservação da massa.',
    dueDate: '2026-09-18', // Sexta-feira (4 dias - Amarelo)
    academicYear: '2026/2027',
    studyPlanDaysBefore: 3,
    studySessions: [
      {
        id: 's-4',
        date: '2026-09-15',
        timeRange: '17:30 - 18:15',
        topic: 'Exercícios práticos de balanço de equações simples',
        completed: false,
      },
      {
        id: 's-5',
        date: '2026-09-17',
        timeRange: '19:00 - 19:45',
        topic: 'Ficha de consolidação com Lei de Lavoisier',
        completed: false,
      },
    ],
    createdAt: '2026-09-14T08:15:00Z',
  },
];

export const MBAPPE_MOTIVATIONAL_QUOTES = [
  {
    quote: 'O foco no treino é o que decide os golos no dia do jogo.',
    author: 'Kylian Mbappé',
    tag: 'Foco Total',
  },
  {
    quote: 'A disciplina supera o cansaço. Cada dia que fazes o que tens a fazer ficas mais perto do troféu.',
    author: 'Modo Real Madrid & Benfica',
    tag: 'Determinação',
  },
  {
    quote: 'De muitos, um! Com garra e método não há teste que meta medo.',
    author: 'Espírito da Águia SLB',
    tag: 'Garra',
  },
  {
    quote: 'Trabalha com calma, divide o problema em partes pequenas e comemora de braços cruzados!',
    author: 'Kylian Mbappé',
    tag: 'Comemoração',
  },
  {
    quote: 'A mente de um campeão prepara a mochila hoje para entrar em campo a ganhar amanhã.',
    author: 'Mentalidade Vencedora',
    tag: 'Preparação',
  },
];
