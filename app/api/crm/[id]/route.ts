import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/crm/[id] - Single lead with interactions
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const { id } = await params;

    const lead = await db
      .prepare(
        `SELECT
          l.*,
          u.name as assignee_name,
          CAST((julianday('now') - julianday(l.last_activity_at)) AS INTEGER) > 7 as is_inactive
        FROM crm_leads l
        LEFT JOIN users u ON u.id = l.assignee_id
        WHERE l.id = ?`
      )
      .bind(id)
      .first();

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const interactions = await db
      .prepare(
        `SELECT i.*, u.name as author_name
        FROM crm_interactions i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.lead_id = ?
        ORDER BY i.interaction_date DESC`
      )
      .bind(id)
      .all();

    return NextResponse.json({ data: { ...lead, interactions: interactions.results } });
  } catch (error) {
    console.error('GET /api/crm/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/crm/[id] - Update lead
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();
    const { id } = await params;

    const existing = await db.prepare('SELECT * FROM crm_leads WHERE id = ?').bind(id).first();
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const body = await request.json();
    const payload: Record<string, any> = { ...body };
    if ('whatsapp' in payload && !('phone' in payload)) payload.phone = payload.whatsapp;
    if ('platform' in payload && !('source' in payload)) payload.source = payload.platform;

    const allowedFields = ['contact_name', 'company', 'email', 'phone', 'status', 'assignee_id', 'notes', 'source', 'estimated_value'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (field in payload) {
        updates.push(`${field} = ?`);
        values.push(payload[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    updates.push('last_activity_at = ?', 'updated_at = ?');
    values.push(now, now, id);

    await db
      .prepare(`UPDATE crm_leads SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    await logAudit(user.id, 'crm_leads', 'UPDATE', id, body);

    const updated = await db
      .prepare(
        `SELECT l.*, u.name as assignee_name,
          CAST((julianday('now') - julianday(l.last_activity_at)) AS INTEGER) > 7 as is_inactive
        FROM crm_leads l
        LEFT JOIN users u ON u.id = l.assignee_id
        WHERE l.id = ?`
      )
      .bind(id)
      .first();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/crm/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/crm/[id] - Delete lead (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const { id } = await params;

    const existing = await db.prepare('SELECT * FROM crm_leads WHERE id = ?').bind(id).first();
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    await db.prepare('DELETE FROM crm_interactions WHERE lead_id = ?').bind(id).run();
    await db.prepare('DELETE FROM crm_leads WHERE id = ?').bind(id).run();

    await logAudit(user.id, 'crm_leads', 'DELETE', id, { contact_name: (existing as Record<string, unknown>).contact_name });

    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/crm/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
