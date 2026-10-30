'use client';

import React from 'react';
import {
  MessageCircle,
  Clock,
  PhoneCall,
  Globe,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { CRMLead, CRMLeadStatus } from '@/types';
import {
  CRM_CHANNELS,
  CRMChannel,
  getFollowUpInfo,
  getChannelTarget,
} from '@/lib/crm-utils';
import { formatDate, cn } from '@/lib/utils';
import {
  InstagramIcon,
  FacebookIcon,
  LinkedinIcon,
  renderChannelIcon,
  parseSocialLinks,
  buildSocialUrl,
  normalizeWebsiteUrl,
} from './CRMIcons';

interface CRMLeadCardProps {
  lead: CRMLead;
  isDraggingThis: boolean;
  onDragStart: (e: React.DragEvent, lead: CRMLead) => void;
  onDragEnd: () => void;
  onClick: (lead: CRMLead) => void;
  onOpenWhatsApp: (lead: CRMLead, e: React.MouseEvent) => void;
  onQuickContact: (lead: CRMLead, e: React.MouseEvent) => void;
  onExecutePrimaryChannel: (lead: CRMLead, e: React.MouseEvent) => void;
  onChangePrimaryChannel: (leadId: string, channel: string) => void;
  onReactivate: (lead: CRMLead, e: React.MouseEvent) => void;
}

export function CRMLeadCard({
  lead,
  isDraggingThis,
  onDragStart,
  onDragEnd,
  onClick,
  onOpenWhatsApp,
  onQuickContact,
  onExecutePrimaryChannel,
  onChangePrimaryChannel,
  onReactivate,
}: CRMLeadCardProps) {
  const channelTarget = getChannelTarget(lead.primary_channel, lead);
  const socials = parseSocialLinks(lead);
  const hasWebsite = Boolean(lead.website && lead.website.trim());
  const isClosed = lead.status === 'Fechado — ganho' || lead.status === 'Perdido';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(lead)}
      className={cn(
        'p-3.5 rounded-2xl border shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none group bg-white dark:bg-gray-800 space-y-2.5',
        isDraggingThis && 'opacity-40 scale-[0.98] border-dashed border-blue-400 shadow-none',
        lead.status === 'Fechado — ganho' ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10' :
        lead.status === 'Perdido' ? 'border-rose-200 dark:border-rose-900/60 opacity-80 bg-rose-50/20 dark:bg-rose-950/10' :
        'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      {/* 1. NOME DO CONTATO E EMPRESA */}
      <div>
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
            {lead.contact_name}
          </span>
        </div>
        {lead.company && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
            {lead.company}
          </p>
        )}
      </div>

      {/* 2. CIDADE, ÁREA E VALOR ESTIMADO */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="truncate">
          {lead.city ? lead.city : lead.segment ? lead.segment : '—'}
        </span>
        {lead.estimated_value && Number(lead.estimated_value) > 0 ? (
          <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
            R$ {Number(lead.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>
        ) : null}
      </div>

      {/* 3. AÇÃO EXPLÍCITA DE REATIVAÇÃO PARA LEADS FECHADOS OU PERDIDOS */}
      {isClosed && (
        <div className="pt-1">
          <button
            type="button"
            onClick={(e) => onReactivate(lead, e)}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-[10px] font-bold shadow-2xs transition-all active:scale-[0.98]"
            title="Reabrir ou reativar negociação preservando histórico anterior"
          >
            <RefreshCw size={11} className="text-blue-600 dark:text-blue-400" />
            <span>Reativar Oportunidade</span>
          </button>
        </div>
      )}

      {/* 4. ÁREA DE REDES/SITE À ESQUERDA & AÇÕES À DIREITA (Registrar acima, Contato Principal abaixo) */}
      <div className="pt-1 flex items-end justify-between gap-2">
        {/* Lado Esquerdo: Redes sociais e Website lado a lado na horizontal */}
        <div className="flex flex-row items-center gap-1.5 flex-nowrap overflow-x-auto min-h-[24px]">
          {hasWebsite && (
            <a
              href={normalizeWebsiteUrl(lead.website!)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 bg-gray-50 dark:bg-gray-750 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-md transition-colors border border-gray-200 dark:border-gray-700 shrink-0"
              title={`Website: ${lead.website}`}
            >
              <Globe size={11} />
            </a>
          )}
          {socials.map((s, idx) => (
            <a
              key={idx}
              href={buildSocialUrl(s.network, s.value)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 bg-gray-50 dark:bg-gray-750 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-md transition-colors border border-gray-200 dark:border-gray-700 shrink-0"
              title={`${s.network}: ${s.value}`}
            >
              {s.network.toLowerCase().includes('instagram') ? (
                <InstagramIcon size={11} />
              ) : s.network.toLowerCase().includes('facebook') ? (
                <FacebookIcon size={11} />
              ) : s.network.toLowerCase().includes('linkedin') ? (
                <LinkedinIcon size={11} />
              ) : (
                <ExternalLink size={11} />
              )}
            </a>
          ))}
        </div>

        {/* Lado Direito: Botão "Registrar" fica ACIMA do botão do "Contato Principal" */}
        <div className="flex flex-col items-end gap-1 shrink-0 ml-auto">
          {/* Botão Registrar acima */}
          <button
            type="button"
            onClick={(e) => onQuickContact(lead, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-blue-50 dark:bg-gray-750 dark:hover:bg-blue-950/50 text-gray-700 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 rounded-lg font-semibold text-[10px] transition-colors shadow-2xs"
            title="Registrar contato ou interação realizada"
          >
            <PhoneCall size={9} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Registrar</span>
          </button>

          {/* Botão Contato Principal (sem dropdown) */}
          <button
            type="button"
            onClick={(e) => onExecutePrimaryChannel(lead, e)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border shadow-2xs transition-all active:scale-[0.98]',
              channelTarget.hasData
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            )}
            title={
              channelTarget.hasData
                ? `Contatar via ${lead.primary_channel || 'WhatsApp'}`
                : `Clique para cadastrar ${channelTarget.missingField} de ${lead.contact_name}`
            }
          >
            {renderChannelIcon(lead.primary_channel || 'WhatsApp', 11)}
            <span className="truncate max-w-[85px]">{lead.primary_channel || 'WhatsApp'}</span>
            {!channelTarget.hasData && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" title="Dados ausentes" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
