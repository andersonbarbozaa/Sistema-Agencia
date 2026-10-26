import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

// Garante colunas de CRM Leads no D1 e SQLite
async function ensureCrmLeadsSchema(db: any) {
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
          platform TEXT,
          source TEXT,
          status TEXT NOT NULL DEFAULT 'Novo',
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
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      .run();
  } catch {}

  const alters = [
    'ALTER TABLE crm_leads ADD COLUMN city TEXT',
    'ALTER TABLE crm_leads ADD COLUMN platform TEXT',
    'ALTER TABLE crm_leads ADD COLUMN source TEXT',
    'ALTER TABLE crm_leads ADD COLUMN whatsapp TEXT',
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
  ];
  for (const sql of alters) {
    try {
      await db.prepare(sql).run();
    } catch {}
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = 50;
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
    if (assignee_id) {
      conditions.push('l.assignee_id = ?');
      params.push(assignee_id);
    }
    if (search) {
      conditions.push('(l.contact_name LIKE ? OR l.company LIKE ? OR l.city LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
          COALESCE(l.city, '') AS city,
          COALESCE(l.whatsapp, l.phone, '') AS whatsapp,
          u.name as assignee_name,
          CAST((julianday('now') - julianday(l.last_activity_at)) AS INTEGER) > 7 as is_inactive
        FROM crm_leads l
        LEFT JOIN users u ON u.id = l.assignee_id
        ${where}
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?`
      )
      .bind(...params, limit, offset)
      .all();

    return NextResponse.json({
      data: leads.results,
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
    const phone = body.phone || body.whatsapp || null;
    const whatsapp = body.whatsapp || body.phone || null;
    const city = body.city ?? null;
    const platform = body.platform || body.source || 'WhatsApp';
    const source = body.source || body.platform || 'WhatsApp';
    const status = body.status ?? 'Novo';
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

    try {
      await db
        .prepare(
          `INSERT INTO crm_leads
            (id, contact_name, company, email, phone, whatsapp, city, platform, source, status, assignee_id, notes, estimated_value, first_contact_date, workspace_id, website, facebook, linkedin, instagram, segment, description, social_links, last_activity_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          contact_name,
          company,
          email,
          phone,
          whatsapp,
          city,
          platform,
          source,
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
          now
        )
        .run();
    } catch (insertErr) {
      // Fallback para schema parcial
      await db
        .prepare(
          `INSERT INTO crm_leads
            (id, contact_name, company, email, phone, whatsapp, city, platform, source, status, assignee_id, notes, estimated_value, first_contact_date, workspace_id, last_activity_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          contact_name,
          company,
          email,
          phone,
          whatsapp,
          city,
          platform,
          source,
          status,
          assignee_id,
          notes,
          estimated_value,
          first_contact_date,
          wsId,
          now,
          now,
          now
        )
        .run();
    }

    await logAudit(user.id, 'crm_leads', 'CREATE', id, { contact_name, company, city, platform });

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
          COALESCE(l.city, ?) AS city,
          COALESCE(l.whatsapp, l.phone, '') AS whatsapp
        FROM crm_leads l
        WHERE l.id = ?`
      )
      .bind(platform, source, city || '', id)
      .first();

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    console.error('POST /api/crm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
