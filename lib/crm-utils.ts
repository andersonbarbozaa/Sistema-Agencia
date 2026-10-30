import { CRMLeadStatus } from '@/types';

// ============================================================
// NOVO FUNIL COMERCIAL DO CRM
// 1. Novo lead
// 2. Em contato
// 3. Qualificação
// 4. Proposta enviada
// 5. Em negociação
// 6. Fechado — ganho
// 7. Perdido
// ============================================================

export const CRM_STATUSES: CRMLeadStatus[] = [
  'Novo lead',
  'Em contato',
  'Qualificação',
  'Proposta enviada',
  'Em negociação',
  'Fechado — ganho',
  'Perdido',
];

export const CRM_CHANNELS = [
  'WhatsApp',
  'Instagram Direct',
  'Telefone',
  'E-mail',
  'Outro',
] as const;

export type CRMChannel = typeof CRM_CHANNELS[number];

export const CRM_INTERACTION_TYPES = [
  'Mensagem enviada',
  'Resposta recebida',
  'Ligação',
  'Reunião',
  'Outro',
] as const;

export type CRMInteractionType = typeof CRM_INTERACTION_TYPES[number];

/**
 * Mapeia status legados para o novo funil comercial preservando a inteligência dos dados
 */
export function mapLegacyStatus(
  oldStatus: string | null | undefined,
  notes?: string | null,
  description?: string | null
): CRMLeadStatus {
  const s = (oldStatus || '').trim();

  // Se já for um dos novos status, preserva exatamente
  if (
    s === 'Novo lead' ||
    s === 'Em contato' ||
    s === 'Qualificação' ||
    s === 'Proposta enviada' ||
    s === 'Em negociação' ||
    s === 'Fechado — ganho' ||
    s === 'Perdido'
  ) {
    return s as CRMLeadStatus;
  }

  if (s === 'Novo') return 'Novo lead';
  if (s === 'Em andamento') return 'Em contato';
  if (s === 'Finalizado positivo') return 'Fechado — ganho';
  if (s === 'Finalizado negativo') return 'Perdido';

  if (s === 'Aguardando resposta') {
    const text = `${notes || ''} ${description || ''}`.toLowerCase();
    if (
      text.includes('proposta') ||
      text.includes('orçamento') ||
      text.includes('orcamento') ||
      text.includes('enviada') ||
      text.includes('valores') ||
      text.includes('apresentação')
    ) {
      return 'Proposta enviada';
    }
    return 'Em contato';
  }

  if (s === 'Sem resposta') {
    return 'Em contato';
  }

  return 'Novo lead';
}

/**
 * Calcula a diferença em DIAS ÚTEIS (desconsidera sábado e domingo)
 */
export function getBusinessDaysDifference(
  startDate: Date | string,
  endDate: Date | string = new Date()
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;

  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const target = new Date(end);
  target.setHours(0, 0, 0, 0);

  while (cur < target) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay(); // 0 = Domingo, 6 = Sábado
    if (day !== 0 && day !== 6) {
      count++;
    }
  }
  return count;
}

export type FollowUpStatus = 'green' | 'yellow' | 'red' | 'none' | 'closed';

export interface FollowUpInfo {
  status: FollowUpStatus;
  businessDays: number | null;
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
}

/**
 * Avalia o indicador de tempo sem contato com base em DIAS ÚTEIS desde a última interação
 * - Verde: até 2 dias úteis
 * - Amarelo: 3 a 4 dias úteis
 * - Vermelho: 5 ou mais dias úteis
 * - Neutro/Sem contato: quando não houver contato registrado (NÃO usa data de criação)
 * - Fechados ou perdidos: desativado (não gera alertas)
 */
export function getFollowUpInfo(lead: {
  status: string;
  last_interaction_at?: string | null;
}): FollowUpInfo {
  const s = lead.status;

  if (
    s === 'Fechado — ganho' ||
    s === 'Perdido' ||
    s === 'Finalizado positivo' ||
    s === 'Finalizado negativo'
  ) {
    return {
      status: 'closed',
      businessDays: null,
      label: 'Encerrado',
      badgeClass:
        'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      dotClass: 'bg-gray-400 dark:bg-gray-600',
      description: 'Lead encerrado. Não gera alertas de acompanhamento.',
    };
  }

  if (!lead.last_interaction_at) {
    return {
      status: 'none',
      businessDays: null,
      label: 'Sem contato registrado',
      badgeClass:
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      dotClass: 'bg-slate-400 dark:bg-slate-500',
      description: 'Nenhum contato registrado ainda pela equipe.',
    };
  }

  const days = getBusinessDaysDifference(lead.last_interaction_at);

  if (days <= 2) {
    const label =
      days === 0
        ? 'Contato hoje'
        : days === 1
        ? '1 dia útil sem contato'
        : `${days} dias úteis sem contato`;
    return {
      status: 'green',
      businessDays: days,
      label,
      badgeClass:
        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dotClass: 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900',
      description: 'Em dia: último contato realizado há até 2 dias úteis.',
    };
  }

  if (days <= 4) {
    return {
      status: 'yellow',
      businessDays: days,
      label: `${days} dias úteis sem contato`,
      badgeClass:
        'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      dotClass: 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900',
      description: 'Atenção: 3 a 4 dias úteis sem contato registrado.',
    };
  }

  return {
    status: 'red',
    businessDays: days,
    label: `${days} dias úteis sem contato`,
    badgeClass:
      'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    dotClass: 'bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900 animate-pulse',
    description: 'Atrasado: 5 ou mais dias úteis sem contato registrado.',
  };
}

/**
 * Retorna o link de destino e informações de dados cadastrados para o canal principal
 */
export function getChannelTarget(
  channel: string | null | undefined,
  lead: {
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    instagram?: string | null;
    website?: string | null;
  }
): {
  channel: CRMChannel;
  url: string;
  hasData: boolean;
  missingField: string;
} {
  const ch = (channel || 'WhatsApp').trim();
  const lower = ch.toLowerCase();

  if (lower.includes('instagram') || lower.includes('direct')) {
    const raw = (lead.instagram || '').trim();
    const clean = raw.replace(/^@/, '').trim();
    if (clean) {
      return {
        channel: 'Instagram Direct',
        url: clean.includes('instagram.com') ? `https://${clean.replace(/^https?:\/\//, '')}` : `https://ig.me/m/${clean}`,
        hasData: true,
        missingField: 'Instagram',
      };
    }
    return {
      channel: 'Instagram Direct',
      url: '',
      hasData: false,
      missingField: 'Instagram',
    };
  }

  if (lower.includes('telefone') || lower.includes('liga') || lower.includes('fone')) {
    const raw = (lead.phone || lead.whatsapp || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (digits) {
      return {
        channel: 'Telefone',
        url: `tel:${digits}`,
        hasData: true,
        missingField: 'Telefone',
      };
    }
    return {
      channel: 'Telefone',
      url: '',
      hasData: false,
      missingField: 'Telefone',
    };
  }

  if (lower.includes('email') || lower.includes('e-mail') || lower.includes('mail')) {
    const email = (lead.email || '').trim();
    if (email) {
      return {
        channel: 'E-mail',
        url: `mailto:${email}`,
        hasData: true,
        missingField: 'E-mail',
      };
    }
    return {
      channel: 'E-mail',
      url: '',
      hasData: false,
      missingField: 'E-mail',
    };
  }

  if (lower.includes('outro')) {
    const site = (lead.website || '').trim();
    if (site) {
      const url = site.startsWith('http') ? site : `https://${site}`;
      return {
        channel: 'Outro',
        url,
        hasData: true,
        missingField: 'Website / Link',
      };
    }
    return {
      channel: 'Outro',
      url: '',
      hasData: false,
      missingField: 'Website / Link',
    };
  }

  // Padrão: WhatsApp
  const raw = (lead.whatsapp || lead.phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits) {
    const phoneWithCountry = digits.length <= 11 ? `55${digits}` : digits;
    return {
      channel: 'WhatsApp',
      url: `https://wa.me/${phoneWithCountry}`,
      hasData: true,
      missingField: 'WhatsApp / Telefone',
    };
  }
  return {
    channel: 'WhatsApp',
    url: '',
    hasData: false,
    missingField: 'WhatsApp / Telefone',
  };
}

/**
 * Formata duração em segundos para leitura humana amigável
 */
export function formatDurationHuman(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return 'Menos de 1 hora';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return days === 1 ? '1 dia' : `${days} dias${hours > 0 ? ` e ${hours}h` : ''}`;
  }
  if (hours > 0) {
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }
  return mins <= 1 ? '1 minuto' : `${mins} minutos`;
}
