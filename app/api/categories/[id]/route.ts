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
    const { searchParams } = new URL(request.url);
    const targetQuery = searchParams.get('target'); // 'tasks' | 'finance'
    const body = await request.json();
    const { name, color, type, is_active } = body;

    const db = getDb();

    // Determine target
    let target = targetQuery;
    if (!target) {
      if (id.startsWith('tcat_') || id.startsWith('cat_task')) target = 'tasks';
      else if (id.startsWith('fcat_') || id.startsWith('cat_fin')) target = 'finance';
      else {
        // Check task_categories first
        const tc = await db.prepare('SELECT id FROM task_categories WHERE id = ?').bind(id).first();
        if (tc) target = 'tasks';
        else target = 'finance';
      }
    }

    if (target === 'tasks') {
      const existing = await db.prepare('SELECT * FROM task_categories WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
      }

      await db
        .prepare(`
          UPDATE task_categories
          SET name = COALESCE(?, name),
              color = COALESCE(?, color),
              is_active = COALESCE(?, is_active)
          WHERE id = ?
        `)
        .bind(
          name ? name.trim() : null,
          color ?? null,
          is_active !== undefined ? Number(is_active) : null,
          id
        )
        .run();

      await logAudit({
        userId: user.id,
        action: 'UPDATE',
        module: 'SETTINGS',
        recordId: id,
        beforeData: existing,
        afterData: body,
      });

      return NextResponse.json({ success: true, message: 'Categoria atualizada com sucesso.' });
    } else {
      const existing = await db.prepare('SELECT * FROM financial_categories WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Categoria financeira não encontrada.' }, { status: 404 });
      }

      await db
        .prepare(`
          UPDATE financial_categories
          SET name = COALESCE(?, name),
              type = COALESCE(?, type),
              is_active = COALESCE(?, is_active)
          WHERE id = ?
        `)
        .bind(
          name ? name.trim() : null,
          type ?? null,
          is_active !== undefined ? Number(is_active) : null,
          id
        )
        .run();

      await logAudit({
        userId: user.id,
        action: 'UPDATE',
        module: 'SETTINGS',
        recordId: id,
        beforeData: existing,
        afterData: body,
      });

      return NextResponse.json({ success: true, message: 'Categoria financeira atualizada com sucesso.' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao atualizar categoria.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetQuery = searchParams.get('target');
    const db = getDb();

    let target = targetQuery;
    if (!target) {
      if (id.startsWith('tcat_') || id.startsWith('cat_task')) target = 'tasks';
      else if (id.startsWith('fcat_') || id.startsWith('cat_fin')) target = 'finance';
      else {
        const tc = await db.prepare('SELECT id FROM task_categories WHERE id = ?').bind(id).first();
        if (tc) target = 'tasks';
        else target = 'finance';
      }
    }

    if (target === 'tasks') {
      const existing = await db.prepare('SELECT * FROM task_categories WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
      }

      // Check if tasks use this category
      const tasksCount = await db
        .prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = ?')
        .bind(id)
        .first<any>();

      if (tasksCount && tasksCount.count > 0) {
        // Disassociate or set is_active = 0
        await db.prepare('UPDATE task_categories SET is_active = 0 WHERE id = ?').bind(id).run();
        return NextResponse.json({
          success: true,
          message: 'Categoria desativada (possui tarefas associadas).',
        });
      }

      await db.prepare('DELETE FROM task_categories WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true, message: 'Categoria excluída com sucesso.' });
    } else {
      const existing = await db.prepare('SELECT * FROM financial_categories WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Categoria financeira não encontrada.' }, { status: 404 });
      }

      // Check if transactions use this category
      const txCount = await db
        .prepare('SELECT COUNT(*) as count FROM financial_transactions WHERE category_id = ?')
        .bind(id)
        .first<any>();

      if (txCount && txCount.count > 0) {
        await db.prepare('UPDATE financial_categories SET is_active = 0 WHERE id = ?').bind(id).run();
        return NextResponse.json({
          success: true,
          message: 'Categoria desativada (possui transações associadas).',
        });
      }

      await db.prepare('DELETE FROM financial_categories WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true, message: 'Categoria financeira excluída com sucesso.' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao excluir categoria.' }, { status: 500 });
  }
}
