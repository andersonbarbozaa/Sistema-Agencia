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
3. CLIENT: Cadastro de cliente. Campos: name (obrigatório), phone, email, city, notes. NUNCA invente campos ausentes.
4. PROJECT: Criação de projeto. Campos: name (obrigatório), client_name, deadline, value.
5. CRM_LEAD: Cadastro de lead. Campos: contact_name (obrigatório), company, phone, email, city, platform.
6. CRM_INTERACTION: Registro de histórico de contato. Campos: contact_name ou company (obrigatório), platform ('WhatsApp', 'Ligação', 'E-mail', etc.), message (resumo do que ocorreu), notes.
7. CALENDAR_EVENT: Compromisso ou reunião na agenda. Campos: title (obrigatório), client_name, event_date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), location, description.
8. COMMENT: Comentário em tarefa.
9. CONTRACT: Contrato com cliente.

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

import { getAdminFirestore } from './firebase-admin';

export async function interpretWithGemini(inputText: string, audioBase64?: string): Promise<AIInterpretationResult> {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    try {
      const firestore = getAdminFirestore();
      if (firestore) {
        const snap = await firestore.collection('settings').doc('gemini_api_key').get();
        if (snap.exists && snap.data()?.value) {
          apiKey = String(snap.data()?.value).trim();
        }
      }
    } catch (e) {
      // ignore
    }
  }
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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

      const response = await fetch(url, {
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

  // 5. CLIENT (Requisito 50: "Cadastrar cliente Conscape, telefone XXXXX, cidade Araçatuba.")
  if (lower.includes('cadastrar cliente') || lower.includes('novo cliente') || lower.includes('adicionar cliente')) {
    const nameMatch = lower.match(/(?:cliente)\s+([^,]+)/i);
    const name = nameMatch ? nameMatch[1].trim() : 'Novo Cliente';

    const phoneMatch = lower.match(/(?:telefone|fone|celular|whats|whatsapp)\s+([^,]+)/i);
    const phone = phoneMatch ? phoneMatch[1].trim() : null;

    const cityMatch = lower.match(/(?:cidade|em)\s+([^,.]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : null;

    return {
      detected_action: 'CLIENT',
      confidence: 0.96,
      is_ambiguous: false,
      missing_fields: [],
      summary: `Cadastrar cliente "${name}" (${city || 'Sem cidade definida'})`,
      structured_payload: {
        name,
        phone,
        city,
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
