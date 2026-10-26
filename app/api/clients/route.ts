
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin, hashPassword } from '@/lib/auth';
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
    const limit    = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const wsId     = user.workspace_id || 'ws_default';

    const db = await getDb();

    // Auto-heal D1 columns if missing
    try {
      await db.exec('ALTER TABLE clients ADD COLUMN avatar_url TEXT');
    } catch {}
    try {
      await db.exec('ALTER TABLE clients ADD COLUMN social_links TEXT');
    } catch {}

    // Auto-sync: Ensure all users with role 'CLIENTE' exist as clients in clients table
    try {
      const clientUsers = await db
        .prepare(`
          SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.status, u.client_id, u.workspace_id, u.created_at, u.updated_at
          FROM users u
          WHERE UPPER(u.role) = 'CLIENTE'
        `)
        .all();

      const userRows = (clientUsers.results || []) as any[];
      for (const u of userRows) {
        let existingClient: any = null;
        if (u.client_id) {
          existingClient = await db.prepare('SELECT id, name FROM clients WHERE id = ?').bind(u.client_id).first();
        }
        if (!existingClient && u.email) {
          existingClient = await db.prepare('SELECT id, name FROM clients WHERE lower(email) = lower(?)').bind(u.email).first();
          if (existingClient) {
            await db.prepare('UPDATE users SET client_id = ? WHERE id = ?').bind(existingClient.id, u.id).run();
          }
        }
        if (!existingClient) {
          const newClientId = u.client_id || ('cli_' + u.id.replace(/^usr_/, ''));
          const nowStr = new Date().toISOString();
          const targetWs = u.workspace_id || wsId || 'ws_default';

          try {
            await db.prepare(`
              INSERT INTO clients (
                id, name, email, phone, whatsapp, avatar_url, status, workspace_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              newClientId,
              u.name || 'Cliente',
              u.email || null,
              u.phone || null,
              u.phone || null,
              u.avatar_url || null,
              u.status || 'ativo',
              targetWs,
              u.created_at || nowStr,
              u.updated_at || nowStr
            ).run();
          } catch {
            await db.prepare(`
              INSERT INTO clients (
                id, name, email, phone, whatsapp, status, workspace_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              newClientId,
              u.name || 'Cliente',
              u.email || null,
              u.phone || null,
              u.phone || null,
              u.status || 'ativo',
              targetWs,
              u.created_at || nowStr,
              u.updated_at || nowStr
            ).run();
          }

          await db.prepare('UPDATE users SET client_id = ? WHERE id = ?').bind(newClientId, u.id).run();
        }
      }
    } catch (syncErr) {
      console.error('[GET /api/clients] Sync client users error:', syncErr);
    }

    // Build dynamic WHERE clauses
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Allow matching current workspace, null workspace, empty workspace, or ws_default
    conditions.push("(c.workspace_id = ? OR c.workspace_id IS NULL OR c.workspace_id = '' OR ? = 'ws_default')");
    params.push(wsId, wsId);

    if (search) {
      conditions.push('(c.name LIKE ? OR c.trade_name LIKE ? OR c.document LIKE ? OR c.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
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
    params.push(limit + 1);

    let clients: Record<string, unknown>[] = [];
    try {
      const rows = await db
        .prepare(
          `SELECT
             c.*,
             u.name AS responsible_name
           FROM clients c
           LEFT JOIN users u ON u.id = c.responsible_user_id
           ${where}
           ORDER BY c.created_at DESC
           LIMIT ?`
        )
        .bind(...params)
        .all();

      clients = (rows.results || []) as Record<string, unknown>[];
    } catch (queryErr) {
      console.error('[GET /api/clients] Primary query error, falling back:', queryErr);
      try {
        const rows = await db
          .prepare(
            `SELECT c.* FROM clients c ${where} ORDER BY c.created_at DESC LIMIT ?`
          )
          .bind(...params)
          .all();
        clients = (rows.results || []) as Record<string, unknown>[];
      } catch (fallbackErr) {
        console.error('[GET /api/clients] Fallback query error:', fallbackErr);
        const rows = await db.prepare('SELECT * FROM clients LIMIT ?').bind(limit + 1).all();
        clients = (rows.results || []) as Record<string, unknown>[];
      }
    }

    const hasNextPage = clients.length > limit;
    if (hasNextPage) clients.pop();

    const nextCursor =
      hasNextPage && clients.length > 0
        ? (clients[clients.length - 1].created_at as string)
        : null;

    return NextResponse.json({
      data: clients,
      clients: clients,
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
    const social_links        = body.social_links ? (typeof body.social_links === 'string' ? body.social_links : JSON.stringify(body.social_links)) : null;
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
           responsible_user_id, notes, status, social_links, workspace_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        social_links,
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

    // Auto-create client user in users table (guarantees presence in Configurações > Usuários)
    try {
      const clientEmail = (email && email.trim()) ? email.trim().toLowerCase() : `cliente.${id.replace(/[^a-zA-Z0-9]/g, '')}@portal.com`;
      const existingUser = await db
        .prepare('SELECT id FROM users WHERE lower(email) = lower(?) OR client_id = ?')
        .bind(clientEmail, id)
        .first();

      if (!existingUser) {
        const pass = (body.password && typeof body.password === 'string' && body.password.trim())
          ? body.password.trim()
          : 'cliente123';
        const passHash = await hashPassword(pass);
        const newUserId = 'usr_' + id.replace(/^cli_/, '');
        await db
          .prepare(
            'INSERT INTO users (id, name, email, password_hash, role, client_id, workspace_id, avatar_url, phone, status) VALUES (?, ?, ?, ?, \'CLIENTE\', ?, ?, ?, ?, ?)'
          )
          .bind(newUserId, name.trim(), clientEmail, passHash, id, wsId, avatar_url || null, whatsapp || phone || null, status || 'ativo')
          .run();
      }
    } catch (uErr) {
      console.error('Error auto-creating client user on POST:', uErr);
    }

    const created = await db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/clients]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
