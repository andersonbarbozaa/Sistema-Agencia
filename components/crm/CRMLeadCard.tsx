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
  const followUp = getFollowUpInfo(lead);

  // Data do último contato e cálculo dos dias sem contato
  const lastContactDateStr = lead.last_interaction_at || lead.last_contact_at;
  let lastContactDateFormatted: string | null = null;
  let daysWithoutContactText: string | null = null;

  if (lastContactDateStr) {
    lastContactDateFormatted = formatDate(lastContactDateStr);
    const lastDate = new Date(lastContactDateStr);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      daysWithoutContactText = 'Hoje (0 dias)';
    } else if (diffDays === 1) {
      daysWithoutContactText = '1 dia sem contato';
    } else {
      daysWithoutContactText = `${diffDays} dias sem contato`;
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(lead)}
      className={cn(
        'p-2.5 rounded-xl border shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none group bg-white dark:bg-gray-800 space-y-1.5',
        isDraggingThis && 'opacity-40 scale-[0.98] border-dashed border-blue-400 shadow-none',
        lead.status === 'Fechado — ganho' ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10' :
        lead.status === 'Perdido' ? 'border-rose-200 dark:border-rose-900/60 opacity-80 bg-rose-50/20 dark:bg-rose-950/10' :
        'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      {/* 1. NOME DO CONTATO E EMPRESA */}
      <div className="flex items-baseline justify-between gap-1 leading-tight">
        <span className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {lead.contact_name}
        </span>
        {lead.company && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[45%] text-right shrink-0">
            {lead.company}
          </span>
        )}
      </div>

      {/* 2. CIDADE, ÁREA E VALOR ESTIMADO */}
      <div className="flex items-center justify-between gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
        <span className="truncate">
          {lead.city ? lead.city : lead.segment ? lead.segment : '—'}
        </span>
        {lead.estimated_value && Number(lead.estimated_value) > 0 ? (
          <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 text-[10px]">
            R$ {Number(lead.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>
        ) : null}
      </div>

      {/* 3. DATA DO ÚLTIMO CONTATO & DIAS SEM CONTATO */}
      <div className="flex items-center gap-1.5 text-[10px] leading-tight text-gray-500 dark:text-gray-400">
        <span className={cn('w-2 h-2 rounded-full inline-block shrink-0', followUp.dotClass)} />
        {lastContactDateFormatted ? (
          <span className="truncate">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{lastContactDateFormatted}</span>
            {' '}•{' '}
            <span className={cn(
              followUp.status === 'red' ? 'text-rose-600 dark:text-rose-400 font-bold' :
              followUp.status === 'yellow' ? 'text-amber-600 dark:text-amber-400 font-bold' :
              'text-gray-600 dark:text-gray-400 font-medium'
            )}>
              {daysWithoutContactText}
            </span>
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 italic text-[10px]">
            Sem contato registrado
          </span>
        )}
      </div>

      {/* AÇÃO EXPLÍCITA DE REATIVAÇÃO PARA LEADS FECHADOS OU PERDIDOS */}
      {isClosed && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={(e) => onReactivate(lead, e)}
            className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[9px] font-bold shadow-2xs transition-all active:scale-[0.98]"
            title="Reabrir ou reativar negociação preservando histórico anterior"
          >
            <RefreshCw size={10} className="text-blue-600 dark:text-blue-400" />
            <span>Reativar Oportunidade</span>
          </button>
        </div>
      )}

      {/* 4. ÁREA DE REDES/SITE À ESQUERDA & AÇÕES À DIREITA */}
      <div className="pt-0.5 flex items-center justify-between gap-1.5">
        {/* Lado Esquerdo: Redes sociais e Website lado a lado na horizontal */}
        <div className="flex flex-row items-center gap-1 flex-nowrap overflow-x-auto min-h-[20px]">
          {hasWebsite && (
            <a
              href={normalizeWebsiteUrl(lead.website!)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 bg-gray-50 dark:bg-gray-750 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-md transition-colors border border-gray-200 dark:border-gray-700 shrink-0"
              title={`Website: ${lead.website}`}
            >
              <Globe size={10} />
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
                <InstagramIcon size={10} />
              ) : s.network.toLowerCase().includes('facebook') ? (
                <FacebookIcon size={10} />
              ) : s.network.toLowerCase().includes('linkedin') ? (
                <LinkedinIcon size={10} />
              ) : (
                <ExternalLink size={10} />
              )}
            </a>
          ))}
        </div>

        {/* Lado Direito: Botões compactos alinhados */}
        <div className="flex items-center gap-1 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
          {/* Botão Registrar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickContact(lead, e);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 hover:bg-blue-50 dark:bg-gray-750 dark:hover:bg-blue-950/50 text-gray-700 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 rounded-md font-semibold text-[9px] transition-colors shadow-2xs"
            title="Registrar contato ou interação realizada"
          >
            <PhoneCall size={9} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Registrar</span>
          </button>

          {/* Botão Contato Principal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExecutePrimaryChannel(lead, e);
            }}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border shadow-2xs transition-all active:scale-[0.98]',
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
            {renderChannelIcon(lead.primary_channel || 'WhatsApp', 10)}
            <span className="truncate max-w-[70px]">{lead.primary_channel || 'WhatsApp'}</span>
            {!channelTarget.hasData && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" title="Dados ausentes" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
