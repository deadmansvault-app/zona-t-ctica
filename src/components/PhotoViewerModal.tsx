import React from 'react';
import { X, Download, Share2, CheckCircle2 } from 'lucide-react';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string | null;
  title: string;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title,
}) => {
  if (!isOpen || !photoUrl) return null;

  return (
    <div
      id="photo-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Comprovativo Fotográfico de Check-in
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-md">
                {title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={photoUrl}
              download={`checkin-${Date.now()}.jpg`}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Transferir fotografia"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Photo Container */}
        <div className="p-2 sm:p-4 bg-black flex items-center justify-center overflow-auto flex-1">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg border border-slate-800"
          />
        </div>

        {/* Footer */}
        <div className="bg-slate-900 px-5 py-2.5 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Foto enviada pelo aluno via câmara / telemóvel</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
