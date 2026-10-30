'use client';

import React, { useState } from 'react';
import ModalPortal from '@/components/ModalPortal';
import { X, Check, ArrowRight, Loader2 } from 'lucide-react';
import { CRMLead, CRMLeadStatus } from '@/types';
import { renderStatusBadge } from './CRMIcons';

interface CRMStatusMoveModalProps {
  lead: CRMLead;
  newStatus: CRMLeadStatus;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (leadId: string, newStatus: CRMLeadStatus, notes: string) => Promise<void>;
}

export function CRMStatusMoveModal({
  lead,
  newStatus,
  isOpen,
  onClose,
  onConfirm,
}: CRMStatusMoveModalProps) {
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onConfirm(lead.id, newStatus, notes.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700"
        >
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b border-gray-150 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Mover Etapa do Funil
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[260px]">
                {lead.contact_name} {lead.company ? `• ${lead.company}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleConfirm} className="p-6 space-y-4 text-xs">
            {/* Movimentação visual */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between gap-3">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] text-gray-400 font-semibold uppercase">De</span>
                {renderStatusBadge(lead.status)}
              </div>
              <ArrowRight size={18} className="text-gray-400 shrink-0" />
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Para</span>
                {renderStatusBadge(newStatus)}
              </div>
            </div>

            {/* Observação opcional */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Observação sobre a mudança (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Proposta apresentada em reunião, cliente pediu prazo para aprovação com a diretoria."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                autoFocus
                className="w-full p-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-normal text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Ficará registrado permanentemente na linha do tempo cronológica do lead.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Confirmar Movimentação</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
