'use client';

import React, { useState } from 'react';
import ModalPortal from '@/components/ModalPortal';
import { X, Send, Loader2, PhoneCall } from 'lucide-react';
import { CRMLead } from '@/types';
import { CRM_CHANNELS, CRM_INTERACTION_TYPES } from '@/lib/crm-utils';

interface CRMQuickContactModalProps {
  lead: CRMLead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (leadId: string) => void;
}

export function CRMQuickContactModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: CRMQuickContactModalProps) {
  const [channel, setChannel] = useState<string>(lead.primary_channel || 'WhatsApp');
  const [type, setType] = useState<string>('Mensagem enviada');
  const [interactionDate, setInteractionDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = message.trim();
    if (!cleanMsg) {
      setError('Por favor, informe a descrição do contato.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`/api/crm/${lead.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          platform: channel,
          type,
          message: cleanMsg,
          interaction_date: new Date(interactionDate).toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar contato.');
      }

      onSuccess(lead.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao registrar contato.');
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
                <PhoneCall size={16} />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Registrar Contato
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
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
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Canal de Contato */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Canal Utilizado
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {CRM_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Interação */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Contato
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {CRM_INTERACTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data e Hora */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Data e Hora do Contato
              </label>
              <input
                type="datetime-local"
                value={interactionDate}
                onChange={(e) => setInteractionDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Descrição / Observação */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Descrição do Contato *
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Liguei para apresentar os planos de vídeo, cliente solicitou orçamento por WhatsApp até sexta-feira."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="w-full p-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-normal text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Atualiza a data do último contato e zera a contagem de dias sem contato.
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
                disabled={loading || !message.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Salvar Contato</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
