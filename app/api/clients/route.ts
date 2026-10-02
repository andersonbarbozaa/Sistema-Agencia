import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// ─── GET /api/clients ────────────────────────────────────────────────────────
// List clients with cursor-based pagination, optional search and status filter.
// CLIENTE role is forbidden.
export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CLIENTE role cannot access this endpoint
    if (user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search   = searchParams.get('search')?.trim() ?? '';
    const status   = searchParams.get('status')?.trim() ?? '';
    const cursor   = searchParams.get('cursor')?.trim() ?? ''; // ISO string of created_at
    const limit    = 20;

    const db = await getDb();

    // Build dynamic WHERE clauses
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    const wsId = user.workspace_id || 'ws_default';
    conditions.push('(c.workspace_id = ? OR (c.workspace_id IS NULL AND ? = "ws_default"))');
    params.push(wsId, wsId);

    if (search) {
      conditions.push('(c.name LIKE ? OR c.trade_name LIKE ? OR c.document LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    // Cursor-based pagination: records created after the cursor
    if (cursor) {
      conditions.push('c.created_at < ?');
      params.push(cursor);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch limit + 1 to determine if there is a next page
    params.push(limit + 1);

    const rows = await db
      .prepare(
        `SELECT
           c.id,
           c.name,
           c.corporate_name,
           c.trade_name,
           c.avatar_url,
           c.document,
           c.city,
           c.state,
           c.email,
           c.phone,
           c.whatsapp,
           c.address,
           c.website,
           c.instagram,
           c.responsible_user_id,
           u.name AS responsible_name,
           c.status,
           c.created_at
         FROM clients c
         LEFT JOIN users u ON u.id = c.responsible_user_id
         ${where}
         ORDER BY c.created_at DESC
         LIMIT ?`
      )
      .bind(...params)
      .all();

    const clients = rows.results as Record<string, unknown>[];
    const hasNextPage = clients.length > limit;
    if (hasNextPage) clients.pop();

    const nextCursor =
      hasNextPage && clients.length > 0
        ? (clients[clients.length - 1].created_at as string)
        : null;

    return NextResponse.json({
      data: clients,
      pagination: {
        limit,
        hasNextPage,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('[GET /api/clients]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST /api/clients ───────────────────────────────────────────────────────
// Create a new client. Admin only.
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

    // Required field
    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Field "name" is required' },
        { status: 400 }
      );
    }

    // Optional fields
    const corporate_name      = body.corporate_name      ?? null;
    const trade_name          = body.trade_name          ?? null;
    const avatar_url          = body.avatar_url          ?? null;
    const document            = body.document            ?? body.cnpj ?? null;
    const email               = body.email               ?? null;
    const phone               = body.phone               ?? null;
    const whatsapp            = body.whatsapp            ?? null;
    const address             = body.address             ?? null;
    const city                = body.city                ?? null;
    const state               = body.state               ?? null;
    const website             = body.website             ?? null;
    const instagram           = body.instagram           ?? null;
    const responsible_user_id = body.responsible_user_id ?? null;
    const notes               = body.notes               ?? null;
    const status              = body.status              ?? 'ativo';

    // Generate ID
    const id =
      'cli_' +
      Math.random().toString(36).substring(2, 9) +
      Date.now().toString(36);

    const now = new Date().toISOString();

    const db = await getDb();

    const wsId = user.workspace_id || 'ws_default';

    await db
      .prepare(
        `INSERT INTO clients (
           id, name, corporate_name, trade_name, avatar_url, document,
           email, phone, whatsapp, address, city, state, website, instagram,
           responsible_user_id, notes, status, workspace_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        name.trim(),
        corporate_name,
        trade_name,
        avatar_url,
        document,
        email,
        phone,
        whatsapp,
        address,
        city,
        state,
        website,
        instagram,
        responsible_user_id,
        notes,
        status,
        wsId,
        now,
        now
      )
      .run();

    await logAudit({
      userId:     user.id,
      action:     'CREATE',
      resource:   'clients',
      resourceId: id,
      details:    `Client "${name.trim()}" created`,
    });

    const created = await db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/clients]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
