import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetQuery = searchParams.get('target')?.toLowerCase(); // 'tasks' | 'finance' | 'cities' | 'segments'
    const body = await request.json();
    const { name, color, type, is_active } = body;

    const db = getDb();

    // Determine target
    let target = targetQuery;
    if (!target) {
      if (id.startsWith('tcat_') || id.startsWith('cat_task')) target = 'tasks';
      else if (id.startsWith('fcat_') || id.startsWith('cat_fin')) target = 'finance';
      else if (id.startsWith('city_')) target = 'cities';
      else if (id.startsWith('seg_')) target = 'segments';
      else {
        const cCity = await db.prepare('SELECT id FROM crm_cities WHERE id = ?').bind(id).first().catch(() => null);
        if (cCity) target = 'cities';
        else {
          const cSeg = await db.prepare('SELECT id FROM crm_segments WHERE id = ?').bind(id).first().catch(() => null);
          if (cSeg) target = 'segments';
          else {
            const tc = await db.prepare('SELECT id FROM task_categories WHERE id = ?').bind(id).first().catch(() => null);
            if (tc) target = 'tasks';
            else target = 'finance';
          }
        }
      }
    }

    if (target === 'cities' || target === 'cidades') {
      const existing = await db.prepare('SELECT * FROM crm_cities WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Cidade não encontrada.' }, { status: 404 });
      }

      await db
        .prepare(`
          UPDATE crm_cities
          SET name = COALESCE(?, name),
              color = COALESCE(?, color)
          WHERE id = ?
        `)
        .bind(
          name ? name.trim() : null,
          color ?? null,
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

      return NextResponse.json({ success: true, message: 'Cidade atualizada com sucesso.' });
    } else if (target === 'segments' || target === 'segmentos' || target === 'areas') {
      const existing = await db.prepare('SELECT * FROM crm_segments WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Área de atuação não encontrada.' }, { status: 404 });
      }

      await db
        .prepare(`
          UPDATE crm_segments
          SET name = COALESCE(?, name),
              color = COALESCE(?, color)
          WHERE id = ?
        `)
        .bind(
          name ? name.trim() : null,
          color ?? null,
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

      return NextResponse.json({ success: true, message: 'Área de atuação atualizada com sucesso.' });
    } else if (target === 'tasks') {
      if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
      }

      const existing = await db.prepare('SELECT * FROM task_categories WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
      }

      await db
        .prepare(`
          UPDATE task_categories
          SET name = COALESCE(?, name),
              color = COALESCE(?, color)
          WHERE id = ?
        `)
        .bind(
          name ? name.trim() : null,
          color ?? null,
          id
        )
        .run();

      if (is_active !== undefined) {
        try {
          await db.prepare('UPDATE task_categories SET is_active = ? WHERE id = ?').bind(Number(is_active), id).run();
        } catch {}
      }

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
      if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
      }

      const existing = await db.prepare('SELECT * FROM financial_categories WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Categoria financeira não encontrada.' }, { status: 404 });
      }

      await db
        .prepare(`
          UPDATE financial_categories
          SET name = COALESCE(?, name),
              type = COALESCE(?, type)
          WHERE id = ?
        `)
        .bind(
          name ? name.trim() : null,
          type ?? null,
          id
        )
        .run();

      if (is_active !== undefined) {
        try {
          await db.prepare('UPDATE financial_categories SET is_active = ? WHERE id = ?').bind(Number(is_active), id).run();
        } catch {}
      }

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
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar categoria.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetQuery = searchParams.get('target')?.toLowerCase();
    const db = getDb();

    let target = targetQuery;
    if (!target) {
      if (id.startsWith('tcat_') || id.startsWith('cat_task')) target = 'tasks';
      else if (id.startsWith('fcat_') || id.startsWith('cat_fin')) target = 'finance';
      else if (id.startsWith('city_')) target = 'cities';
      else if (id.startsWith('seg_')) target = 'segments';
      else {
        const cCity = await db.prepare('SELECT id FROM crm_cities WHERE id = ?').bind(id).first().catch(() => null);
        if (cCity) target = 'cities';
        else {
          const cSeg = await db.prepare('SELECT id FROM crm_segments WHERE id = ?').bind(id).first().catch(() => null);
          if (cSeg) target = 'segments';
          else {
            const tc = await db.prepare('SELECT id FROM task_categories WHERE id = ?').bind(id).first().catch(() => null);
            if (tc) target = 'tasks';
            else target = 'finance';
          }
        }
      }
    }

    if (target === 'cities' || target === 'cidades') {
      const existing = await db.prepare('SELECT * FROM crm_cities WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Cidade não encontrada.' }, { status: 404 });
      }
      await db.prepare('DELETE FROM crm_cities WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true, message: 'Cidade excluída com sucesso.' });
    } else if (target === 'segments' || target === 'segmentos' || target === 'areas') {
      const existing = await db.prepare('SELECT * FROM crm_segments WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Área de atuação não encontrada.' }, { status: 404 });
      }
      await db.prepare('DELETE FROM crm_segments WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true, message: 'Área de atuação excluída com sucesso.' });
    } else if (target === 'tasks') {
      if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
      }

      const existing = await db.prepare('SELECT * FROM task_categories WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
      }

      try {
        await db.prepare('UPDATE tasks SET category_id = NULL WHERE category_id = ?').bind(id).run();
      } catch {}

      await db.prepare('DELETE FROM task_categories WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true, message: 'Categoria excluída com sucesso.' });
    } else {
      if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
      }

      const existing = await db.prepare('SELECT * FROM financial_categories WHERE id = ?').bind(id).first();
      if (!existing) {
        return NextResponse.json({ error: 'Categoria financeira não encontrada.' }, { status: 404 });
      }

      try {
        await db.prepare('UPDATE financial_transactions SET category_id = NULL WHERE category_id = ?').bind(id).run();
      } catch {}

      await db.prepare('DELETE FROM financial_categories WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true, message: 'Categoria financeira excluída com sucesso.' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao excluir categoria.' }, { status: 500 });
  }
}
