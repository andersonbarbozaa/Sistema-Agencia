
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
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
      'responsible_user_id',
      'notes',
      'status',
    ];

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
