import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ tasks: [], clients: [], events: [], finance: [] });
    }

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';
    const queryPattern = `%${q}%`;

    // 1. Search Tasks
    let taskSql = `
      SELECT id, name as title, status, delivery_date as date, 'task' as type
      FROM tasks
      WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        AND (name LIKE ? OR description LIKE ?)
    `;
    const taskParams: any[] = [wsId, wsId, queryPattern, queryPattern];
    if (!isAdmin(user)) {
      taskSql += ` AND (visibility != 'private' OR visibility IS NULL OR created_by = ?)`;
      taskParams.push(user.id);
    }
    taskSql += ` LIMIT 5`;

    const { results: tasks } = await db.prepare(taskSql).bind(...taskParams).all();

    // 2. Search Clients
    let clients: any[] = [];
    if (user.role !== 'CLIENTE') {
      const { results: clientResults } = await db.prepare(`
        SELECT id, name as title, email as subtitle, status, 'client' as type
        FROM clients
        WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
          AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
        LIMIT 5
      `).bind(wsId, wsId, queryPattern, queryPattern, queryPattern).all();
      clients = clientResults || [];
    }

    // 3. Search Calendar Events
    let eventSql = `
      SELECT id, title, event_date as date, location, 'event' as type
      FROM calendar_events
      WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        AND (title LIKE ? OR description LIKE ? OR location LIKE ?)
    `;
    const eventParams: any[] = [wsId, wsId, queryPattern, queryPattern, queryPattern];
    if (!isAdmin(user)) {
      eventSql += ` AND (visibility != 'private' OR visibility IS NULL OR created_by = ?)`;
      eventParams.push(user.id);
    }
    eventSql += ` LIMIT 5`;

    const { results: events } = await db.prepare(eventSql).bind(...eventParams).all();

    // 4. Search Financial Transactions (Admins only)
    let finance: any[] = [];
    if (isAdmin(user)) {
      const { results: finResults } = await db.prepare(`
        SELECT id, description as title, amount, type as sub_type, status, due_date as date, 'finance' as type
        FROM financial_transactions
        WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
          AND description LIKE ?
        LIMIT 5
      `).bind(wsId, wsId, queryPattern).all();
      finance = finResults || [];
    }

    return NextResponse.json({
      tasks: tasks || [],
      clients: clients || [],
      events: events || [],
      finance: finance || [],
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: error.message || 'Erro na busca' }, { status: 500 });
  }
}
