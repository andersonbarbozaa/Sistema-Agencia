import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { mapLegacyStatus, getFollowUpInfo } from '@/lib/crm-utils';

// Garante colunas de CRM Leads e Tabela de Histórico de Status no D1 e SQLite
export async function ensureCrmLeadsSchema(db: any) {
  try {
    await db
      .prepare(`
        CREATE TABLE IF NOT EXISTS crm_leads (
          id TEXT PRIMARY KEY,
          contact_name TEXT NOT NULL,
          company TEXT,
          email TEXT,
          phone TEXT,
          whatsapp TEXT,
          city TEXT,
          address TEXT,
          platform TEXT,
          source TEXT,
          primary_channel TEXT DEFAULT 'WhatsApp',
          status TEXT NOT NULL DEFAULT 'Novo lead',
          assignee_id TEXT,
          notes TEXT,
          estimated_value REAL DEFAULT 0,
          first_contact_date TEXT,
          workspace_id TEXT DEFAULT 'ws_default',
          website TEXT,
          facebook TEXT,
          linkedin TEXT,
          instagram TEXT,
          segment TEXT,
          description TEXT,
          social_links TEXT,
          last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_contact_at TEXT,
          last_reply_at TEXT,
          last_interaction_at TEXT,
          status_entered_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      .run();
  } catch {}

  // Tabela persistente de histórico de movimentação de status
  try {
    await db
      .prepare(`
        CREATE TABLE IF NOT EXISTS crm_status_history (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          previous_status TEXT,
          new_status TEXT NOT NULL,
          moved_at TEXT NOT NULL DEFAULT (datetime('now')),
          user_id TEXT,
          user_name TEXT,
          duration_seconds INTEGER DEFAULT 0,
          notes TEXT,
          workspace_id TEXT DEFAULT 'ws_default',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      .run();
  } catch {}

  try {
    await db
      .prepare('CREATE INDEX IF NOT EXISTS idx_crm_status_history_lead ON crm_status_history(lead_id)')
      .run();
  } catch {}

  const alters = [
    'ALTER TABLE crm_leads ADD COLUMN city TEXT',
    'ALTER TABLE crm_leads ADD COLUMN platform TEXT',
    'ALTER TABLE crm_leads ADD COLUMN source TEXT',
    'ALTER TABLE crm_leads ADD COLUMN whatsapp TEXT',
    'ALTER TABLE crm_leads ADD COLUMN primary_channel TEXT DEFAULT "WhatsApp"',
    'ALTER TABLE crm_leads ADD COLUMN last_contact_at TEXT',
    'ALTER TABLE crm_leads ADD COLUMN last_reply_at TEXT',
    'ALTER TABLE crm_leads ADD COLUMN last_interaction_at TEXT',
    'ALTER TABLE crm_leads ADD COLUMN status_entered_at TEXT',
    'ALTER TABLE crm_leads ADD COLUMN estimated_value REAL DEFAULT 0',
    'ALTER TABLE crm_leads ADD COLUMN first_contact_date TEXT',
    'ALTER TABLE crm_leads ADD COLUMN workspace_id TEXT DEFAULT "ws_default"',
    'ALTER TABLE crm_leads ADD COLUMN website TEXT',
    'ALTER TABLE crm_leads ADD COLUMN facebook TEXT',
    'ALTER TABLE crm_leads ADD COLUMN linkedin TEXT',
    'ALTER TABLE crm_leads ADD COLUMN instagram TEXT',
    'ALTER TABLE crm_leads ADD COLUMN segment TEXT',
    'ALTER TABLE crm_leads ADD COLUMN description TEXT',
    'ALTER TABLE crm_leads ADD COLUMN social_links TEXT',
    'ALTER TABLE crm_leads ADD COLUMN address TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN type TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN channel TEXT',
  ];
  for (const sql of alters) {
    try {
      await db.prepare(sql).run();
    } catch {}
  }

  // Sincroniza last_interaction_at com interações reais existentes se estiver nulo
  try {
    await db
      .prepare(`
        UPDATE crm_leads
        SET last_interaction_at = (
          SELECT MAX(COALESCE(interaction_date, created_at))
          FROM crm_interactions
          WHERE lead_id = crm_leads.id
        )
        WHERE last_interaction_at IS NULL AND EXISTS (
          SELECT 1 FROM crm_interactions WHERE lead_id = crm_leads.id
        )
      `)
      .run();
  } catch {}

  // Migração suave de status legados para o novo funil comercial
  try {
    const legacyLeads = await db
      .prepare(`
        SELECT id, status, notes, description, created_at, workspace_id
        FROM crm_leads
        WHERE status IN ('Novo', 'Em andamento', 'Aguardando resposta', 'Sem resposta', 'Finalizado positivo', 'Finalizado negativo')
      `)
      .all();

    if (legacyLeads?.results && legacyLeads.results.length > 0) {
      for (const lead of legacyLeads.results) {
        const newStatus = mapLegacyStatus(lead.status, lead.notes, lead.description);
        await db
          .prepare(`UPDATE crm_leads SET status = ?, status_entered_at = COALESCE(status_entered_at, created_at) WHERE id = ?`)
          .bind(newStatus, lead.id)
          .run();

        // Insere registro inicial no histórico se não existir
        const hasHistory = await db
          .prepare('SELECT 1 FROM crm_status_history WHERE lead_id = ? LIMIT 1')
          .bind(lead.id)
          .first();

        if (!hasHistory) {
          const histId = 'csh_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          await db
            .prepare(`
              INSERT INTO crm_status_history
                (id, lead_id, previous_status, new_status, moved_at, user_name, duration_seconds, notes, workspace_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
            `)
            .bind(
              histId,
              lead.id,
              lead.status !== newStatus ? lead.status : null,
              newStatus,
              lead.created_at || new Date().toISOString(),
              'Sistema (Migração)',
              `Migrado da etapa legada "${lead.status}" para "${newStatus}".`,
              lead.workspace_id || 'ws_default',
              lead.created_at || new Date().toISOString()
            )
            .run();
        }
      }
    }
  } catch (migErr) {
    console.warn('Erro ao verificar migração de status legados:', migErr);
  }
}

// GET /api/crm - List leads with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignee_id = searchParams.get('assignee_id');
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const segment = searchParams.get('segment');
    const follow_up = searchParams.get('follow_up'); // green, yellow, red, none, closed
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = parseInt(searchParams.get('limit') || '500', 10); // Permite carregar até 500 leads para funil/relatório
    const offset = (page - 1) * limit;

    const db = getDb();
    await ensureCrmLeadsSchema(db);

    const conditions: string[] = [];
    const params: unknown[] = [];

    const wsId = user.workspace_id || 'ws_default';
    conditions.push("(l.workspace_id = ? OR (l.workspace_id IS NULL AND ? = 'ws_default'))");
    params.push(wsId, wsId);

    if (status && status !== 'all') {
      conditions.push('l.status = ?');
      params.push(status);
    }
    if (city && city !== 'all') {
      conditions.push('l.city = ?');
      params.push(city);
    }
    if (segment && segment !== 'all') {
      conditions.push('l.segment = ?');
      params.push(segment);
    }
    if (assignee_id) {
      conditions.push('l.assignee_id = ?');
      params.push(assignee_id);
    }
    if (search) {
      conditions.push('(l.contact_name LIKE ? OR l.company LIKE ? OR l.city LIKE ? OR l.segment LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM crm_leads l ${where}`)
      .bind(...params)
      .first<{ total: number }>();

    const total = countResult?.total ?? 0;

    const leads = await db
      .prepare(
        `SELECT
          l.*,
          COALESCE(l.platform, l.source, 'WhatsApp') AS platform,
          COALESCE(l.source, l.platform, 'WhatsApp') AS source,
          COALESCE(l.primary_channel, 'WhatsApp') AS primary_channel,
          COALESCE(l.city, '') AS city,
          COALESCE(l.whatsapp, l.phone, '') AS whatsapp,
          u.name as assignee_name,
          CAST((julianday('now') - julianday(COALESCE(l.last_interaction_at, l.last_activity_at))) AS INTEGER) > 7 as is_inactive,
          (SELECT COUNT(*) FROM crm_interactions WHERE lead_id = l.id) as interactions_count
        FROM crm_leads l
        LEFT JOIN users u ON u.id = l.assignee_id
        ${where}
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?`
      )
      .bind(...params, limit, offset)
      .all();

    // Mapeia os leads calculando informações dinâmicas de acompanhamento
    let results = (leads.results || []).map((lead: any) => {
      // Normaliza status para o novo funil caso algum tenha ficado legado
      const normalizedStatus = mapLegacyStatus(lead.status, lead.notes, lead.description);
      const followUp = getFollowUpInfo({
        status: normalizedStatus,
        last_interaction_at: lead.last_interaction_at,
      });

      return {
        ...lead,
        status: normalizedStatus,
        primary_channel: lead.primary_channel || 'WhatsApp',
        follow_up_status: followUp.status,
        follow_up_label: followUp.label,
        business_days_without_contact: followUp.businessDays,
      };
    });

    if (follow_up && follow_up !== 'all') {
      results = results.filter((l: any) => l.follow_up_status === follow_up);
    }

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/crm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/crm - Create lead
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const contact_name = body.contact_name;
    const company = body.company ?? null;
    const email = body.email ?? null;
    const phone = body.phone ?? null;
    const whatsapp = body.whatsapp ?? null;
    const city = body.city ?? null;
    const address = body.address ?? null;
    const platform = body.platform || body.source || 'WhatsApp';
    const source = body.source || body.platform || 'WhatsApp';
    const primary_channel = body.primary_channel || 'WhatsApp';
    // Requisito 1: Todo novo lead entra automaticamente em "Novo lead"
    const status = 'Novo lead';
    const assignee_id = body.assignee_id ?? null;
    const notes = body.notes ?? null;
    const estimated_value = body.estimated_value ? parseFloat(body.estimated_value) : 0;
    const website = body.website ?? null;
    const facebook = body.facebook ?? null;
    const linkedin = body.linkedin ?? null;
    const instagram = body.instagram ?? null;
    const segment = body.segment ?? null;
    const description = body.description ?? null;
    const social_links = body.social_links
      ? (typeof body.social_links === 'string' ? body.social_links : JSON.stringify(body.social_links))
      : null;

    if (!contact_name) {
      return NextResponse.json({ error: 'contact_name is required' }, { status: 400 });
    }

    const db = getDb();
    await ensureCrmLeadsSchema(db);

    const id = 'lead_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';
    const first_contact_date = body.first_contact_date || now;

    // Não preenche last_contact_at nem last_interaction_at na criação (Requisito 4)
    await db
      .prepare(
        `INSERT INTO crm_leads
          (id, contact_name, company, email, phone, whatsapp, city, address, platform, source, primary_channel, status, assignee_id, notes, estimated_value, first_contact_date, workspace_id, website, facebook, linkedin, instagram, segment, description, social_links, last_activity_at, status_entered_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        contact_name,
        company,
        email,
        phone,
        whatsapp,
        city,
        address,
        platform,
        source,
        primary_channel,
        status,
        assignee_id,
        notes,
        estimated_value,
        first_contact_date,
        wsId,
        website,
        facebook,
        linkedin,
        instagram,
        segment,
        description,
        social_links,
        now,
        now,
        now,
        now
      )
      .run();

    // Requisito 2: Cria o primeiro registro histórico de entrada no status "Novo lead"
    const histId = 'csh_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    try {
      await db
        .prepare(`
          INSERT INTO crm_status_history
            (id, lead_id, previous_status, new_status, moved_at, user_id, user_name, duration_seconds, notes, workspace_id, created_at)
          VALUES (?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, ?)
        `)
        .bind(
          histId,
          id,
          status,
          now,
          user.id,
          user.name || 'Usuário',
          notes ? `Lead cadastrado: ${notes.slice(0, 80)}` : 'Lead cadastrado no funil comercial.',
          wsId,
          now
        )
        .run();
    } catch {}

    await logAudit(user.id, 'crm_leads', 'CREATE', id, { contact_name, company, city, platform, status });

    if (assignee_id && assignee_id !== user.id) {
      await createNotification(
        assignee_id,
        'lead_assigned',
        `Você foi designado para o lead: ${contact_name}`,
        id,
        'crm_lead'
      );
    }

    const lead = await db
      .prepare(
        `SELECT
          l.*,
          COALESCE(l.platform, l.source, ?) AS platform,
          COALESCE(l.source, l.platform, ?) AS source,
          COALESCE(l.primary_channel, ?) AS primary_channel,
          COALESCE(l.city, ?) AS city,
          COALESCE(l.whatsapp, l.phone, '') AS whatsapp
        FROM crm_leads l
        WHERE l.id = ?`
      )
      .bind(platform, source, primary_channel, city || '', id)
      .first();

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    console.error('POST /api/crm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
