import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/crm/[id]/interactions - List interactions for a lead
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const { id } = await params;

    const lead = await db.prepare('SELECT id FROM crm_leads WHERE id = ?').bind(id).first();
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const interactions = await db
      .prepare(
        `SELECT i.*, u.name as author_name
        FROM crm_interactions i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.lead_id = ?
        ORDER BY i.interaction_date DESC, i.created_at DESC`
      )
      .bind(id)
      .all();

    return NextResponse.json({
      data: interactions.results,
      interactions: interactions.results,
    });
  } catch (error) {
    console.error('GET /api/crm/[id]/interactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/crm/[id]/interactions - Add interaction and update lead activity
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();
    const { id } = await params;

    const lead = await db.prepare('SELECT id FROM crm_leads WHERE id = ?').bind(id).first();
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const platform = body.platform || body.type || 'WhatsApp';
    const message = (body.message || body.notes || '').trim();
    const notes = body.notes || null;
    const now = new Date().toISOString();
    const interactionDate = body.interaction_date || now;

    if (!message) {
      return NextResponse.json({ error: 'A descrição da interação é obrigatória.' }, { status: 400 });
    }

    const interactionId =
      'intr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    await db
      .prepare(
        `INSERT INTO crm_interactions (id, lead_id, user_id, interaction_date, platform, message, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(interactionId, id, user.id, interactionDate, platform, message, notes, now)
      .run();

    // Update lead last_activity_at and updated_at
    await db
      .prepare(`UPDATE crm_leads SET last_activity_at = ?, updated_at = ? WHERE id = ?`)
      .bind(now, now, id)
      .run();

    await logAudit(user.id, 'crm_interactions', 'CREATE', interactionId, { lead_id: id, platform, message });

    const interaction = await db
      .prepare(
        `SELECT i.*, u.name as author_name
        FROM crm_interactions i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.id = ?`
      )
      .bind(interactionId)
      .first();

    return NextResponse.json({ data: interaction, success: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/crm/[id]/interactions error:', error);
    return NextResponse.json({ error: 'Erro ao registrar interação.' }, { status: 500 });
  }
}
