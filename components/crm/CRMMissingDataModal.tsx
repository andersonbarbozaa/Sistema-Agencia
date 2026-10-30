'use client';

import React, { useState } from 'react';
import ModalPortal from '@/components/ModalPortal';
import { X, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { CRMLead } from '@/types';
import { getChannelTarget } from '@/lib/crm-utils';
import { renderChannelIcon } from './CRMIcons';

interface CRMMissingDataModalProps {
  lead: CRMLead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedLead: CRMLead) => void;
}

export function CRMMissingDataModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: CRMMissingDataModalProps) {
  const channelTarget = getChannelTarget(lead.primary_channel, lead);
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVal = value.trim();
    if (!cleanVal) {
      setError(`Por favor, preencha o ${channelTarget.missingField}.`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const patchPayload: Record<string, any> = {};
      const ch = (lead.primary_channel || 'WhatsApp').toLowerCase();

      if (ch.includes('instagram') || ch.includes('direct')) {
        patchPayload.instagram = cleanVal;
      } else if (ch.includes('telefone') || ch.includes('liga') || ch.includes('fone')) {
        patchPayload.phone = cleanVal;
      } else if (ch.includes('email') || ch.includes('mail')) {
        patchPayload.email = cleanVal;
      } else if (ch.includes('outro')) {
        patchPayload.website = cleanVal;
      } else {
        // WhatsApp
        patchPayload.whatsapp = cleanVal;
        patchPayload.phone = cleanVal;
      }

      const res = await fetch(`/api/crm/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar dados do lead.');
      }

      const updatedLead = data.data || { ...lead, ...patchPayload };
      onSuccess(updatedLead);
      onClose();

      // Imediatamente abre o destino correspondente com os dados recém-cadastrados!
      const newTarget = getChannelTarget(lead.primary_channel, updatedLead);
      if (newTarget.hasData && newTarget.url) {
        window.open(newTarget.url, '_blank');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao salvar dados.');
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
          className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700"
        >
          {/* Header */}
          <div className="shrink-0 px-5 py-4 border-b border-gray-150 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                {renderChannelIcon(lead.primary_channel || 'WhatsApp', 15)}
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Cadastrar {channelTarget.missingField}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                  {lead.contact_name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
            <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
              Para entrar em contato via <strong>{lead.primary_channel || 'WhatsApp'}</strong>, informe o dado abaixo. Ele será salvo no cadastro e o canal será aberto em seguida:
            </p>

            {error && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 font-medium text-[11px]">
                {error}
              </div>
            )}

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {channelTarget.missingField} *
              </label>
              <input
                type={
                  lead.primary_channel === 'E-mail'
                    ? 'email'
                    : lead.primary_channel === 'WhatsApp' || lead.primary_channel === 'Telefone'
                    ? 'tel'
                    : 'text'
                }
                placeholder={
                  lead.primary_channel === 'Instagram Direct'
                    ? 'Ex: @nome_do_perfil'
                    : lead.primary_channel === 'E-mail'
                    ? 'contato@cliente.com'
                    : 'Ex: (11) 98765-4321'
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                required
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3.5 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !value.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                <span>Salvar & Abrir</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
