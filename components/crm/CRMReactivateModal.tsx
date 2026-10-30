'use client';

import React, { useState } from 'react';
import ModalPortal from '@/components/ModalPortal';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import { CRMLead, CRMLeadStatus } from '@/types';
import { CRM_STATUSES } from '@/lib/crm-utils';

interface CRMReactivateModalProps {
  lead: CRMLead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (leadId: string, newStatus: CRMLeadStatus) => void;
}

export function CRMReactivateModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: CRMReactivateModalProps) {
  // Apenas etapas ativas (exclui etapas finais de fechamento)
  const activeStages = CRM_STATUSES.filter(
    (s) => s !== 'Fechado — ganho' && s !== 'Perdido'
  );

  const [targetStatus, setTargetStatus] = useState<CRMLeadStatus>('Em contato');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`/api/crm/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          status_change_notes: notes.trim()
            ? `[Reativação] ${notes.trim()}`
            : `Reativação explícita da oportunidade de "${lead.status}" para "${targetStatus}".`,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao reativar oportunidade.');
      }

      onSuccess(lead.id, targetStatus);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao reativar oportunidade.');
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
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <RefreshCw size={16} />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Reativar Oportunidade
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px]">
                  {lead.contact_name} {lead.company ? `• ${lead.company}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-blue-900 dark:text-blue-300 text-[11px] leading-relaxed">
              Este lead está atualmente em <strong>{lead.status}</strong>. Ao reativá-lo, todo o histórico anterior de contatos e movimentações será 100% preservado.
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 font-medium">
                {error}
              </div>
            )}

            {/* Etapa de Destino */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Para qual etapa deseja mover o lead? *
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as CRMLeadStatus)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {activeStages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Observações / Motivo da Reativação */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Motivo da Reativação (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Ex: O cliente voltou a procurar a agência demonstrando novo interesse após reajuste no orçamento."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-normal text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
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
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span>Confirmar Reativação</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
