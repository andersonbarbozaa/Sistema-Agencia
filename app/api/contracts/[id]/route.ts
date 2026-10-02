import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/contracts/[id] - Get single contract
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { id } = await params;

    const contract = await db
      .prepare(
        `SELECT c.*, cl.name as client_name
        FROM contracts c
        LEFT JOIN clients cl ON cl.id = c.client_id
        WHERE c.id = ?`
      )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    // CLIENTE: can only view their own contracts
    if (user.role === 'CLIENTE') {
      const clientRecord = await db
        .prepare('SELECT id FROM clients WHERE user_id = ?')
        .bind(user.id)
        .first<{ id: string }>();
      if (!clientRecord || clientRecord.id !== contract.client_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ data: contract });
  } catch (error) {
    console.error('GET /api/contracts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/contracts/[id] - Update contract (admin only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const { id } = await params;

    const existing = await db.prepare('SELECT id FROM contracts WHERE id = ?').bind(id).first();
    if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const body = await request.json();
    const allowedFields = ['title', 'description', 'value', 'start_date', 'end_date', 'status', 'file_url'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    values.push(now, id);

    await db
      .prepare(`UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    await logAudit(user.id, 'contracts', 'UPDATE', id, body);

    const updated = await db
      .prepare(
        `SELECT c.*, cl.name as client_name
        FROM contracts c
        LEFT JOIN clients cl ON cl.id = c.client_id
        WHERE c.id = ?`
      )
      .bind(id)
      .first();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/contracts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/contracts/[id] - Delete contract (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const { id } = await params;

    const existing = await db
      .prepare('SELECT id, title FROM contracts WHERE id = ?')
      .bind(id)
      .first<{ id: string; title: string }>();

    if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    await db.prepare('DELETE FROM contracts WHERE id = ?').bind(id).run();

    await logAudit(user.id, 'contracts', 'DELETE', id, { title: existing.title });

    return NextResponse.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/contracts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
