import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH /api/custom-calendars/[id] - Update custom agenda
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, color, visibility } = body;

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';

    const existing: any = await db.prepare(
      `SELECT * FROM custom_calendars WHERE id = ? AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))`
    ).bind(id, wsId, wsId).first();

    if (!existing) {
      return NextResponse.json({ error: 'Agenda não encontrada' }, { status: 404 });
    }

    // Only creator or admin can update
    if (!isAdmin(user) && existing.created_by !== user.id) {
      return NextResponse.json({ error: 'Sem permissão para alterar esta agenda' }, { status: 403 });
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedDesc = description !== undefined ? description?.trim() : existing.description;
    const updatedColor = color !== undefined ? color : existing.color;
    const updatedVis = visibility !== undefined ? (visibility === 'private' ? 'private' : 'group') : existing.visibility;
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE custom_calendars
      SET name = ?, description = ?, color = ?, visibility = ?, updated_at = ?
      WHERE id = ?
    `).bind(updatedName, updatedDesc, updatedColor, updatedVis, now, id).run();

    const updated = await db.prepare(`SELECT * FROM custom_calendars WHERE id = ?`).bind(id).first();

    return NextResponse.json({ agenda: updated, success: true });
  } catch (error: any) {
    console.error('PATCH /api/custom-calendars/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar agenda' }, { status: 500 });
  }
}

// DELETE /api/custom-calendars/[id] - Delete custom agenda
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';

    const existing: any = await db.prepare(
      `SELECT * FROM custom_calendars WHERE id = ? AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))`
    ).bind(id, wsId, wsId).first();

    if (!existing) {
      return NextResponse.json({ error: 'Agenda não encontrada' }, { status: 404 });
    }

    if (!isAdmin(user) && existing.created_by !== user.id) {
      return NextResponse.json({ error: 'Sem permissão para excluir esta agenda' }, { status: 403 });
    }

    // Unlink any calendar events or tasks from this calendar
    try {
      await db.prepare(`UPDATE calendar_events SET calendar_id = NULL WHERE calendar_id = ?`).bind(id).run();
      await db.prepare(`UPDATE tasks SET calendar_id = NULL WHERE calendar_id = ?`).bind(id).run();
    } catch {}

    await db.prepare(`DELETE FROM custom_calendars WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true, message: 'Agenda excluída com sucesso' });
  } catch (error: any) {
    console.error('DELETE /api/custom-calendars/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir agenda' }, { status: 500 });
  }
}
