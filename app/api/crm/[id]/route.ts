import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { ensureCrmLeadsSchema } from '../route';
import { mapLegacyStatus, getFollowUpInfo } from '@/lib/crm-utils';

// GET /api/crm/[id] - Single lead with interactions and status movement history
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    await ensureCrmLeadsSchema(db);

    const { id } = await params;

    const rawLead = await db
      .prepare(
        `SELECT
          l.*,
          COALESCE(l.platform, l.source, 'WhatsApp') AS platform,
          COALESCE(l.source, l.platform, 'WhatsApp') AS source,
          COALESCE(l.primary_channel, 'WhatsApp') AS primary_channel,
          COALESCE(l.city, '') AS city,
          COALESCE(l.whatsapp, l.phone, '') AS whatsapp,
          u.name as assignee_name,
          CAST((julianday('now') - julianday(COALESCE(l.last_interaction_at, l.last_activity_at))) AS INTEGER) > 7 as is_inactive
        FROM crm_leads l
        LEFT JOIN users u ON u.id = l.assignee_id
        WHERE l.id = ?`
      )
      .bind(id)
      .first();

    if (!rawLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const normalizedStatus = mapLegacyStatus((rawLead as any).status, (rawLead as any).notes, (rawLead as any).description);
    const followUp = getFollowUpInfo({
      status: normalizedStatus,
      last_interaction_at: (rawLead as any).last_interaction_at,
    });

    const lead = {
      ...(rawLead as any),
      status: normalizedStatus,
      primary_channel: (rawLead as any).primary_channel || 'WhatsApp',
      follow_up_status: followUp.status,
      follow_up_label: followUp.label,
      business_days_without_contact: followUp.businessDays,
    };

    // 1. Histórico de Interações (contatos reais)
    const interactions = await db
      .prepare(
        `SELECT
          i.id,
          i.lead_id,
          i.user_id,
          i.interaction_date,
          COALESCE(i.channel, i.platform, i.type, 'WhatsApp') AS platform,
          COALESCE(i.channel, i.platform, 'WhatsApp') AS channel,
          COALESCE(i.type, 'Mensagem enviada') AS type,
          COALESCE(i.message, i.notes, '') AS message,
          COALESCE(i.notes, i.message, '') AS notes,
          COALESCE(i.created_at, i.interaction_date) AS created_at,
          u.name AS author_name
        FROM crm_interactions i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.lead_id = ?
        ORDER BY i.interaction_date DESC, i.created_at DESC`
      )
      .bind(id)
      .all();

    // 2. Histórico Persistente de Movimentações de Status (Requisito 2)
    const statusHistory = await db
      .prepare(
        `SELECT
          h.id,
          h.lead_id,
          h.previous_status,
          h.new_status,
          h.moved_at,
          h.user_id,
          COALESCE(h.user_name, u.name, 'Sistema') AS user_name,
          h.duration_seconds,
          h.notes,
          h.created_at
        FROM crm_status_history h
        LEFT JOIN users u ON u.id = h.user_id
        WHERE h.lead_id = ?
        ORDER BY h.moved_at DESC, h.created_at DESC`
      )
      .bind(id)
      .all();

    // Contagem de quantas vezes o lead passou por cada status
    const statusCounts: Record<string, number> = {};
    (statusHistory.results || []).forEach((item: any) => {
      const s = item.new_status;
      if (s) {
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      }
    });

    return NextResponse.json({
      data: {
        ...lead,
        interactions: interactions.results || [],
        status_history: statusHistory.results || [],
        status_counts: statusCounts,
      },
    });
  } catch (error) {
    console.error('GET /api/crm/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/crm/[id] - Update lead (and record status change if status changed)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();
    await ensureCrmLeadsSchema(db);

    const { id } = await params;

    const existing = await db.prepare('SELECT * FROM crm_leads WHERE id = ?').bind(id).first<any>();
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const payload: Record<string, any> = { ...body };

    if ('platform' in payload && !('source' in payload)) payload.source = payload.platform;
    if ('source' in payload && !('platform' in payload)) payload.platform = payload.source;
    if ('social_links' in payload && payload.social_links && typeof payload.social_links !== 'string') {
      payload.social_links = JSON.stringify(payload.social_links);
    }

    const allowedFields = [
      'contact_name',
      'company',
      'email',
      'phone',
      'phone2',
      'whatsapp',
      'city',
      'address',
      'platform',
      'source',
      'primary_channel',
      'status',
      'assignee_id',
      'notes',
      'estimated_value',
      'website',
      'facebook',
      'linkedin',
      'instagram',
      'segment',
      'description',
      'social_links',
      'status_entered_at'
    ];

    const updates: string[] = [];
    const values: unknown[] = [];
    const now = new Date().toISOString();

    // Verificação de alteração de status (Requisito 2)
    const isStatusChanging = 'status' in payload && payload.status && payload.status !== existing.status;
    let durationSeconds = 0;

    if (isStatusChanging) {
      const prevDateStr = existing.status_entered_at || existing.updated_at || existing.created_at;
      if (prevDateStr) {
        const prevDate = new Date(prevDateStr);
        if (!isNaN(prevDate.getTime())) {
          durationSeconds = Math.max(0, Math.floor((new Date(now).getTime() - prevDate.getTime()) / 1000));
        }
      }

      // Atualiza status_entered_at para a data da movimentação
      payload.status_entered_at = now;

      // Registra a movimentação no histórico persistente de status
      const histId = 'csh_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const moveNotes = body.status_change_notes || body.move_notes || null;

      try {
        await db
          .prepare(`
            INSERT INTO crm_status_history
              (id, lead_id, previous_status, new_status, moved_at, user_id, user_name, duration_seconds, notes, workspace_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            histId,
            id,
            existing.status,
            payload.status,
            now,
            user.id,
            user.name || 'Usuário',
            durationSeconds,
            moveNotes,
            existing.workspace_id || user.workspace_id || 'ws_default',
            now
          )
          .run();
      } catch (histErr) {
        console.warn('Erro ao inserir crm_status_history:', histErr);
      }
    }

    for (const field of allowedFields) {
      if (field in payload) {
        updates.push(`${field} = ?`);
        values.push(payload[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Requisito 3: Alterar status, abrir lead ou editar dados NÃO altera last_contact_at ou last_interaction_at!
    // Apenas last_activity_at e updated_at são atualizados.
    updates.push('last_activity_at = ?', 'updated_at = ?');
    values.push(now, now, id);

    await db
      .prepare(`UPDATE crm_leads SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    await logAudit(user.id, 'crm_leads', 'UPDATE', id, {
      ...body,
      previous_status: isStatusChanging ? existing.status : undefined,
    });

    const updatedRaw = await db
      .prepare(
        `SELECT l.*,
          COALESCE(l.platform, l.source, 'WhatsApp') AS platform,
          COALESCE(l.source, l.platform, 'WhatsApp') AS source,
          COALESCE(l.primary_channel, 'WhatsApp') AS primary_channel,
          COALESCE(l.city, '') AS city,
          COALESCE(l.whatsapp, l.phone, '') AS whatsapp,
          u.name as assignee_name,
          CAST((julianday('now') - julianday(COALESCE(l.last_interaction_at, l.last_activity_at))) AS INTEGER) > 7 as is_inactive
        FROM crm_leads l
        LEFT JOIN users u ON u.id = l.assignee_id
        WHERE l.id = ?`
      )
      .bind(id)
      .first<any>();

    const normalizedStatus = mapLegacyStatus(updatedRaw.status, updatedRaw.notes, updatedRaw.description);
    const followUp = getFollowUpInfo({
      status: normalizedStatus,
      last_interaction_at: updatedRaw.last_interaction_at,
    });

    const updated = {
      ...updatedRaw,
      status: normalizedStatus,
      follow_up_status: followUp.status,
      follow_up_label: followUp.label,
      business_days_without_contact: followUp.businessDays,
    };

    return NextResponse.json({ data: updated, success: true });
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

    const existing = await db.prepare('SELECT * FROM crm_leads WHERE id = ?').bind(id).first<any>();
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    await db.prepare('DELETE FROM crm_status_history WHERE lead_id = ?').bind(id).run();
    await db.prepare('DELETE FROM crm_interactions WHERE lead_id = ?').bind(id).run();
    await db.prepare('DELETE FROM crm_leads WHERE id = ?').bind(id).run();

    await logAudit(user.id, 'crm_leads', 'DELETE', id, { contact_name: existing.contact_name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/crm/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
