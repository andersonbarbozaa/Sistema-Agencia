export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

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
    const limit = 20;
    const offset = (page - 1) * limit;

    const db = getDb();

    const conditions: string[] = [];
    const params: unknown[] = [];

    const wsId = user.workspace_id || 'ws_default';
    conditions.push('(l.workspace_id = ? OR (l.workspace_id IS NULL AND ? = "ws_default"))');
    params.push(wsId, wsId);

    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    }
    if (assignee_id) {
      conditions.push('l.assignee_id = ?');
      params.push(assignee_id);
    }
    if (search) {
      conditions.push('(l.contact_name LIKE ? OR l.company LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
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

    const body = await request.json();
    const contact_name = body.contact_name;
    const company = body.company ?? null;
    const email = body.email ?? null;
    const phone = body.phone || body.whatsapp || null;
    const status = body.status ?? 'Novo';
    const assignee_id = body.assignee_id ?? null;
    const notes = body.notes ?? null;
    const source = body.source || body.platform || null;
    const estimated_value = body.estimated_value ?? null;

    if (!contact_name) {
      return NextResponse.json({ error: 'contact_name is required' }, { status: 400 });
    }

    const db = getDb();
    const id = 'lead_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';

    await db
      .prepare(
        `INSERT INTO crm_leads
          (id, contact_name, company, email, phone, status, assignee_id, notes, source, estimated_value, workspace_id, last_activity_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        contact_name,
        company,
        email,
        phone,
        status ?? 'Novo',
        assignee_id ?? null,
        notes ?? null,
        source ?? null,
        estimated_value ?? null,
        wsId,
        now,
        now,
        now
      )
      .run();

    await logAudit(user.id, 'crm_leads', 'CREATE', id, { contact_name, company });

    if (assignee_id && assignee_id !== user.id) {
      await createNotification(
        assignee_id,
        'lead_assigned',
        `Você foi designado para o lead: ${contact_name}`,
        id,
        'crm_lead'
      );
    }

    const lead = await db.prepare('SELECT * FROM crm_leads WHERE id = ?').bind(id).first();
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    console.error('POST /api/crm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
