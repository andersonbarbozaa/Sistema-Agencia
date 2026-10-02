import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/contracts - List contracts with optional client_id/status filters
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    const status = searchParams.get('status');

    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    // CLIENTE role can only see their own contracts
    if (user.role === 'CLIENTE') {
      const clientRecord = await db
        .prepare('SELECT id FROM clients WHERE user_id = ?')
        .bind(user.id)
        .first<{ id: string }>();
      if (!clientRecord) return NextResponse.json({ data: [] });
      conditions.push('c.client_id = ?');
      params.push(clientRecord.id);
    } else if (client_id) {
      conditions.push('c.client_id = ?');
      params.push(client_id);
    }

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const contracts = await db
      .prepare(
        `SELECT c.*, cl.name as client_name
        FROM contracts c
        LEFT JOIN clients cl ON cl.id = c.client_id
        ${where}
        ORDER BY c.created_at DESC`
      )
      .bind(...params)
      .all();

    return NextResponse.json({ data: contracts.results });
  } catch (error) {
    console.error('GET /api/contracts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contracts - Create contract (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { client_id, title, description, value, start_date, end_date, status, file_url } = body;

    if (!client_id || !title) {
      return NextResponse.json({ error: 'client_id and title are required' }, { status: 400 });
    }

    const db = getDb();

    // Validate client exists
    const client = await db.prepare('SELECT id FROM clients WHERE id = ?').bind(client_id).first();
    if (!client) return NextResponse.json({ error: 'client_id does not exist' }, { status: 422 });

    const id = 'ctr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO contracts
          (id, client_id, title, description, value, start_date, end_date, status, file_url, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        client_id,
        title,
        description ?? null,
        value ?? null,
        start_date ?? null,
        end_date ?? null,
        status ?? 'Ativo',
        file_url ?? null,
        user.id,
        now,
        now
      )
      .run();

    await logAudit(user.id, 'contracts', 'CREATE', id, { client_id, title });

    const contract = await db
      .prepare(
        `SELECT c.*, cl.name as client_name
        FROM contracts c
        LEFT JOIN clients cl ON cl.id = c.client_id
        WHERE c.id = ?`
      )
      .bind(id)
      .first();

    return NextResponse.json({ data: contract }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contracts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
