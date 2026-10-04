
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/finance/[id] — single transaction
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const db = getDb();
    const row = await db
      .prepare(
        `SELECT
          t.*,
          fc.name  AS category_name,
          ba.name  AS bank_account_name,
          c.name   AS client_name,
          u.name   AS created_by_name
        FROM financial_transactions t
        LEFT JOIN financial_categories fc ON fc.id = t.category_id
        LEFT JOIN bank_accounts         ba ON ba.id = t.bank_account_id
        LEFT JOIN clients                c  ON c.id  = t.client_id
        LEFT JOIN users                  u  ON u.id  = t.created_by
        WHERE t.id = ?`
      )
      .bind(id)
      .first();

    if (!row) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (error) {
    console.error('[GET /api/finance/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/finance/[id] — update transaction
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const db = getDb();
    const existing = await db
      .prepare('SELECT * FROM financial_transactions WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    const body = await request.json();
    const now = new Date().toISOString();

    const allowedFields = ['description', 'amount', 'type', 'status', 'due_date', 'paid_at', 'client_id', 'bank_account_id', 'category_id', 'partner_id', 'notes'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Auto-set paid_at when marking as Pago
    if (body.status === 'Pago' && existing.status !== 'Pago') {
      if (!body.paid_at) {
        if (!updates.includes('paid_at = ?')) {
          updates.push('paid_at = ?');
          values.push(now);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db
      .prepare(`UPDATE financial_transactions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      resource: 'financial_transactions',
      resourceId: id,
      details: `Updated transaction fields: ${Object.keys(body).join(', ')}`,
    });

    const updated = await db.prepare('SELECT * FROM financial_transactions WHERE id = ?').bind(id).first();
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[PATCH /api/finance/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/finance/[id] — delete transaction (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const db = getDb();
    const existing = await db
      .prepare('SELECT * FROM financial_transactions WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    await db.prepare('DELETE FROM financial_transactions WHERE id = ?').bind(id).run();

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      resource: 'transactions',
      resourceId: id,
      details: `Deleted transaction: ${existing.description} — R$ ${existing.amount}`,
    });

    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/finance/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
