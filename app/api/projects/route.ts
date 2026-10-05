
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// ─── GET /api/projects ───────────────────────────────────────────────────────
// List projects with optional filters: status, client_id.
// Includes client_name and task counts (total / completed).
// Cursor-based pagination (20 per page).
// CLIENTE role only sees projects linked to their own client_id.
export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter    = searchParams.get('status')?.trim()    ?? '';
    const clientIdFilter  = searchParams.get('client_id')?.trim() ?? '';
    const cursor          = searchParams.get('cursor')?.trim()    ?? ''; // created_at ISO string
    const limit           = 20;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // CLIENTE can only see their own projects
    if (user.role === 'CLIENTE') {
      if (!user.client_id) {
        return NextResponse.json({ data: [], pagination: { limit, hasNextPage: false, nextCursor: null } });
      }
      conditions.push('p.client_id = ?');
      params.push(user.client_id);
    } else {
      // Admin / collaborator: honour explicit client_id filter
      if (clientIdFilter) {
        conditions.push('p.client_id = ?');
        params.push(clientIdFilter);
      }
    }

    if (statusFilter) {
      conditions.push('p.status = ?');
      params.push(statusFilter);
    }

    if (cursor) {
      conditions.push('p.created_at < ?');
      params.push(cursor);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit + 1);

    const db = await getDb();

    const rows = await db
      .prepare(
        `SELECT
           p.id,
           p.name,
           p.description,
           p.status,
           p.client_id,
           c.name          AS client_name,
           p.start_date,
           p.deadline,
           p.deadline      AS end_date,
           p.value,
           p.created_at,
           p.updated_at,
           COUNT(t.id)                                          AS total_tasks,
           SUM(CASE WHEN t.status = 'Concluída' THEN 1 ELSE 0 END) AS completed_tasks
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id
         LEFT JOIN tasks   t ON t.project_id = p.id
         ${where}
         GROUP BY p.id
         ORDER BY p.created_at DESC
         LIMIT ?`
      )
      .bind(...params)
      .all();

    const projects = rows.results as Record<string, unknown>[];
    const hasNextPage = projects.length > limit;
    if (hasNextPage) projects.pop();

    const nextCursor =
      hasNextPage && projects.length > 0
        ? (projects[projects.length - 1].created_at as string)
        : null;

    return NextResponse.json({
      data: projects,
      pagination: { limit, hasNextPage, nextCursor },
    });
  } catch (error) {
    console.error('[GET /api/projects]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST /api/projects ──────────────────────────────────────────────────────
// Create a new project. Admin only.
// Required: name, client_id.
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { name, client_id } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Field "name" is required' },
        { status: 400 }
      );
    }
    if (!client_id || typeof client_id !== 'string' || !client_id.trim()) {
      return NextResponse.json(
        { error: 'Field "client_id" is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify client exists
    const client = await db
      .prepare('SELECT id FROM clients WHERE id = ?')
      .bind(client_id.trim())
      .first();

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const description = body.description ?? null;
    const status      = body.status      ?? 'Planejamento';
    const start_date  = body.start_date  ?? null;
    const deadline    = body.deadline    ?? body.end_date ?? null;
    const value       = body.value       ? Number(body.value) : 0;
    const notes       = body.notes       ?? null;

    // Generate ID
    const id =
      'prj_' +
      Math.random().toString(36).substring(2, 9) +
      Date.now().toString(36);

    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO projects (
           id, name, description, status, client_id,
           start_date, deadline, value, notes, created_by, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        name.trim(),
        description,
        status,
        client_id.trim(),
        start_date,
        deadline,
        value,
        notes,
        user.id,
        now,
        now
      )
      .run();

    await logAudit({
      userId:     user.id,
      action:     'CREATE',
      resource:   'projects',
      resourceId: id,
      details:    `Project "${name.trim()}" created for client "${client_id}"`,
    });

    const created = await db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/projects]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
