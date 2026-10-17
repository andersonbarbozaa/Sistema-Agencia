
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'tasks', 'finance', 'all'

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';

    let taskCategories: any[] = [];
    let financialCategories: any[] = [];

    if (type === 'all' || type === 'tasks') {
      try {
        const res = await db
          .prepare("SELECT * FROM task_categories WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default')) ORDER BY name ASC")
          .bind(wsId, wsId)
          .all();
        taskCategories = res.results || [];
      } catch {
        const res = await db.prepare('SELECT * FROM task_categories ORDER BY name ASC').all();
        taskCategories = res.results || [];
      }
    }

    if ((type === 'all' || type === 'finance') && user.role !== 'CLIENTE') {
      try {
        const res = await db
          .prepare("SELECT * FROM financial_categories WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default')) ORDER BY name ASC")
          .bind(wsId, wsId)
          .all();
        financialCategories = res.results || [];
      } catch {
        const res = await db.prepare('SELECT * FROM financial_categories ORDER BY name ASC').all();
        financialCategories = res.results || [];
      }
    }

    return NextResponse.json({
      task_categories: taskCategories,
      financial_categories: financialCategories,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao listar categorias.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('target');

    const body = await request.json();
    const { target: targetBody, name, color, type = 'both', is_active = 1 } = body; 
    
    const target = targetUrl || targetBody;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    const cleanName = name.trim();

    if (target === 'tasks') {
      const existing = await db
        .prepare('SELECT id FROM task_categories WHERE LOWER(name) = LOWER(?)')
        .bind(cleanName)
        .first<{ id: string }>();

      if (existing) {
        await db.prepare('UPDATE task_categories SET is_active = 1, color = COALESCE(?, color) WHERE id = ?').bind(color || null, existing.id).run();
        return NextResponse.json({ success: true, id: existing.id });
      }

      const id = generateId('tcat');
      try {
        const r = await db
          .prepare(`INSERT INTO task_categories (id, name, color, is_active, workspace_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
          .bind(id, cleanName, color || '#3b82f6', is_active, wsId)
          .run();
        if (r && r.success === false) throw new Error(r.error);
      } catch {
        await db
          .prepare(`INSERT INTO task_categories (id, name, color, is_active, created_at) VALUES (?, ?, ?, ?, datetime('now'))`)
          .bind(id, cleanName, color || '#3b82f6', is_active)
          .run();
      }

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: id,
        afterData: { target: 'task_category', name: cleanName, color },
      });

      return NextResponse.json({ success: true, id });
    } else if (target === 'finance') {
      const existing = await db
        .prepare('SELECT id FROM financial_categories WHERE LOWER(name) = LOWER(?)')
        .bind(cleanName)
        .first<{ id: string }>();

      if (existing) {
        await db.prepare('UPDATE financial_categories SET is_active = 1, type = COALESCE(?, type) WHERE id = ?').bind(type || null, existing.id).run();
        return NextResponse.json({ success: true, id: existing.id });
      }

      const id = generateId('fcat');
      try {
        const r = await db
          .prepare(`INSERT INTO financial_categories (id, name, type, is_active, workspace_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
          .bind(id, cleanName, type, is_active, wsId)
          .run();
        if (r && r.success === false) throw new Error(r.error);
      } catch {
        await db
          .prepare(`INSERT INTO financial_categories (id, name, type, is_active, created_at) VALUES (?, ?, ?, ?, datetime('now'))`)
          .bind(id, cleanName, type, is_active)
          .run();
      }

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: id,
        afterData: { target: 'financial_category', name: cleanName, type },
      });

      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Alvo de categoria inválido.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao salvar categoria.' }, { status: 500 });
  }
}
