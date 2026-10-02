export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    const db = getDb();
    const existing = await db.prepare('SELECT * FROM positions WHERE id = ?').bind(id).first();
    if (!existing) {
      return NextResponse.json({ error: 'Cargo não encontrado.' }, { status: 404 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome do cargo é obrigatório.' }, { status: 400 });
    }

    await db
      .prepare('UPDATE positions SET name = ?, description = ? WHERE id = ?')
      .bind(name.trim(), description || null, id)
      .run();

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      module: 'SETTINGS',
      recordId: id,
      beforeData: existing,
      afterData: { name, description },
    });

    return NextResponse.json({ success: true, message: 'Cargo atualizado com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao atualizar cargo.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    const existing = await db.prepare('SELECT * FROM positions WHERE id = ?').bind(id).first();
    if (!existing) {
      return NextResponse.json({ error: 'Cargo não encontrado.' }, { status: 404 });
    }

    // Set position_id to null for users who have this position
    await db.prepare('UPDATE users SET position_id = NULL WHERE position_id = ?').bind(id).run();

    // Delete position
    await db.prepare('DELETE FROM positions WHERE id = ?').bind(id).run();

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      module: 'SETTINGS',
      recordId: id,
      beforeData: existing,
    });

    return NextResponse.json({ success: true, message: 'Cargo excluído com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao excluir cargo.' }, { status: 500 });
  }
}
