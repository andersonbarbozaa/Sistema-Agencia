
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/clients/[id] ───────────────────────────────────────────────────
// Admins / collaborators see full details.
// Clients (role=cliente) can only retrieve their own record.
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // CLIENTE role can only see their own client record
    if (user.role === 'CLIENTE' && user.client_id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const client = await db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('[GET /api/clients/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── PATCH /api/clients/[id] ─────────────────────────────────────────────────
// Update client fields. Admin only.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { id } = await params;
    const db = await getDb();

    const existing = await db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await request.json();

    // Allowed updatable fields
    const ALLOWED_FIELDS = [
      'name',
      'company_name',
      'corporate_name',
      'trade_name',
      'avatar_url',
      'document',
      'email',
      'phone',
      'whatsapp',
      'address',
      'city',
      'state',
      'website',
      'instagram',
      'social_links',
      'responsible_user_id',
      'notes',
      'status',
    ];

    // Support company_name sync
    if ('company_name' in body && !('corporate_name' in body)) {
      body.corporate_name = body.company_name;
    }
    if ('company_name' in body && !('trade_name' in body)) {
      body.trade_name = body.company_name;
    }

    // Support legacy/alias cnpj -> document
    if ('cnpj' in body && !('document' in body)) {
      body.document = body.cnpj;
    }

    const setClauses: string[] = [];
    const values: unknown[]    = [];

    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setClauses.push(`${field} = ?`);
        values.push(body[field] ?? null);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    setClauses.push('updated_at = ?');
    values.push(now, id);

    await db
      .prepare(`UPDATE clients SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    await logAudit({
      userId:     user.id,
      action:     'UPDATE',
      resource:   'clients',
      resourceId: id,
      details:    `Client "${id}" updated`,
    });

    // Synchronize client user in users table
    try {
      const clientEmail = (body.email || existing.email)?.trim()?.toLowerCase();
      const clientName = body.name || existing.name;
      const clientAvatar = body.avatar_url !== undefined ? body.avatar_url : existing.avatar_url;
      const clientPhone = body.whatsapp || body.phone || existing.whatsapp || existing.phone;
      const clientStatus = (body.status || existing.status) === 'inativo' ? 'inativo' : 'ativo';

      if (clientEmail) {
        const existingUser = await db
          .prepare('SELECT id, email FROM users WHERE client_id = ? OR lower(email) = lower(?)')
          .bind(id, clientEmail)
          .first();

        if (existingUser) {
          if (body.password && typeof body.password === 'string' && body.password.trim()) {
            const newHash = await hashPassword(body.password.trim());
            await db
              .prepare(
                'UPDATE users SET name = ?, email = ?, avatar_url = ?, phone = ?, status = ?, password_hash = ?, client_id = ?, updated_at = ? WHERE id = ?'
              )
              .bind(clientName, clientEmail, clientAvatar || null, clientPhone || null, clientStatus, newHash, id, now, existingUser.id)
              .run();
          } else {
            await db
              .prepare(
                'UPDATE users SET name = ?, email = ?, avatar_url = ?, phone = ?, status = ?, client_id = ?, updated_at = ? WHERE id = ?'
              )
              .bind(clientName, clientEmail, clientAvatar || null, clientPhone || null, clientStatus, id, now, existingUser.id)
              .run();
          }
        } else {
          const pass = (body.password && typeof body.password === 'string' && body.password.trim())
            ? body.password.trim()
            : 'cliente123';
          const passHash = await hashPassword(pass);
          const newUserId = 'usr_' + id.replace(/^cli_/, '');
          const wsId = user.workspace_id || 'ws_default';

          await db
            .prepare(
              'INSERT INTO users (id, name, email, password_hash, role, client_id, workspace_id, avatar_url, phone, status) VALUES (?, ?, ?, ?, \'CLIENTE\', ?, ?, ?, ?, ?)'
            )
            .bind(newUserId, clientName, clientEmail, passHash, id, wsId, clientAvatar || null, clientPhone || null, clientStatus)
            .run();
        }
      }
    } catch (syncErr) {
      console.error('Error synchronizing client user on PATCH:', syncErr);
    }

    const updated = await db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[PATCH /api/clients/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── DELETE /api/clients/[id] ────────────────────────────────────────────────
// Archive a client (soft-delete: set status = 'arquivado'). Admin only.
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { id } = await params;
    const db = await getDb();

    const existing = await db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await db
      .prepare(`UPDATE clients SET status = 'arquivado', updated_at = ? WHERE id = ?`)
      .bind(now, id)
      .run();

    await logAudit({
      userId:     user.id,
      action:     'ARCHIVE',
      resource:   'clients',
      resourceId: id,
      details:    `Client "${id}" archived`,
    });

    return NextResponse.json({ message: 'Client archived successfully' });
  } catch (error) {
    console.error('[DELETE /api/clients/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
