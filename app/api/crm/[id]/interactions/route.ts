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
          message TEXT DEFAULT '',
          notes TEXT,
          type TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)
      .run();
  } catch {}

  const alters = [
    'ALTER TABLE crm_interactions ADD COLUMN platform TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN message TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN type TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN notes TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN created_at TEXT',
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
          COALESCE(i.platform, i.type, 'WhatsApp') AS platform,
          COALESCE(i.message, i.notes, '') AS message,
          COALESCE(i.notes, i.message, '') AS notes,
          COALESCE(i.type, i.platform, 'WhatsApp') AS type,
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
    const platform = (body.platform || body.type || 'WhatsApp').trim();
    const message = (body.message || body.notes || '').trim();
    const notes = body.notes || message; // Preenche notes com message caso haja constraint NOT NULL
    const type = body.type || platform;  // Preenche type com platform caso haja constraint NOT NULL
    const now = new Date().toISOString();
    const interactionDate = body.interaction_date || now;

    if (!message) {
      return NextResponse.json({ error: 'A descrição da interação é obrigatória.' }, { status: 400 });
    }

    const interactionId =
      'intr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    // Inserção com fallback para schemas diferentes de SQLite / D1
    try {
      await db
        .prepare(
          `INSERT INTO crm_interactions (id, lead_id, user_id, interaction_date, platform, message, notes, type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(interactionId, id, user.id, interactionDate, platform, message, notes, type, now)
        .run();
    } catch (insertErr) {
      // Fallback para schema original (type, notes)
      await db
        .prepare(
          `INSERT INTO crm_interactions (id, lead_id, user_id, interaction_date, type, notes)
          VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(interactionId, id, user.id, interactionDate, type, notes)
        .run();
    }

    // Atualiza data de última atividade do Lead
    try {
      await db
        .prepare(`UPDATE crm_leads SET last_activity_at = ?, updated_at = ? WHERE id = ?`)
        .bind(now, now, id)
        .run();
    } catch {}

    try {
      await logAudit(user.id, 'crm_interactions', 'CREATE', interactionId, { lead_id: id, platform, message });
    } catch {}

    const rawInteraction = await db
      .prepare(
        `SELECT
          i.id,
          i.lead_id,
          i.user_id,
          i.interaction_date,
          COALESCE(i.platform, i.type, ?) AS platform,
          COALESCE(i.message, i.notes, ?) AS message,
          COALESCE(i.notes, i.message, ?) AS notes,
          COALESCE(i.type, i.platform, ?) AS type,
          COALESCE(i.created_at, i.interaction_date) AS created_at,
          u.name AS author_name
        FROM crm_interactions i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.id = ?`
      )
      .bind(platform, message, message, platform, interactionId)
      .first();

    const formattedInteraction = rawInteraction || {
      id: interactionId,
      lead_id: id,
      user_id: user.id,
      interaction_date: interactionDate,
      platform,
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
