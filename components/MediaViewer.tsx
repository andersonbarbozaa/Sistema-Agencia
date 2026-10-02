'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  AlertCircle,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { TaskMediaLink } from '@/types';
import { getEmbedInfo } from '@/lib/media';

interface MediaViewerProps {
  mediaList: TaskMediaLink[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function MediaViewer({
  mediaList,
  initialIndex = 0,
  isOpen,
  onClose,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, mediaList.length]);

  if (!isOpen || !mediaList || mediaList.length === 0) return null;

  const currentMedia = mediaList[currentIndex] || mediaList[0];
  const { embedUrl, isIframe, canEmbed } = getEmbedInfo(currentMedia.url, currentMedia.media_type);

  const handleNext = () => {
    if (currentIndex < mediaList.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setZoomLevel(1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setZoomLevel(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-white/10 rounded-lg">
            {currentMedia.media_type === 'video' ? (
              <Film size={18} className="text-blue-400" />
            ) : currentMedia.media_type === 'image' ? (
              <ImageIcon size={18} className="text-emerald-400" />
            ) : (
              <FileText size={18} className="text-amber-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm truncate max-w-md sm:max-w-xl text-white">
              {currentMedia.title}
            </h3>
            {mediaList.length > 1 && (
              <p className="text-xs text-gray-400">
                {currentIndex + 1} de {mediaList.length}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls for image */}
          {currentMedia.media_type === 'image' && (
            <div className="flex items-center bg-white/10 rounded-lg p-1 mr-2">
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Reduzir"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-gray-300 px-2 font-mono">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Ampliar"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          )}

          {/* Open original link */}
          <a
            href={currentMedia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
            title="Abrir link original em nova aba"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">ABRIR LINK ORIGINAL</span>
          </a>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1"
            title="Fechar (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full h-full flex items-center justify-center p-4 pt-16 pb-16">
        {/* Navigation Arrows */}
        {mediaList.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-all z-20 backdrop-blur-md"
              title="Anterior"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === mediaList.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-all z-20 backdrop-blur-md"
              title="Próximo"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Media Renderer */}
        <div className="w-full h-full max-w-6xl max-h-[82vh] flex items-center justify-center overflow-hidden rounded-xl">
          {canEmbed && embedUrl ? (
            isIframe ? (
              <iframe
                src={embedUrl}
                title={currentMedia.title}
                className="w-full h-full rounded-xl border-0 shadow-2xl bg-black"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            ) : currentMedia.media_type === 'video' ? (
              <video
                src={embedUrl}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-xl shadow-2xl"
              >
                Seu navegador não suporta a reprodução deste vídeo.
              </video>
            ) : (
              <div
                className="overflow-auto max-w-full max-h-full flex items-center justify-center transition-transform duration-150"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  src={embedUrl}
                  alt={currentMedia.title}
                  className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl select-none"
                  draggable={false}
                />
              </div>
            )
          ) : (
            /* Fallback for external links that do not permit embedding */
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md text-center shadow-2xl">
              <div className="w-14 h-14 bg-amber-950/60 border border-amber-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
                <AlertCircle size={28} />
              </div>
              <h4 className="text-white font-semibold text-base mb-2">
                Visualização Interna Indisponível
              </h4>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Este conteúdo não permite visualização incorporada ou está hospedado em serviço com bloqueio de iframe (Google Drive protegido, Dropbox, etc.).
              </p>
              <div className="space-y-3">
                <a
                  href={currentMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/30"
                >
                  <ExternalLink size={16} />
                  ABRIR LINK ORIGINAL
                </a>
                <p className="text-xs text-gray-500 truncate max-w-xs mx-auto">
                  {currentMedia.url}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Description Bar */}
      {currentMedia.description && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-xl bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-center text-xs text-gray-300 z-10">
          {currentMedia.description}
        </div>
      )}
    </div>
  );
}
