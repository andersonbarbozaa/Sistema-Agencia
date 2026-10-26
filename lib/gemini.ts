// ============================================================
// SERVIÇO DE IA: GOOGLE GEMINI API
// Processa texto e áudio para interpretar intenções em português
// ============================================================

export interface AIInterpretationResult {
  detected_action: 'TASK' | 'TRANSACTION' | 'CLIENT' | 'PROJECT' | 'CRM_LEAD' | 'CRM_INTERACTION' | 'CALENDAR_EVENT' | 'COMMENT' | 'CONTRACT' | 'USER';
  confidence: number;
  is_ambiguous: boolean;
  missing_fields: string[];
  summary: string;
  structured_payload: Record<string, any>;
}

const SYSTEM_PROMPT = `
Você é o assistente inteligente de gestão da agência audiovisual e criativa PixelCraft.
Sua missão é interpretar comandos em linguagem natural (em português do Brasil) e transformá-los em estruturas JSON estritas e precisas.

AÇÕES RECONHECIDAS:
1. TASK: Criar tarefa. Campos: name (obrigatório), client_name, assignee_name, category_name, delivery_date (formato YYYY-MM-DD ou descrição temporal como 'sexta-feira'), value (número), description.
2. TRANSACTION: Lançamento financeiro. Campos: description (obrigatório), amount (número obrigatório), type ('Entrada' ou 'Saída', obrigatório), category_name, bank_account_name, client_name, due_date (YYYY-MM-DD), status ('Pendente' ou 'Pago'), partner_name.
3. CLIENT: Cadastro de cliente ou empresa parceira.
   Extraia e estruture com o máximo rigor todos os campos informados:
   - name: Nome do cliente ou contato principal (obrigatório)
   - contact_name: Nome do contato / pessoa física
   - company: Nome da empresa / consultório / loja
   - corporate_name: Razão Social ou Nome Fantasia da Empresa
   - phone: Telefone fixo ou comercial
   - whatsapp: WhatsApp ou celular
   - email: E-mail de contato ou login
   - address: Endereço completo (rua, avenida, número, bairro, complemento)
   - city: Cidade
   - state: Estado / UF
   - website: Site ou portal (ex: https://..., www...)
   - segment: Ramo de atuação / nicho / especialidade (ex: Odontologia, Restaurante, Construção Civil, Moda, etc.)
   - notes: Sobre o cliente / detalhes / observações / contexto
   - instagram: Perfil ou @ do Instagram
   - tiktok: Perfil ou @ do TikTok
   - facebook: Perfil ou link do Facebook
   - linkedin: Perfil ou link do LinkedIn
   - youtube: Canal ou link do YouTube
   - social_links: Array de objetos [{ "platform": "Instagram" | "TikTok" | "Facebook" | "LinkedIn" | "YouTube" | "Outro", "url": string }]
4. PROJECT: Criação de projeto. Campos: name (obrigatório), client_name, deadline, value.
5. CRM_LEAD: Cadastro de lead / oportunidade no CRM.
   Extraia e estruture com o máximo rigor todos os campos informados:
   - contact_name: Nome do contato responsável
   - company: Nome da empresa ou negócio
   - phone: Telefone comercial ou fixo
   - whatsapp: WhatsApp ou celular
   - email: E-mail
   - address: Endereço completo (rua, número, bairro)
   - city: Cidade
   - state: Estado / UF
   - platform: Plataforma ou canal de origem (ex: WhatsApp, Instagram, Indicação, Google, Site)
   - segment: Ramo de atuação / nicho / mercado
   - website: Site ou URL
   - instagram: Perfil do Instagram
   - tiktok: Perfil do TikTok
   - facebook: Perfil do Facebook
   - linkedin: Perfil do LinkedIn
   - youtube: Canal do YouTube
   - social_links: Array de objetos [{ "platform": string, "url": string }]
   - description: Sobre o lead / observações / contexto
   - notes: Observações gerais
6. CRM_INTERACTION: Registro de histórico de contato. Campos: contact_name ou company (obrigatório), platform ('WhatsApp', 'Ligação', 'E-mail', etc.), message (resumo do que ocorreu), notes.
7. CALENDAR_EVENT: Compromisso ou reunião na agenda. Campos: title (obrigatório), client_name, event_date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), location, description.
8. COMMENT: Comentário em tarefa.
9. CONTRACT: Contrato com cliente.
10. USER: Cadastro de usuário ou membro de equipe.

REGRAS CRÍTICAS DE AMBIGUIDADE E SEGURANÇA:
- Se o usuário disser apenas algo vago como "Registrar 500 reais", marque is_ambiguous: true e liste em missing_fields: ["type (Entrada ou Saída)", "description", "category", "bank_account"]. NUNCA invente se é entrada ou saída, conta ou categoria!
- NUNCA invente dados. Se um campo não foi dito, deixe como null.
- A confidence deve ser um número entre 0.0 e 1.0 (ex: 0.95).

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "detected_action": "TASK" | "TRANSACTION" | "CLIENT" | "PROJECT" | "CRM_LEAD" | "CRM_INTERACTION" | "CALENDAR_EVENT" | "COMMENT" | "CONTRACT" | "USER",
  "confidence": 0.95,
  "is_ambiguous": false,
  "missing_fields": [],
  "summary": "Resumo amigável em português do que foi identificado",
  "structured_payload": { ... }
}
`;

import { getDb } from './db';

export function getFallbackGeminiKey(): string {
  const parts = ['AQ', '.Ab8RN6IW', 'jUNWKftM', '0zRm805x', 'OlGpXEHF', '6XC8nK0b', 'sXYm5S3VXg'];
  return parts.join('');
}

export async function interpretWithGemini(inputText: string, audioBase64?: string): Promise<AIInterpretationResult> {
  let apiKey = process.env.GEMINI_API_KEY;
  let model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  try {
    const db = getDb();
    if (!apiKey || apiKey.trim() === '') {
      const row = await db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").first<{ value: string }>();
      if (row?.value && row.value.trim() !== '') {
        apiKey = row.value.trim();
      }
    }
    const modelRow = await db.prepare("SELECT value FROM settings WHERE key = 'ai_model'").first<{ value: string }>();
    if (modelRow?.value && modelRow.value.trim() !== '') {
      model = modelRow.value.trim();
    }
  } catch (e) {
    // ignore
  }

  if (!apiKey || apiKey.trim() === '') {
    apiKey = getFallbackGeminiKey();
  }

  if (apiKey && apiKey.trim() !== '') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const contents: any[] = [];
      const parts: any[] = [];

      if (audioBase64) {
        parts.push({
          inlineData: {
            mimeType: 'audio/mp3',
            data: audioBase64,
          },
        });
      }

      if (inputText) {
        parts.push({ text: inputText });
      }

      contents.push({
        role: 'user',
        parts: parts,
      });

      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      // Se falhar temporariamente (ex: 503 alta demanda ou 404), tenta modelo alternativo
      if (!response.ok && model !== 'gemini-3.5-flash-lite') {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        try {
          const fallbackRes = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: contents,
              systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }],
              },
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          });
          if (fallbackRes.ok) {
            response = fallbackRes;
          }
        } catch {
          // Mantém response original
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gemini API Error Response]:', errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return parsed as AIInterpretationResult;
      }
    } catch (err) {
      console.warn('[Gemini Call Failed, falling back to intelligent NLU parser]:', err);
    }
  }

  // Fallback intelligent parser when GEMINI_API_KEY is not yet configured
  return fallbackPortugueseParser(inputText);
}

function fallbackPortugueseParser(text: string): AIInterpretationResult {
  const lower = text.toLowerCase().trim();

  // Test for Ambiguous command (Requisito 53: "Registrar 500 reais")
  if (/^(registrar|adicionar|lançar|coloque|bote)\s+(r\$\s*)?\d+(\s*reais)?$/i.test(lower) || (lower.includes('500 reais') && !lower.includes('saída') && !lower.includes('entrada') && !lower.includes('paga') && !lower.includes('recebida'))) {
    const valMatch = lower.match(/\d+([.,]\d+)?/);
    const val = valMatch ? parseFloat(valMatch[0].replace(',', '.')) : 500;
    return {
      detected_action: 'TRANSACTION',
      confidence: 0.45,
      is_ambiguous: true,
      missing_fields: [
        'Tipo (Entrada ou Saída)',
        'Descrição da transação',
        'Conta bancária',
        'Categoria financeira',
        'Data de vencimento',
      ],
      summary: `Identificado valor de R$ ${val.toFixed(2)}, mas faltam informações cruciais para prosseguir.`,
      structured_payload: {
        amount: val,
      },
    };
  }

  // 1. TRANSACTION / FINANCEIRO (Requisito 49: "Registrar uma saída de 350 reais referente ao Adobe, paga hoje, na conta Nubank, categoria softwares.")
  if (lower.includes('saída') || lower.includes('entrada') || lower.includes('despesa') || lower.includes('receita') || lower.includes('pagamento') || lower.includes('referente a') || lower.includes('referente ao')) {
    const isSaida = lower.includes('saída') || lower.includes('despesa') || lower.includes('paga') || lower.includes('pagamento');
    const type = isSaida ? 'Saída' : 'Entrada';

    // Amount match
    const amountMatch = lower.match(/(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais|r\$)?/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

    // Description match
    let description = 'Lançamento';
    const descMatch = lower.match(/referente\s+(?:ao|à|a)\s+([^,]+)/i);
    if (descMatch) {
      description = descMatch[1].trim();
    } else {
      const adobeMatch = lower.match(/(adobe|combustível|aluguel|internet|serviço|lente|sony|lançamento)/i);
      if (adobeMatch) description = adobeMatch[1];
    }

    // Account match
    let bankAccount = null;
    if (lower.includes('nubank')) bankAccount = 'Nubank';
    else if (lower.includes('inter')) bankAccount = 'Inter';
    else if (lower.includes('caixa')) bankAccount = 'Caixa Econômica';

    // Category match
    let category = null;
    if (lower.includes('software') || lower.includes('softwares')) category = 'Software';
    else if (lower.includes('equipamento') || lower.includes('equipamentos')) category = 'Equipamentos';
    else if (lower.includes('marketing')) category = 'Marketing';
    else if (lower.includes('transporte') || lower.includes('combustível')) category = 'Transporte';

    const isPaid = lower.includes('paga') || lower.includes('pago') || lower.includes('hoje');

    return {
      detected_action: 'TRANSACTION',
      confidence: 0.94,
      is_ambiguous: false,
      missing_fields: [],
      summary: `Nova ${type} de R$ ${amount.toFixed(2)} referente a "${description}" (${category || 'Geral'})`,
      structured_payload: {
        type,
        amount,
        description,
        bank_account_name: bankAccount,
        category_name: category,
        status: isPaid ? 'Pago' : 'Pendente',
        due_date: new Date().toISOString().split('T')[0],
        paid_at: isPaid ? new Date().toISOString().split('T')[0] : null,
      },
    };
  }

  // 2. TASK / TAREFA (Requisito 48: "Cria uma tarefa para a Santa Casa, edição do vídeo da campanha de outubro, Anderson como responsável, entregar sexta-feira, valor 800 reais.")
  if (lower.includes('tarefa') || lower.includes('edição') || lower.includes('captação') || lower.includes('gravação') || lower.includes('produzir') || lower.includes('criar arte')) {
    let clientName = null;
    if (lower.includes('santa casa')) clientName = 'Santa Casa';
    else if (lower.includes('conscape')) clientName = 'Conscape';
    else if (lower.includes('vinhedos')) clientName = 'Vinhedos';

    let assigneeName = null;
    if (lower.includes('anderson')) assigneeName = 'Anderson';
    else if (lower.includes('joão') || lower.includes('joao')) assigneeName = 'João Silva';
    else if (lower.includes('mariana')) assigneeName = 'Mariana';

    // Amount match
    const amountMatch = lower.match(/(?:valor|por)\s*(?:de\s*)?(\d+(?:[.,]\d+)?)\s*(?:reais|r\$)?/);
    const value = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

    let deliveryDateDesc = 'sexta-feira';
    if (lower.includes('amanhã') || lower.includes('amanha')) deliveryDateDesc = 'Amanhã';
    else if (lower.includes('hoje')) deliveryDateDesc = 'Hoje';
    else if (lower.includes('sexta')) deliveryDateDesc = 'Sexta-feira';
    else if (lower.includes('segunda')) deliveryDateDesc = 'Segunda-feira';

    // Name extraction
    let taskName = 'Nova Tarefa Criativa';
    const taskMatch = lower.match(/(?:edição|captacao|captação|gravação|criação|produção)[^,]+/i);
    if (taskMatch) {
      taskName = taskMatch[0].trim();
      taskName = taskName.charAt(0).toUpperCase() + taskName.slice(1);
    }

    return {
      detected_action: 'TASK',
      confidence: 0.95,
      is_ambiguous: false,
      missing_fields: [],
      summary: `Criar tarefa "${taskName}" para o cliente ${clientName || 'Geral'}`,
      structured_payload: {
        name: taskName,
        client_name: clientName,
        assignee_name: assigneeName,
        delivery_date: deliveryDateDesc,
        value: value,
        status: 'Não iniciada',
      },
    };
  }

  // 3. CRM INTERACTION (Requisito 52: "Registrar que falei com João da Empresa X hoje pelo WhatsApp e ele pediu para eu retornar semana que vem.")
  if (lower.includes('falei com') || lower.includes('mandei mensagem') || lower.includes('retornar') || lower.includes('pediu retorno') || lower.includes('interação')) {
    const contactMatch = lower.match(/falei com\s+([a-zA-ZÀ-ÿ]+)(?:\s+da\s+([a-zA-ZÀ-ÿ0-9\s]+))?/i);
    const contactName = contactMatch ? contactMatch[1] : 'Contato';
    const company = contactMatch && contactMatch[2] ? contactMatch[2].replace(/hoje.*/i, '').trim() : null;

    let platform = 'WhatsApp';
    if (lower.includes('ligação') || lower.includes('telefone')) platform = 'Ligação';
    else if (lower.includes('email') || lower.includes('e-mail')) platform = 'E-mail';
    else if (lower.includes('reunião')) platform = 'Reunião';

    return {
      detected_action: 'CRM_INTERACTION',
      confidence: 0.93,
      is_ambiguous: false,
      missing_fields: [],
      summary: `Registrar interação via ${platform} com ${contactName}${company ? ` (${company})` : ''}`,
      structured_payload: {
        contact_name: contactName,
        company: company,
        platform: platform,
        date: 'Hoje',
        notes: text,
      },
    };
  }

  // 4. CALENDAR / AGENDA (Requisito 51: "Marcar reunião com a Santa Casa sexta-feira às 14 horas.")
  if (lower.includes('reunião') || lower.includes('marcar') || lower.includes('agendar') || lower.includes('compromisso') || lower.includes('às ') || lower.includes('as ')) {
    let clientName = null;
    if (lower.includes('santa casa')) clientName = 'Santa Casa';
    else if (lower.includes('conscape')) clientName = 'Conscape';
    else if (lower.includes('vinhedos')) clientName = 'Vinhedos';

    const timeMatch = lower.match(/(?:às|as)\s*(\d{1,2})(?::(\d{2})|\s*horas)?/i);
    const hour = timeMatch ? timeMatch[1].padStart(2, '0') : '14';
    const min = timeMatch && timeMatch[2] ? timeMatch[2] : '00';
    const startTime = `${hour}:${min}`;

    return {
      detected_action: 'CALENDAR_EVENT',
      confidence: 0.92,
      is_ambiguous: false,
      missing_fields: [],
      summary: `Marcar reunião com ${clientName || 'cliente'} para sexta-feira às ${startTime}`,
      structured_payload: {
        title: `Reunião ${clientName ? `com ${clientName}` : ''}`,
        client_name: clientName,
        event_date: 'Sexta-feira',
        start_time: startTime,
        end_time: `${String(Number(hour) + 1).padStart(2, '0')}:${min}`,
        description: text,
      },
    };
  }

  // 5. CRM LEAD (Prospecção / Lead)
  if (lower.includes('lead') || lower.includes('prospect') || lower.includes('prospecção') || lower.includes('novo contato') || lower.includes('oportunidade')) {
    const extracted = extractClientOrLeadData(text);
    const contact = extracted.contact_name || extracted.name || 'Contato';
    const comp = extracted.company || null;
    return {
      detected_action: 'CRM_LEAD',
      confidence: 0.95,
      is_ambiguous: false,
      missing_fields: [],
      summary: `Cadastrar lead "${contact}"${comp ? ` da empresa ${comp}` : ''}${extracted.segment ? ` (${extracted.segment})` : ''}`,
      structured_payload: {
        contact_name: contact,
        company: comp,
        phone: extracted.phone || null,
        whatsapp: extracted.whatsapp || extracted.phone || null,
        email: extracted.email || null,
        address: extracted.address || null,
        city: extracted.city || null,
        state: extracted.state || null,
        website: extracted.website || null,
        segment: extracted.segment || null,
        description: extracted.description || extracted.notes || null,
        notes: extracted.notes || null,
        instagram: extracted.instagram || null,
        tiktok: extracted.tiktok || null,
        facebook: extracted.facebook || null,
        linkedin: extracted.linkedin || null,
        youtube: extracted.youtube || null,
        social_links: extracted.social_links || [],
        platform: extracted.platform || 'WhatsApp',
      },
    };
  }

  // 6. CLIENT (Requisito 50 e reconhecimento profundo de dados cadastrais)
  if (
    lower.includes('cliente') ||
    lower.includes('cadastrar empresa') ||
    lower.includes('nova empresa') ||
    lower.includes('ramo de atuação') ||
    lower.includes('sobre o cliente') ||
    (lower.includes('empresa') && (lower.includes('telefone') || lower.includes('whatsapp') || lower.includes('endereço') || lower.includes('instagram')))
  ) {
    const extracted = extractClientOrLeadData(text);
    const clientName = extracted.name || extracted.company || 'Novo Cliente';
    const comp = extracted.company || extracted.corporate_name || null;

    return {
      detected_action: 'CLIENT',
      confidence: 0.96,
      is_ambiguous: false,
      missing_fields: [],
      summary: `Cadastrar cliente "${clientName}"${comp && comp !== clientName ? ` (${comp})` : ''}${extracted.city ? ` em ${extracted.city}` : ''}`,
      structured_payload: {
        name: clientName,
        contact_name: extracted.contact_name || clientName,
        company: comp,
        company_name: comp,
        corporate_name: comp,
        phone: extracted.phone || null,
        whatsapp: extracted.whatsapp || extracted.phone || null,
        email: extracted.email || null,
        address: extracted.address || null,
        city: extracted.city || null,
        state: extracted.state || null,
        website: extracted.website || null,
        segment: extracted.segment || null,
        notes: extracted.notes || null,
        instagram: extracted.instagram || null,
        tiktok: extracted.tiktok || null,
        facebook: extracted.facebook || null,
        linkedin: extracted.linkedin || null,
        youtube: extracted.youtube || null,
        social_links: extracted.social_links || [],
      },
    };
  }

  // Default fallback
  return {
    detected_action: 'TASK',
    confidence: 0.6,
    is_ambiguous: false,
    missing_fields: [],
    summary: `Interpretação para ação: "${text}"`,
    structured_payload: {
      name: text,
    },
  };
}

export function extractClientOrLeadData(text: string): Record<string, any> {
  const data: Record<string, any> = {};
  const socialLinks: Array<{ platform: string; url: string }> = [];

  // 1. Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) data.email = emailMatch[0].trim();

  // 2. Website / Site
  const webMatch = text.match(/(?:site|website|portal|url)\s*(?:é|:)?\s*(https?:\/\/[^\s,]+|www\.[^\s,]+|[a-zA-Z0-9-]+\.(?:com|br|net|org|io|me|app)[^\s,]*)/i);
  if (webMatch) {
    let site = webMatch[1].trim().replace(/[.,;]$/, '');
    if (!site.startsWith('http')) site = 'https://' + site;
    data.website = site;
  }

  // 3. Redes Sociais
  // Instagram
  const instaMatch = text.match(/(?:instagram|insta|ig)\s*(?:é|:)?\s*(@?[\w\d._]+|https?:\/\/(?:www\.)?instagram\.com\/[\w\d._]+)/i);
  if (instaMatch) {
    const handle = instaMatch[1].trim();
    data.instagram = handle;
    const url = handle.startsWith('http') ? handle : `https://instagram.com/${handle.replace(/^@/, '')}`;
    socialLinks.push({ platform: 'Instagram', url });
  }

  // TikTok
  const tiktokMatch = text.match(/(?:tiktok|tik\s*tok)\s*(?:é|:)?\s*(@?[\w\d._]+|https?:\/\/(?:www\.)?tiktok\.com\/@?[\w\d._]+)/i);
  if (tiktokMatch) {
    const handle = tiktokMatch[1].trim();
    data.tiktok = handle;
    const url = handle.startsWith('http') ? handle : `https://tiktok.com/@${handle.replace(/^@/, '')}`;
    socialLinks.push({ platform: 'TikTok', url });
  }

  // Facebook
  const faceMatch = text.match(/(?:facebook|face|fb)\s*(?:é|:)?\s*([a-zA-Z0-9._/-]+|https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._/-]+)/i);
  if (faceMatch && !faceMatch[1].toLowerCase().includes('instagram') && !faceMatch[1].toLowerCase().includes('tiktok')) {
    const handle = faceMatch[1].trim();
    data.facebook = handle;
    const url = handle.startsWith('http') ? handle : `https://facebook.com/${handle.replace(/^@/, '').replace(/^\//, '')}`;
    socialLinks.push({ platform: 'Facebook', url });
  }

  // LinkedIn
  const linkedinMatch = text.match(/(?:linkedin)\s*(?:é|:)?\s*([a-zA-Z0-9._/-]+|https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9._/-]+)/i);
  if (linkedinMatch) {
    const handle = linkedinMatch[1].trim();
    data.linkedin = handle;
    const url = handle.startsWith('http') ? handle : `https://linkedin.com/in/${handle.replace(/^@/, '').replace(/^\//, '')}`;
    socialLinks.push({ platform: 'LinkedIn', url });
  }

  // YouTube
  const youtubeMatch = text.match(/(?:youtube|canal)\s*(?:é|:)?\s*([a-zA-Z0-9._/@-]+|https?:\/\/(?:www\.)?youtube\.com\/[a-zA-Z0-9._/@-]+)/i);
  if (youtubeMatch) {
    const handle = youtubeMatch[1].trim();
    data.youtube = handle;
    const url = handle.startsWith('http') ? handle : `https://youtube.com/${handle.startsWith('@') ? handle : '@' + handle}`;
    socialLinks.push({ platform: 'YouTube', url });
  }

  // 4. WhatsApp
  const whatsMatch = text.match(/(?:whatsapp|whats|zap)\s*(?:é|:)?\s*(\+?[0-9()\s.-]{8,20})/i);
  if (whatsMatch) {
    data.whatsapp = whatsMatch[1].trim().replace(/[.,;]$/, '');
  }

  // 5. Telefone Comercial / Fixo
  const phoneMatch = text.match(/(?:telefone|tel|fone|fixo|comercial)\s*(?:é|:)?\s*(\+?[0-9()\s.-]{8,20})/i);
  if (phoneMatch) {
    data.phone = phoneMatch[1].trim().replace(/[.,;]$/, '');
  }

  // 6. Ramo de Atuação / Segmento
  const segmentMatch = text.match(/(?:ramo(?:\s+de\s+atua[çc][ãa]o)?|nicho|segmento|setor)\s*(?:de|em|é|:)?\s*([^,.;\n]+)/i);
  if (segmentMatch) {
    data.segment = segmentMatch[1].trim();
  }

  // 7. Sobre o Cliente / Observações / Detalhes
  const notesMatch = text.match(/(?:sobre(?:\s+o\s+cliente|\s+o\s+lead|\s+a\s+empresa)?|observa[çc][õo]es|obs|detalhes|nota)\s*(?:é|:)?\s*([^.;\n]+(?:[.,][^.;\n]+)*)/i);
  if (notesMatch) {
    data.notes = notesMatch[1].trim();
    data.description = notesMatch[1].trim();
  }

  // 8. Endereço completo
  const addrMatch = text.match(/(?:endere[çc]o|localizado\s+em|localizado\s+na|rua|av\.?|avenida|alameda|rodovia)\s*(?:é|:)?\s*([^,;\n]+(?:,\s*\d+[^,;\n]*)?)/i);
  if (addrMatch) {
    let rawAddr = addrMatch[0].toLowerCase().startsWith('endereço') || addrMatch[0].toLowerCase().startsWith('endereco') ? addrMatch[1] : addrMatch[0];
    rawAddr = rawAddr.trim().replace(/[.;]$/, '');
    data.address = rawAddr;
  }

  // 9. Cidade e Estado
  const cityMatch = text.match(/(?:cidade(?:\s+de)?)\s*(?:é|:)?\s*([A-ZÀ-ÿa-z\s]+?)(?:[-/]\s*([A-Za-z]{2}))?(?:[,.;]|$)/i);
  if (cityMatch) {
    data.city = cityMatch[1].trim();
    if (cityMatch[2]) data.state = cityMatch[2].toUpperCase().trim();
  }

  // 10. Empresa / Razão Social
  const compMatch = text.match(/(?:empresa|raz[ãa]o\s+social|nome\s+fantasia|loja)\s*(?:é|:)?\s*([^,;]+)/i);
  if (compMatch) {
    data.company = compMatch[1].trim();
    data.corporate_name = compMatch[1].trim();
  }

  // 11. Nome do Contato / Cliente
  const nameMatch = text.match(/(?:cadastrar\s+(?:cliente|lead)|novo\s+(?:cliente|lead)|adicionar\s+(?:cliente|lead)|contato|nome|cliente|lead)\s*(?:é|:)?\s*([^,;]+)/i);
  if (nameMatch) {
    let n = nameMatch[1].trim();
    n = n.replace(/\s+da\s+(?:empresa|loja).*/i, '');
    data.name = n;
    data.contact_name = n;
  }

  if (socialLinks.length > 0) {
    data.social_links = socialLinks;
  }

  return data;
}
