import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Image as ImageIcon, AlertCircle, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SchoolTask, CheckInRecord } from '../types';
import { SUBJECTS } from '../data/timetableData';

interface CheckInModalProps {
  task: SchoolTask;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (record: CheckInRecord) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  task,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const subject = SUBJECTS[task.subjectCode] || { name: task.subjectCode, code: task.subjectCode };

  // Compress image to ~1200px max dimension & JPEG quality 0.85 to save space & run smoothly
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor seleciona um ficheiro de imagem válido (JPG, PNG).');
      return;
    }
    setErrorMsg(null);
    setIsCompressing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedData = canvas.toDataURL('image/jpeg', 0.82);
          setPhotoDataUrl(compressedData);
        } else {
          setPhotoDataUrl(e.target?.result as string);
        }
        setIsCompressing(false);
      };
      img.onerror = () => {
        setIsCompressing(false);
        setErrorMsg('Erro ao carregar a imagem. Tenta novamente.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoDataUrl) {
      setErrorMsg('A foto é estritamente obrigatória para validares o check-in.');
      return;
    }

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#dc2626', '#ffffff', '#fbbf24'],
      });
    } catch {
      // ignore
    }

    const record: CheckInRecord = {
      id: `chk-${Date.now()}`,
      taskId: task.id,
      timestamp: new Date().toISOString(),
      photoDataUrl,
      notes: notes.trim() || undefined,
      confirmedBy: 'filho',
    };

    onConfirm(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                Check-in com Foto Obrigatória
              </h3>
              <p className="text-xs text-red-100 font-medium">
                {task.subjectCode} • {subject.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarefa a Confirmar</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{task.title}</p>
            {task.description && (
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>

          {/* Photo requirement disclaimer */}
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Regra de Compromisso:</strong> Tira uma foto clara ao caderno, à folha de TPC ou à mochila pronta. Sem foto anexada, o check-in não é aceite.
            </p>
          </div>

          {/* Photo Preview / Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Foto Comprovativa <span className="text-red-600 font-black">* (Obrigatória)</span>
            </label>

            {photoDataUrl ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-slate-900 group">
                <img
                  src={photoDataUrl}
                  alt="Comprovativo"
                  className="w-full h-56 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDataUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow"
                  >
                    <X className="w-3.5 h-3.5" />
                    Tirar Outra Foto
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                  <Check className="w-3 h-3" />
                  Foto Pronta para Enviar
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-red-50/20 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2.5">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Clica para tirar foto com o telemóvel
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ou arrasta o ficheiro da imagem para aqui
                </p>

                {/* Quick actions for mobile */}
                <div className="flex items-center gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="flex items-center gap-1 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Câmara
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-1 text-xs font-bold bg-white text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Galeria / Ficheiro
                  </button>
                </div>
              </div>
            )}

            {/* Hidden native inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {isCompressing && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              A preparar foto...
            </p>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nota adicional (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Fiz até ao exercício 5; tive dúvida no 3..."
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!photoDataUrl || isCompressing}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold rounded-xl shadow-md transition-all ${
                photoDataUrl && !isCompressing
                  ? 'bg-red-600 hover:bg-red-700 text-white active:scale-95 shadow-red-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Check-in</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
