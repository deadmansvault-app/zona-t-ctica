import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Clock, MapPin, BookOpen, Calendar, AlertCircle } from 'lucide-react';
import { ScheduleItem } from '../types';
import { SUBJECTS, TIME_SLOTS } from '../data/timetableData';

interface ScheduleModalProps {
  isOpen: boolean;
  itemToEdit?: ScheduleItem | null;
  defaultDay?: 1 | 2 | 3 | 4 | 5;
  onClose: () => void;
  onSave: (item: ScheduleItem) => void;
  onDelete?: (itemId: string) => void;
}

const DAYS: { dayNumber: 1 | 2 | 3 | 4 | 5; label: string; short: string }[] = [
  { dayNumber: 1, label: 'Segunda-feira', short: 'Seg' },
  { dayNumber: 2, label: 'Terça-feira', short: 'Ter' },
  { dayNumber: 3, label: 'Quarta-feira', short: 'Qua' },
  { dayNumber: 4, label: 'Quinta-feira', short: 'Qui' },
  { dayNumber: 5, label: 'Sexta-feira', short: 'Sex' },
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  itemToEdit,
  defaultDay = 1,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(itemToEdit);

  const [dayOfWeek, setDayOfWeek] = useState<1 | 2 | 3 | 4 | 5>(defaultDay);
  const [timeIndex, setTimeIndex] = useState<number>(1);
  const [subjectCode, setSubjectCode] = useState<string>('MAT');
  const [customSubjectCode, setCustomSubjectCode] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (itemToEdit) {
      setDayOfWeek(itemToEdit.dayOfWeek);
      setTimeIndex(itemToEdit.timeIndex);
      const isKnownSubject = Boolean(SUBJECTS[itemToEdit.subjectCode]);
      if (isKnownSubject) {
        setSubjectCode(itemToEdit.subjectCode);
        setCustomSubjectCode('');
      } else {
        setSubjectCode('OUTRA');
        setCustomSubjectCode(itemToEdit.subjectCode);
      }
      setRoom(itemToEdit.room || '');
      setNote(itemToEdit.note || '');
    } else {
      setDayOfWeek(defaultDay);
      setTimeIndex(1);
      setSubjectCode('MAT');
      setCustomSubjectCode('');
      setRoom('');
      setNote('');
    }
    setShowConfirmDelete(false);
    setError(null);
  }, [isOpen, itemToEdit, defaultDay]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalSubjectCode = subjectCode === 'OUTRA' 
      ? customSubjectCode.trim().toUpperCase() 
      : subjectCode;

    if (!finalSubjectCode) {
      setError('Por favor, indica o código ou nome da disciplina.');
      return;
    }

    if (!room.trim()) {
      setError('Por favor, indica a sala da aula (ex: S15, Pavilhão, Lab).');
      return;
    }

    const item: ScheduleItem = {
      id: itemToEdit ? itemToEdit.id : `sched-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      dayOfWeek,
      timeIndex: Number(timeIndex),
      subjectCode: finalSubjectCode,
      room: room.trim(),
      note: note.trim() || undefined,
    };

    onSave(item);
    onClose();
  };

  const selectedTimeSlot = TIME_SLOTS.find((t) => t.timeIndex === Number(timeIndex));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg leading-snug">
                {isEditing ? 'Editar Aula do Horário' : 'Adicionar Nova Aula ao Horário'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditing ? 'Atualiza a disciplina, sala ou tempo letivo' : 'Insere uma nova aula no horário semanal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Dia da Semana */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 tracking-wider mb-2">
              Dia da Semana
            </label>
            <div className="grid grid-cols-5 gap-2">
              {DAYS.map((d) => {
                const isSelected = dayOfWeek === d.dayNumber;
                return (
                  <button
                    key={d.dayNumber}
                    type="button"
                    onClick={() => setDayOfWeek(d.dayNumber)}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition-all border text-center flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{d.short}</span>
                    <span className="text-[10px] font-medium opacity-80 hidden sm:inline">
                      {d.label.split('-')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tempo Letivo / Hora */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 tracking-wider mb-2">
              Tempo Letivo
            </label>
            <div className="space-y-1.5">
              <select
                value={timeIndex}
                onChange={(e) => setTimeIndex(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.timeIndex} value={slot.timeIndex}>
                    Tempo {slot.timeIndex} • {slot.timeRange}
                  </option>
                ))}
              </select>
              {selectedTimeSlot && (
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 px-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Início: <strong>{selectedTimeSlot.startTime}</strong> | Fim: <strong>{selectedTimeSlot.endTime}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Disciplina */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 tracking-wider mb-2">
              Disciplina
            </label>
            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
            >
              {Object.values(SUBJECTS).map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} — {sub.name} {sub.teacher ? `(Prof. ${sub.teacher})` : ''}
                </option>
              ))}
              <option value="OUTRA">+ Outra Disciplina / Personalizada...</option>
            </select>

            {subjectCode === 'OUTRA' && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Nome ou código (ex: EMRC, CLUBE, APOIO)"
                  value={customSubjectCode}
                  onChange={(e) => setCustomSubjectCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 uppercase"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Sala */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 tracking-wider mb-2">
              Sala / Local
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: S15, Pavilhão, S10, Lab 1, Auditório..."
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Nota / Observações */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 tracking-wider mb-2">
              Observação / Turno (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Quinzenal com TIC, Desdobramento, Sala provisória..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Confirm Delete Section (if editing) */}
          {isEditing && onDelete && (
            <div className="pt-2 border-t border-slate-100">
              {showConfirmDelete ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
                  <span className="text-xs text-red-800 font-bold">
                    Eliminar esta aula do horário semanal?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (itemToEdit) {
                          onDelete(itemToEdit.id);
                          onClose();
                        }
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Sim, Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar esta aula</span>
                </button>
              )}
            </div>
          )}

          {/* Buttons Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-xs hover:shadow-md flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Gravar Alterações' : 'Adicionar ao Horário'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
