import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// Self-healing: garante que colunas necessárias existam em qualquer ambiente (D1 / SQLite)
async function ensureCrmInteractionsSchema(db: any) {
  try {
    await db
      .prepare(`
        CREATE TABLE IF NOT EXISTS crm_interactions (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          interaction_date TEXT NOT NULL DEFAULT (datetime('now')),
          platform TEXT DEFAULT 'WhatsApp',
          channel TEXT DEFAULT 'WhatsApp',
          message TEXT DEFAULT '',
          notes TEXT,
          type TEXT DEFAULT 'Mensagem enviada',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)
      .run();
  } catch {}

  const alters = [
    'ALTER TABLE crm_interactions ADD COLUMN platform TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN channel TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN message TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN type TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN notes TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN created_at TEXT',
    'ALTER TABLE crm_leads ADD COLUMN last_contact_at TEXT',
    'ALTER TABLE crm_leads ADD COLUMN last_reply_at TEXT',
    'ALTER TABLE crm_leads ADD COLUMN last_interaction_at TEXT',
  ];
  for (const sql of alters) {
    try {
      await db.prepare(sql).run();
    } catch {}
  }
}

// GET /api/crm/[id]/interactions - List interactions for a lead
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    await ensureCrmInteractionsSchema(db);

    const { id } = await params;

    const lead = await db.prepare('SELECT id FROM crm_leads WHERE id = ?').bind(id).first();
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const interactions = await db
      .prepare(
        `SELECT
          i.id,
          i.lead_id,
          i.user_id,
          i.interaction_date,
          COALESCE(i.channel, i.platform, 'WhatsApp') AS platform,
          COALESCE(i.channel, i.platform, 'WhatsApp') AS channel,
          COALESCE(i.message, i.notes, '') AS message,
          COALESCE(i.notes, i.message, '') AS notes,
          COALESCE(i.type, 'Mensagem enviada') AS type,
          COALESCE(i.created_at, i.interaction_date) AS created_at,
          u.name AS author_name
        FROM crm_interactions i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.lead_id = ?
        ORDER BY i.interaction_date DESC, i.created_at DESC`
      )
      .bind(id)
      .all();

    return NextResponse.json({
      data: interactions.results || [],
      interactions: interactions.results || [],
    });
  } catch (error) {
    console.error('GET /api/crm/[id]/interactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/crm/[id]/interactions - Add real contact interaction and update lead contact dates (Requisito 3)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
    if (user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Acesso negado para perfil de cliente.' }, { status: 403 });
    }

    const db = getDb();
    await ensureCrmInteractionsSchema(db);

    const { id } = await params;

    const lead = await db.prepare('SELECT id FROM crm_leads WHERE id = ?').bind(id).first();
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const channel = (body.channel || body.platform || 'WhatsApp').trim();
    const type = (body.type || 'Mensagem enviada').trim();
    const message = (body.message || body.notes || '').trim();
    const notes = body.notes || message;
    const now = new Date().toISOString();
    const interactionDate = body.interaction_date || now;

    if (!message) {
      return NextResponse.json({ error: 'A descrição ou observação do contato é obrigatória.' }, { status: 400 });
    }

    const interactionId =
      'intr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    try {
      await db
        .prepare(
          `INSERT INTO crm_interactions (id, lead_id, user_id, interaction_date, platform, channel, message, notes, type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(interactionId, id, user.id, interactionDate, channel, channel, message, notes, type, now)
        .run();
    } catch {
      // Fallback para schema legado
      await db
        .prepare(
          `INSERT INTO crm_interactions (id, lead_id, user_id, interaction_date, platform, message, notes, type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(interactionId, id, user.id, interactionDate, channel, message, notes, type, now)
        .run();
    }

    // Requisito 3: Atualiza data do último contato SOMENTE quando uma interação real for registrada!
    // Mantém separadas as datas de último contato realizado pela equipe e última resposta recebida do lead
    const isReply = type === 'Resposta recebida';
    try {
      if (isReply) {
        await db
          .prepare(
            `UPDATE crm_leads
             SET last_reply_at = ?,
                 last_interaction_at = ?,
                 last_activity_at = ?,
                 updated_at = ?
             WHERE id = ?`
          )
          .bind(interactionDate, interactionDate, now, now, id)
          .run();
      } else {
        await db
          .prepare(
            `UPDATE crm_leads
             SET last_contact_at = ?,
                 last_interaction_at = ?,
                 last_activity_at = ?,
                 updated_at = ?
             WHERE id = ?`
          )
          .bind(interactionDate, interactionDate, now, now, id)
          .run();
      }
    } catch (updateErr) {
      console.warn('Erro ao atualizar datas de contato do lead:', updateErr);
    }

    try {
      await logAudit(user.id, 'crm_interactions', 'CREATE', interactionId, {
        lead_id: id,
        channel,
        type,
        message,
        interactionDate,
      });
    } catch {}

    const formattedInteraction = {
      id: interactionId,
      lead_id: id,
      user_id: user.id,
      interaction_date: interactionDate,
      platform: channel,
      channel,
      message,
      notes,
      type,
      created_at: now,
      author_name: user.name || 'Usuário',
    };

    return NextResponse.json({ data: formattedInteraction, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/crm/[id]/interactions error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao registrar interação.' },
      { status: 500 }
    );
  }
}
