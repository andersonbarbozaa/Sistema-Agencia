
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { generateId } from '@/lib/utils';
import { notifyAdmins } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const body = await request.json();
    const { interpretation_id, action, payload } = body;

    const db = getDb();

    // Verify interpretation if id provided
    if (interpretation_id) {
      const interp = await db
        .prepare('SELECT * FROM ai_interpretations WHERE id = ?')
        .bind(interpretation_id)
        .first<any>();

      if (interp && interp.status !== 'Pendente') {
        return NextResponse.json({ error: `Esta interpretação já está ${interp.status}.` }, { status: 400 });
      }
    }

    const detectedAction = action || body.detected_action;
    const data = payload || body.structured_payload || {};

    let createdId = null;

    switch (detectedAction) {
      case 'TASK': {
        const taskName = data.name || data.title || 'Nova Tarefa Criativa';

        // Resolve client
        let clientId = data.client_id;
        if (!clientId && data.client_name) {
          const clientRow = await db
            .prepare('SELECT id FROM clients WHERE lower(name) LIKE lower(?) LIMIT 1')
            .bind(`%${data.client_name}%`)
            .first<any>();
          if (clientRow) clientId = clientRow.id;
        }
        if (!clientId) {
          const firstClient = await db.prepare('SELECT id FROM clients LIMIT 1').first<any>();
          clientId = firstClient?.id || 'cli_santacasa';
        }

        // Resolve delivery date
        let deliveryDate = data.delivery_date;
        if (!deliveryDate || deliveryDate.includes('sexta') || deliveryDate.includes('hoje') || deliveryDate.includes('amanhã')) {
          const d = new Date();
          d.setDate(d.getDate() + 5);
          deliveryDate = d.toISOString().split('T')[0];
        }

        const taskId = generateId('task');
        await db
          .prepare(`
            INSERT INTO tasks (id, name, description, client_id, delivery_date, value, status, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Não iniciada', ?, datetime('now'), datetime('now'))
          `)
          .bind(
            taskId,
            taskName,
            data.description || null,
            clientId,
            deliveryDate,
            Number(data.value) || 0,
            user.id
          )
          .run();

        // Assignee if matched
        if (data.assignee_name) {
          const assigneeUser = await db
            .prepare('SELECT id FROM users WHERE lower(name) LIKE lower(?) LIMIT 1')
            .bind(`%${data.assignee_name}%`)
            .first<any>();
          if (assigneeUser) {
            const asgnId = generateId('asgn');
            await db
              .prepare(`INSERT INTO task_assignees (id, task_id, user_id, assigned_at) VALUES (?, ?, ?, datetime('now'))`)
              .bind(asgnId, taskId, assigneeUser.id)
              .run();
          }
        }

        createdId = taskId;
        break;
      }

      case 'TRANSACTION': {
        const desc = data.description || 'Lançamento via IA';
        const amount = Number(data.amount) || 0;
        const type = data.type === 'Entrada' ? 'Entrada' : 'Saída';

        // Bank account
        let bankId = data.bank_account_id;
        if (!bankId && data.bank_account_name) {
          const accRow = await db
            .prepare('SELECT id FROM bank_accounts WHERE lower(name) LIKE lower(?) OR lower(bank) LIKE lower(?) LIMIT 1')
            .bind(`%${data.bank_account_name}%`, `%${data.bank_account_name}%`)
            .first<any>();
          if (accRow) bankId = accRow.id;
        }
        if (!bankId) {
          const firstAcc = await db.prepare('SELECT id FROM bank_accounts WHERE status = "ativo" LIMIT 1').first<any>();
          bankId = firstAcc?.id || null;
        }

        // Category
        let categoryId = data.category_id;
        if (!categoryId && data.category_name) {
          const catRow = await db
            .prepare('SELECT id FROM financial_categories WHERE lower(name) LIKE lower(?) LIMIT 1')
            .bind(`%${data.category_name}%`)
            .first<any>();
          if (catRow) categoryId = catRow.id;
        }

        const transId = generateId('tra');
        const dueDate = data.due_date || new Date().toISOString().split('T')[0];
        const status = data.status || 'Pendente';
        const paidAt = status === 'Pago' ? (data.paid_at || new Date().toISOString().split('T')[0]) : null;

        await db
          .prepare(`
            INSERT INTO financial_transactions (
              id, description, amount, type, category_id, bank_account_id, created_by, due_date, paid_at, status, notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `)
          .bind(
            transId,
            desc,
            amount,
            type,
            categoryId,
            bankId,
            user.id,
            dueDate,
            paidAt,
            status,
            data.notes || 'Criado via confirmação de IA'
          )
          .run();

        createdId = transId;
        break;
      }

      case 'CLIENT': {
        const clientName = data.name || 'Novo Cliente';
        const clientId = generateId('cli');

        await db
          .prepare(`
            INSERT INTO clients (id, name, phone, city, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'ativo', datetime('now'), datetime('now'))
          `)
          .bind(clientId, clientName, data.phone || null, data.city || null, data.notes || 'Cadastrado via IA')
          .run();

        createdId = clientId;
        break;
      }

      case 'CALENDAR_EVENT': {
        const eventId = generateId('cal');
        const eventDate = data.event_date && data.event_date.match(/^\d{4}-\d{2}-\d{2}$/)
          ? data.event_date
          : new Date().toISOString().split('T')[0];

        await db
          .prepare(`
            INSERT INTO calendar_events (id, title, description, event_date, start_time, end_time, location, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `)
          .bind(
            eventId,
            data.title || 'Compromisso',
            data.description || null,
            eventDate,
            data.start_time || '14:00',
            data.end_time || '15:00',
            data.location || null,
            user.id
          )
          .run();

        createdId = eventId;
        break;
      }

      case 'CRM_LEAD': {
        const leadId = generateId('lead');
        await db
          .prepare(`
            INSERT INTO crm_leads (id, contact_name, company, phone, email, city, first_contact_date, platform, status, notes, last_activity_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Novo', ?, datetime('now'), datetime('now'), datetime('now'))
          `)
          .bind(
            leadId,
            data.contact_name || 'Contato',
            data.company || null,
            data.phone || null,
            data.email || null,
            data.city || null,
            new Date().toISOString().split('T')[0],
            data.platform || 'WhatsApp',
            data.notes || null
          )
          .run();

        createdId = leadId;
        break;
      }

      case 'CRM_INTERACTION': {
        // Find lead by contact_name or company
        let leadId = null;
        if (data.contact_name) {
          const leadRow = await db
            .prepare('SELECT id FROM crm_leads WHERE lower(contact_name) LIKE lower(?) OR lower(company) LIKE lower(?) LIMIT 1')
            .bind(`%${data.contact_name}%`, `%${data.contact_name}%`)
            .first<any>();
          if (leadRow) leadId = leadRow.id;
        }
        if (!leadId) {
          const firstLead = await db.prepare('SELECT id FROM crm_leads LIMIT 1').first<any>();
          leadId = firstLead?.id;
        }

        if (leadId) {
          const intId = generateId('crm_int');
          await db
            .prepare(`
              INSERT INTO crm_interactions (id, lead_id, user_id, interaction_date, platform, message, notes, created_at)
              VALUES (?, ?, ?, datetime('now'), ?, ?, ?, datetime('now'))
            `)
            .bind(intId, leadId, user.id, data.platform || 'WhatsApp', data.notes || data.message || 'Interação registrada via IA', null)
            .run();

          await db.prepare(`UPDATE crm_leads SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(leadId).run();
          createdId = intId;
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Ação "${detectedAction}" ainda não suportada para criação automática.` }, { status: 400 });
    }

    // Update interpretation if exists
    if (interpretation_id) {
      await db
        .prepare(`
          UPDATE ai_interpretations
          SET status = 'Confirmado', confirmed_at = datetime('now')
          WHERE id = ?
        `)
        .bind(interpretation_id)
        .run();
    }

    await logAudit({
      userId: user.id,
      action: 'AI_CONFIRM',
      module: detectedAction,
      recordId: createdId,
      afterData: data,
    });

    return NextResponse.json({
      success: true,
      created_id: createdId,
      message: `Ação ${detectedAction} confirmada e gravada com sucesso no banco de dados!`,
    });
  } catch (err: any) {
    console.error('[AI Confirm Error]:', err);
    return NextResponse.json({ error: 'Erro ao confirmar e salvar registro.' }, { status: 500 });
  }
}
