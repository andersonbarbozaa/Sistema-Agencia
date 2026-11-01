'use client';

import React, { useRef, useCallback } from 'react';

export interface UseSafeModalBackdropOptions {
  onClose: () => void;
  isDirty?: boolean;
  confirmMessage?: string;
}

/**
 * Hook para fechar modais com segurança:
 * 1. Previne fechamentos acidentais ("do nada") quando o usuário arrasta texto ou solta o mouse fora.
 * 2. Solicita confirmação se houver alterações não salvas antes de fechar.
 */
export function useSafeModalBackdrop({
  onClose,
  isDirty = false,
  confirmMessage = 'Você possui alterações não salvas. Deseja realmente descartar e fechar?',
}: UseSafeModalBackdropOptions) {
  const isMouseDownOnBackdrop = useRef(false);

  const requestClose = useCallback(() => {
    if (isDirty) {
      const confirmDiscard = window.confirm(confirmMessage);
      if (!confirmDiscard) return;
    }
    onClose();
  }, [isDirty, confirmMessage, onClose]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isMouseDownOnBackdrop.current = e.target === e.currentTarget;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && isMouseDownOnBackdrop.current) {
        requestClose();
      }
      isMouseDownOnBackdrop.current = false;
    },
    [requestClose]
  );

  return {
    requestClose,
    backdropProps: {
      onMouseDown: handleMouseDown,
      onClick: handleClick,
    },
  };
}

interface SafeModalBackdropProps {
  children: React.ReactNode;
  onClose: () => void;
  isDirty?: boolean;
  confirmMessage?: string;
  className?: string;
}

/**
 * Componente de Backdrop Seguro para Modais
 */
export default function SafeModalBackdrop({
  children,
  onClose,
  isDirty = false,
  confirmMessage,
  className = 'fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200',
}: SafeModalBackdropProps) {
  const { backdropProps } = useSafeModalBackdrop({ onClose, isDirty, confirmMessage });

  return (
    <div {...backdropProps} className={className}>
      {children}
    </div>
  );
}
