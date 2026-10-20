import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/custom-calendars - List all custom agendas for the current workspace
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';

    // Auto-create table if missing in D1
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS custom_calendars (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL DEFAULT 'ws_default',
          name TEXT NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#3B82F6',
          visibility TEXT NOT NULL DEFAULT 'group',
          created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();
    } catch {}

    let query = `
      SELECT c.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM calendar_events WHERE calendar_id = c.id) as events_count,
        (SELECT COUNT(*) FROM tasks WHERE calendar_id = c.id) as tasks_count
      FROM custom_calendars c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE (c.workspace_id = ? OR (c.workspace_id IS NULL AND ? = 'ws_default'))
    `;
    const params: any[] = [wsId, wsId];

    // Non-admin users only see group agendas or their own private agendas
    if (!isAdmin(user)) {
      query += ` AND (c.visibility = 'group' OR c.created_by = ?)`;
      params.push(user.id);
    }

    query += ` ORDER BY c.created_at ASC`;

    const { results } = await db.prepare(query).bind(...params).all();

    return NextResponse.json({ agendas: results || [] });
  } catch (error: any) {
    console.error('GET /api/custom-calendars error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar agendas' }, { status: 500 });
  }
}

// POST /api/custom-calendars - Create a custom agenda
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, visibility } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome da agenda é obrigatório' }, { status: 400 });
    }

    const db = getDb();
    const id = 'cal_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const wsId = user.workspace_id || 'ws_default';
    const agendaColor = color || '#3B82F6';
    const agendaVisibility = visibility === 'private' ? 'private' : 'group';
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO custom_calendars (id, workspace_id, name, description, color, visibility, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      wsId,
      name.trim(),
      description?.trim() || null,
      agendaColor,
      agendaVisibility,
      user.id,
      now,
      now
    ).run();

    const created = await db.prepare(`SELECT * FROM custom_calendars WHERE id = ?`).bind(id).first();

    return NextResponse.json({ agenda: created, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/custom-calendars error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar agenda' }, { status: 500 });
  }
}
