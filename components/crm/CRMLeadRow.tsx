'use client';

import React from 'react';
import {
  MessageCircle,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';
import { CRMLead } from '@/types';
import {
  CRM_CHANNELS,
  getFollowUpInfo,
  getChannelTarget,
} from '@/lib/crm-utils';
import { formatDate, cn } from '@/lib/utils';
import { renderChannelIcon, renderStatusBadge } from './CRMIcons';

interface CRMLeadRowProps {
  lead: CRMLead;
  onClick: (lead: CRMLead) => void;
  onOpenWhatsApp: (lead: CRMLead, e: React.MouseEvent) => void;
  onQuickContact: (lead: CRMLead, e: React.MouseEvent) => void;
  onExecutePrimaryChannel: (lead: CRMLead, e: React.MouseEvent) => void;
  onChangePrimaryChannel: (leadId: string, channel: string) => void;
  onReactivate: (lead: CRMLead, e: React.MouseEvent) => void;
}

export function CRMLeadRow({
  lead,
  onClick,
  onOpenWhatsApp,
  onQuickContact,
  onExecutePrimaryChannel,
  onChangePrimaryChannel,
  onReactivate,
}: CRMLeadRowProps) {
  const followUp = getFollowUpInfo(lead);
  const channelTarget = getChannelTarget(lead.primary_channel, lead);
  const isClosed = lead.status === 'Fechado — ganho' || lead.status === 'Perdido';

  return (
    <tr
      onClick={() => onClick(lead)}
      className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors cursor-pointer group"
    >
      {/* 1. Indicador de Follow-up (Bolinha colorida com dias úteis) */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2" title={followUp.description}>
          <span className={cn('w-2.5 h-2.5 rounded-full inline-block shrink-0', followUp.dotClass)} />
          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {followUp.label}
          </span>
        </div>
      </td>

      {/* 2. Nome do Contato e Empresa */}
      <td className="py-3 px-4">
        <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {lead.contact_name}
        </div>
        {lead.company && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400">{lead.company}</div>
        )}
      </td>

      {/* 3. Cidade */}
      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
        {lead.city || '—'}
      </td>

      {/* 4. Ramo / Área de Atuação */}
      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
        {lead.segment || '—'}
      </td>

      {/* 5. Status do Funil */}
      <td className="py-3 px-4">
        {renderStatusBadge(lead.status)}
      </td>

      {/* 6. Canal Principal de Contato (Requisito 5) */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => onExecutePrimaryChannel(lead, e)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs transition-all active:scale-[0.98]',
              channelTarget.hasData
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            )}
            title={
              channelTarget.hasData
                ? `Contatar via ${lead.primary_channel || 'WhatsApp'}`
                : `Clique para cadastrar ${channelTarget.missingField}`
            }
          >
            {renderChannelIcon(lead.primary_channel || 'WhatsApp', 12)}
            <span>{lead.primary_channel || 'WhatsApp'}</span>
            {!channelTarget.hasData && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Dados pendentes" />
            )}
          </button>

          <select
            value={lead.primary_channel || 'WhatsApp'}
            onChange={(e) => onChangePrimaryChannel(lead.id, e.target.value)}
            className="p-1 text-[10px] bg-transparent border-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer focus:ring-0"
            title="Alterar canal principal"
          >
            {CRM_CHANNELS.map((ch) => (
              <option key={ch} value={ch} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                {ch}
              </option>
            ))}
          </select>
        </div>
      </td>

      {/* 7. Valor Estimado */}
      <td className="py-3 px-4 text-right font-medium">
        {lead.estimated_value && Number(lead.estimated_value) > 0 ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            R$ {Number(lead.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      {/* 8. Ações: Registrar Contato, Reativar, Ver */}
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isClosed ? (
            <button
              type="button"
              onClick={(e) => onReactivate(lead, e)}
              className="px-2 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg transition-all flex items-center gap-1"
              title="Reativar oportunidade"
            >
              <RefreshCw size={11} />
              <span>Reativar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => onQuickContact(lead, e)}
              className="px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-all flex items-center gap-1"
              title="Registrar interação rápida"
            >
              <PhoneCall size={11} />
              <span>Contato</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onClick(lead)}
            className="px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-150 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            Ver
          </button>
        </div>
      </td>
    </tr>
  );
}
