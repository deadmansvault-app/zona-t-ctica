import React, { useState } from 'react';
import {
  Calendar,
  Dumbbell,
  User,
  MapPin,
  Edit2,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ScheduleItem, AppSettings } from '../types';
import { SUBJECTS, TIME_SLOTS, HANDBALL_TRAINING } from '../data/timetableData';
import { ScheduleModal } from './ScheduleModal';

interface TimetableViewProps {
  schedule: ScheduleItem[];
  settings?: AppSettings;
  onUpdateScheduleItem: (updated: ScheduleItem) => void;
  onAddScheduleItem?: (item: ScheduleItem) => void;
  onDeleteScheduleItem?: (itemId: string) => void;
  onResetSchedule?: () => void;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  schedule,
  settings,
  onUpdateScheduleItem,
  onAddScheduleItem,
  onDeleteScheduleItem,
  onResetSchedule,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<ScheduleItem | null>(null);
  const [modalDefaultDay, setModalDefaultDay] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const days: { dayNumber: 1 | 2 | 3 | 4 | 5; name: string; short: string; isHandball: boolean }[] = [
    { dayNumber: 1, name: 'Segunda-feira', short: 'Seg', isHandball: true },
    { dayNumber: 2, name: 'Terça-feira', short: 'Ter', isHandball: false },
    { dayNumber: 3, name: 'Quarta-feira', short: 'Qua', isHandball: true },
    { dayNumber: 4, name: 'Quinta-feira', short: 'Qui', isHandball: false },
    { dayNumber: 5, name: 'Sexta-feira', short: 'Sex', isHandball: true },
  ];

  const handleOpenAdd = (day: 1 | 2 | 3 | 4 | 5 = 1) => {
    setSelectedItemForEdit(null);
    setModalDefaultDay(day);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ScheduleItem) => {
    setSelectedItemForEdit(item);
    setModalDefaultDay(item.dayOfWeek);
    setModalOpen(true);
  };

  const handleSaveModalItem = (item: ScheduleItem) => {
    if (selectedItemForEdit) {
      onUpdateScheduleItem(item);
    } else if (onAddScheduleItem) {
      onAddScheduleItem(item);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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

        {/* Action Controls & Handball Training Fixed Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {onAddScheduleItem && (
            <button
              onClick={() => handleOpenAdd(1)}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Aula</span>
            </button>
          )}

          {onResetSchedule && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              title="Restaurar o horário original de fábrica"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Repor Padrão</span>
            </button>
          )}

          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl p-3 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide">
                Treino de Andebol
              </p>
              <p className="text-xs font-bold text-white">
                {HANDBALL_TRAINING.daysLabel}: {HANDBALL_TRAINING.timeRange}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation to Reset Schedule */}
      {showResetConfirm && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-900">
                Tens a certeza de que queres repor o horário escolar original da turma 9º B?
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Todas as alterações manuais feitas ao horário serão substituídas pelo horário padrão inicial.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (onResetSchedule) {
                  onResetSchedule();
                }
                setShowResetConfirm(false);
              }}
              className="px-3.5 py-1.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
            >
              Sim, Repor Horário
            </button>
          </div>
        </div>
      )}

      {/* Note about customization */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Ajustes e Alterações da Escola:</strong> Podes alterar qualquer aula (sala, disciplina, dia ou hora) clicando no ícone de lápis, ou adicionar novos tempos/aulas em caso de mudança do horário escolar.
          </p>
        </div>
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
                <div className="flex items-center gap-1.5">
                  {onAddScheduleItem && (
                    <button
                      onClick={() => handleOpenAdd(day.dayNumber)}
                      className="p-1 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg transition-colors"
                      title={`Adicionar aula a ${day.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
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
              </div>

              {/* Day Classes Flow */}
              <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  {dayClasses.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <p>Nenhuma aula neste dia.</p>
                      {onAddScheduleItem && (
                        <button
                          onClick={() => handleOpenAdd(day.dayNumber)}
                          className="mt-2 text-red-600 hover:text-red-700 font-bold text-xs inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Aula
                        </button>
                      )}
                    </div>
                  ) : (
                    dayClasses.map((item) => {
                      const sub = SUBJECTS[item.subjectCode] || {
                        name: item.subjectCode,
                        code: item.subjectCode,
                        teacher: '',
                        color: 'border-slate-300 bg-slate-50 text-slate-800',
                      };
                      const timeSlot = TIME_SLOTS.find((t) => t.timeIndex === item.timeIndex);

                      return (
                        <div
                          key={item.id}
                          className={`relative rounded-xl p-2.5 border transition-all ${sub.color} shadow-2xs group hover:shadow-xs`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black uppercase tracking-wider">
                                {item.subjectCode}
                              </span>
                              <span className="text-[10px] font-extrabold bg-white/90 px-1.5 py-0.2 rounded-md border border-slate-300 text-slate-800">
                                {item.room}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="opacity-70 group-hover:opacity-100 text-slate-600 hover:text-slate-900 p-1 rounded-md hover:bg-black/5 transition-opacity"
                                title="Editar aula"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {onDeleteScheduleItem && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Eliminar ${item.subjectCode} (${item.room}) deste dia?`)) {
                                      onDeleteScheduleItem(item.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-opacity"
                                  title="Remover aula"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
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
                            <span className="font-bold">Tempo {item.timeIndex}</span>
                            <span>{timeSlot ? timeSlot.timeRange : ''}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Day Add button at bottom */}
                {onAddScheduleItem && (
                  <button
                    onClick={() => handleOpenAdd(day.dayNumber)}
                    className="w-full mt-2 py-1.5 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar aula</span>
                  </button>
                )}

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

      {/* Schedule Add / Edit Modal */}
      <ScheduleModal
        isOpen={modalOpen}
        itemToEdit={selectedItemForEdit}
        defaultDay={modalDefaultDay}
        onClose={() => {
          setModalOpen(false);
          setSelectedItemForEdit(null);
        }}
        onSave={handleSaveModalItem}
        onDelete={onDeleteScheduleItem}
      />
    </div>
  );
};
