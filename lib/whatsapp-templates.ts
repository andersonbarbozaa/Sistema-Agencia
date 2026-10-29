import { CRMWhatsAppTemplate } from '@/types';

export const DEFAULT_WHATSAPP_TEMPLATES: CRMWhatsAppTemplate[] = [
  {
    id: 'tpl_primeiro_contato',
    title: 'Primeiro Contato / Apresentação',
    message: 'Olá, {primeiro_nome}! Tudo bem? Sou da equipe da {minha_empresa}. Estamos entrando em contato sobre a sua solicitação com a {empresa}. Como podemos te ajudar hoje?',
  },
  {
    id: 'tpl_follow_up',
    title: 'Follow-up (Sem Resposta)',
    message: 'Olá, {primeiro_nome}! Passando para saber se você conseguiu avaliar nossa mensagem anterior sobre o projeto da {empresa}. Ficou alguma dúvida que possamos esclarecer?',
  },
  {
    id: 'tpl_envio_proposta',
    title: 'Envio de Proposta / Orçamento',
    message: 'Olá, {nome}! Tudo bem? Conforme conversamos, preparamos uma proposta comercial personalizada para a {empresa}. Quando você teria 10 minutos para conversarmos a respeito?',
  },
  {
    id: 'tpl_fechamento',
    title: 'Fechamento / Início do Projeto',
    message: 'Olá, {primeiro_nome}! Estamos prontos para iniciar os trabalhos com a {empresa}. Vamos alinhar os próximos passos e o cronograma de entrega?',
  },
];

export function parseWhatsAppTemplates(rawJson?: string | null): CRMWhatsAppTemplate[] {
  if (!rawJson || typeof rawJson !== 'string' || rawJson.trim() === '') {
    return DEFAULT_WHATSAPP_TEMPLATES;
  }
  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        id: item.id || `tpl_${idx}_${Date.now()}`,
        title: item.title || `Mensagem ${idx + 1}`,
        message: item.message || '',
      }));
    }
  } catch (err) {
    console.warn('[parseWhatsAppTemplates] Erro ao analisar templates de WhatsApp:', err);
  }
  return DEFAULT_WHATSAPP_TEMPLATES;
}

export function formatWhatsAppTemplate(
  template: string,
  lead: { contact_name?: string | null; company?: string | null } | null,
  myCompanyName: string = 'PixelCraft Studio'
): string {
  if (!template) return '';
  if (!lead) return template;

  const fullName = lead.contact_name?.trim() || '';
  const firstName = fullName ? fullName.split(' ')[0] : '';
  const companyName = lead.company?.trim() || '';

  let text = template;

  // Substitui {primeiro_nome}
  text = text.replace(/\{primeiro_nome\}/gi, firstName || fullName || 'você');

  // Substitui {nome}, {contato}, {cliente}
  text = text.replace(/\{nome\}|\{contato\}|\{cliente\}/gi, fullName || 'você');

  // Trata substituição de {empresa}
  if (companyName) {
    text = text.replace(/\{empresa\}|\{empresa_cliente\}/gi, companyName);
  } else {
    text = text.replace(/da \{empresa\}|de \{empresa\}|para a \{empresa\}|para \{empresa\}/gi, 'da sua empresa');
    text = text.replace(/\{empresa\}|\{empresa_cliente\}/gi, 'sua empresa');
  }

  // Substitui {minha_empresa} e {agencia}
  text = text.replace(/\{minha_empresa\}|\{agencia\}/gi, myCompanyName || 'PixelCraft Studio');

  return text;
}
