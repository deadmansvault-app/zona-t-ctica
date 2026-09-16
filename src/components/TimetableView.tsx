import React, { useState } from 'react';
import { Calendar, Dumbbell, User, MapPin, Edit2, Check, X, Plus } from 'lucide-react';
import { ScheduleItem, AppSettings } from '../types';
import { SUBJECTS, TIME_SLOTS, HANDBALL_TRAINING } from '../data/timetableData';

interface TimetableViewProps {
  schedule: ScheduleItem[];
  settings?: AppSettings;
  onUpdateScheduleItem: (updated: ScheduleItem) => void;
  onAddScheduleItem?: (item: ScheduleItem) => void;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  schedule,
  settings,
  onUpdateScheduleItem,
  onAddScheduleItem,
}) => {
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [editRoom, setEditRoom] = useState('');
  const [editSubject, setEditSubject] = useState('');

  const days = [
    { dayNumber: 1, name: 'Segunda-feira', short: 'Seg', isHandball: true },
    { dayNumber: 2, name: 'Terça-feira', short: 'Ter', isHandball: false },
    { dayNumber: 3, name: 'Quarta-feira', short: 'Qua', isHandball: true },
    { dayNumber: 4, name: 'Quinta-feira', short: 'Qui', isHandball: false },
    { dayNumber: 5, name: 'Sexta-feira', short: 'Sex', isHandball: true },
  ];

  const handleStartEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setEditRoom(item.room);
    setEditSubject(item.subjectCode);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    onUpdateScheduleItem({
      ...editingItem,
      room: editRoom.trim() || editingItem.room,
      subjectCode: editSubject.trim().toUpperCase() || editingItem.subjectCode,
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider bg-red-600 text-white px-2.5 py-0.5 rounded-full">
              Ano Letivo {settings?.academicYear || '2026/2027'}
            </span>
            <span className="text-xs font-bold text-slate-500">
              Aluno: {settings?.studentName || 'Francisco'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Horário Semanal da Turma {settings?.studentClass || '9º B'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {settings?.schoolName || 'Escola Básica António Gedeão'} • Horário Escolar
          </p>
        </div>

        {/* Handball Training Fixed Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl p-3.5 shadow-xs flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide">
              Treino Fixo de Andebol
            </p>
            <p className="text-xs font-bold text-white">
              {HANDBALL_TRAINING.daysLabel}: {HANDBALL_TRAINING.timeRange}
            </p>
            <p className="text-[10px] text-amber-100">
              * Bloqueado no plano de estudo
            </p>
          </div>
        </div>
      </div>

      {/* Note about room/teacher corrections */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
        <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Ajuste de Salas/Professores:</strong> Podes clicar no ícone de lápis em qualquer aula para corrigir a sala ou a disciplina caso encontres alguma imprecisão na leitura da foto original.
        </p>
      </div>

      {/* Timetable Desktop Grid & Mobile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {days.map((day) => {
          const dayClasses = schedule
            .filter((s) => s.dayOfWeek === day.dayNumber)
            .sort((a, b) => a.timeIndex - b.timeIndex);

          return (
            <div
              key={day.dayNumber}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide">
                    {day.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {dayClasses.length} tempos letivos
                  </p>
                </div>
                {day.isHandball && (
                  <span
                    className="text-[10px] font-black uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs"
                    title="Andebol das 20h00 às 22h00"
                  >
                    <Dumbbell className="w-3 h-3" />
                    Andebol
                  </span>
                )}
              </div>

              {/* Day Classes Flow */}
              <div className="p-2.5 space-y-2 flex-1">
                {dayClasses.map((item) => {
                  const sub = SUBJECTS[item.subjectCode] || {
                    name: item.subjectCode,
                    code: item.subjectCode,
                    teacher: '',
                    color: 'border-slate-300 bg-slate-50 text-slate-800',
                  };
                  const timeSlot = TIME_SLOTS.find((t) => t.timeIndex === item.timeIndex);

                  const isEditingThis = editingItem?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-xl p-2.5 border transition-all ${sub.color} shadow-2xs group`}
                    >
                      {isEditingThis ? (
                        <div className="space-y-2 bg-white p-2 rounded-lg border border-slate-300 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600">Disciplina:</label>
                            <input
                              type="text"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full text-xs font-bold border border-slate-300 rounded px-1.5 py-0.5 mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600">Sala:</label>
                            <input
                              type="text"
                              value={editRoom}
                              onChange={(e) => setEditRoom(e.target.value)}
                              className="w-full text-xs font-bold border border-slate-300 rounded px-1.5 py-0.5 mt-0.5"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setEditingItem(null)}
                              className="p-1 text-slate-500 hover:text-slate-800"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Gravar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black uppercase tracking-wider">
                                {item.subjectCode}
                              </span>
                              <span className="text-[10px] font-extrabold bg-white/90 px-1.5 py-0.2 rounded-md border border-slate-300 text-slate-800">
                                {item.room}
                              </span>
                            </div>

                            <button
                              onClick={() => handleStartEdit(item)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-900 p-0.5 rounded transition-opacity"
                              title="Editar sala ou código"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>

                          <p className="text-xs font-bold text-slate-900 mt-1 truncate" title={sub.name}>
                            {sub.name}
                          </p>

                          {sub.teacher && (
                            <p className="text-[10px] text-slate-600 truncate mt-0.5 flex items-center gap-1">
                              <User className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
                              <span>{sub.teacher}</span>
                            </p>
                          )}

                          {item.note && (
                            <p className="text-[9px] font-semibold text-slate-500 italic mt-0.5">
                              {item.note}
                            </p>
                          )}

                          <div className="text-[10px] font-medium text-slate-500 mt-1.5 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                            <span>Tempo {item.timeIndex}</span>
                            <span>{timeSlot ? timeSlot.timeRange.split(' - ')[0] : ''}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Handball footer block for Mon, Wed, Fri */}
                {day.isHandball && (
                  <div className="mt-3 p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs">
                    <p className="font-extrabold flex items-center gap-1.5 text-amber-900">
                      <Dumbbell className="w-3.5 h-3.5 text-amber-600" />
                      <span>Andebol: 20h00 - 22h00</span>
                    </p>
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      Treino no pavilhão da escola / clube.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Teachers Directory Accordion */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="font-black text-base text-slate-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-red-600" />
          <span>Diretório de Professores do 9º B</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
          {Object.values(SUBJECTS).map((sub) => (
            <div
              key={sub.code}
              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-black text-xs text-red-700">{sub.code}</span>
                <span className="font-semibold text-slate-700 truncate">{sub.name}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium truncate">
                Prof. {sub.teacher}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
