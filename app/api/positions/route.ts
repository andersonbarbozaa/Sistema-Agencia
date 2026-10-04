
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const db = getDb();
    const positions = await db
      .prepare(`
        SELECT p.*, (SELECT COUNT(*) FROM users WHERE position_id = p.id) as users_count
        FROM positions p
        ORDER BY p.name ASC
      `)
      .all();

    return NextResponse.json({ positions: positions.results || [] });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao listar cargos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getDb();
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'O nome do cargo é obrigatório.' }, { status: 400 });
    }

    const id = generateId('pos');
    await db
      .prepare(`INSERT INTO positions (id, name, description, created_at) VALUES (?, ?, ?, datetime('now'))`)
      .bind(id, name.trim(), description || null)
      .run();

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      module: 'SETTINGS',
      recordId: id,
      afterData: { position: name },
    });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao criar cargo.' }, { status: 500 });
  }
}
