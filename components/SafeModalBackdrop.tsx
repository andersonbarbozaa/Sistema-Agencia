'use client';

import React, { useState, useRef, useCallback, createContext, useContext } from 'react';
import { AlertTriangle } from 'lucide-react';
import ModalPortal from './ModalPortal';

interface SafeModalContextType {
  requestClose: () => void;
}

const SafeModalContext = createContext<SafeModalContextType>({
  requestClose: () => {},
});

export const useSafeModal = () => useContext(SafeModalContext);

interface SafeModalBackdropProps {
  children: React.ReactNode;
  onClose: () => void;
  isDirty?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  discardLabel?: string;
  keepLabel?: string;
  className?: string;
}

/**
 * Backdrop Seguro com Modal de Confirmação Visual no Centro
 * 
 * 1. Previne fechamento acidental ("do nada") ao selecionar texto ou arrastar cursor para fora.
 * 2. Quando há alterações (isDirty), exibe janela modal centralizada com o padrão visual do sistema.
 * 3. Disponibiliza o hook useSafeModal() para que botões X e Cancelar usem a mesma confirmação visual.
 */
export default function SafeModalBackdrop({
  children,
  onClose,
  isDirty = false,
  confirmTitle = 'Descartar alterações?',
  confirmMessage = 'Você possui informações preenchidas ou alterações não salvas. Se fechar agora, todas as alterações serão perdidas.',
  discardLabel = 'Descartar e Fechar',
  keepLabel = 'Continuar Editando',
  className = 'fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200',
}: SafeModalBackdropProps) {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const isMouseDownOnBackdrop = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isTouchOnBackdrop = useRef(false);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isMouseDownOnBackdrop.current = e.target === e.currentTarget;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.touches.length > 0) {
      isTouchOnBackdrop.current = true;
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      isTouchOnBackdrop.current = false;
      touchStartPos.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartPos.current && e.touches.length > 0) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      // Se moveu mais de 10px, é um gesto de rolagem/swipe, não clique no backdrop
      if (dx > 10 || dy > 10) {
        isTouchOnBackdrop.current = false;
      }
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const wasIntentionalBackdrop = isMouseDownOnBackdrop.current || isTouchOnBackdrop.current;
      if (e.target === e.currentTarget && wasIntentionalBackdrop) {
        requestClose();
      }
      isMouseDownOnBackdrop.current = false;
      isTouchOnBackdrop.current = false;
      touchStartPos.current = null;
    },
    [requestClose]
  );

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleCancelDiscard = () => {
    setShowDiscardConfirm(false);
  };

  return (
    <SafeModalContext.Provider value={{ requestClose }}>
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={handleClick}
        className={className}
      >
        {children}
      </div>

      {/* Janela de Confirmação Centralizada com Padrão Visual do Sistema */}
      {showDiscardConfirm && (
        <ModalPortal>
          <div
            className="fixed inset-0 !m-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              // Clicar fora da caixa de confirmação cancela o descarte e mantém editando
              handleCancelDiscard();
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-150 text-left"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {confirmTitle}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                    {confirmMessage}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCancelDiscard}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
                >
                  {keepLabel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  {discardLabel}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </SafeModalContext.Provider>
  );
}
