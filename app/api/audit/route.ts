
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');
    const action = searchParams.get('action');
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 100);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const offset = (page - 1) * limit;

    const db = getDb();

    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (module) {
      query += ` AND a.module = ?`;
      params.push(module);
    }
    if (action) {
      query += ` AND a.action = ?`;
      params.push(action);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const logs = await db.prepare(query).bind(...params).all();

    const countRes = await db
      .prepare('SELECT COUNT(*) as total FROM audit_logs')
      .first<any>();

    return NextResponse.json({
      logs: logs.results || [],
      total: countRes?.total || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar registros de auditoria.' }, { status: 500 });
  }
}
