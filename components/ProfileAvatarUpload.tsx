'use client';

import React, { useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileAvatarUploadProps {
  value?: string | null;
  fallbackText?: string;
  alt?: string;
  size?: 'md' | 'lg';
  onChange: (newDataUrl: string) => void | Promise<void>;
}

async function compressAvatarImage(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(ev.target?.result as string);
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileAvatarUpload({
  value,
  fallbackText,
  alt = 'Foto de perfil',
  size = 'lg',
  onChange,
}: ProfileAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const hasImage = Boolean(value && value.trim());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressAvatarImage(file, 512);
      await onChange(dataUrl);
      setShowPreviewModal(false);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    if (hasImage) {
      setShowPreviewModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveHoverClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onChange('');
    setShowPreviewModal(false);
  };

  const handleRemoveFromModal = async () => {
    await onChange('');
    setShowPreviewModal(false);
  };

  const sizeClasses = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-14 h-14 text-lg';

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="relative inline-block group flex-shrink-0">
        <button
          type="button"
          onClick={handleAvatarClick}
          title={hasImage ? 'Clique para visualizar a foto' : 'Clique para enviar uma foto'}
          className={cn(
            'relative rounded-full bg-blue-600 text-white flex items-center justify-center font-bold overflow-hidden ring-4 ring-blue-50 hover:ring-blue-100 transition-all cursor-pointer',
            sizeClasses
          )}
        >
          {hasImage ? (
            <img src={value!} alt={alt} className="w-full h-full object-cover" />
          ) : (
            <span>
              {fallbackText ? fallbackText.charAt(0).toUpperCase() : <Camera size={20} />}
            </span>
          )}

          {!hasImage && (
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera size={18} />
            </div>
          )}
        </button>

        {/* Ícone de X ao passar o mouse em cima quando já existe imagem */}
        {hasImage && (
          <button
            type="button"
            onClick={handleRemoveHoverClick}
            title="Remover foto"
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Janela flutuante para visualizar foto, remover ou alterar */}
      {showPreviewModal && hasImage && (
        <div
          onClick={() => setShowPreviewModal(false)}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full flex flex-col items-center border border-gray-100 animate-in zoom-in-95 duration-150"
          >
            {/* Botão discreto do lado direito para fechar visualização */}
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              title="Fechar visualização"
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 mt-5 mb-5 flex items-center justify-center shadow-inner">
              <img src={value!} alt={alt} className="w-full h-full object-cover" />
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={handleRemoveFromModal}
                className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                Remover foto
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Camera size={14} />
                Alterar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
