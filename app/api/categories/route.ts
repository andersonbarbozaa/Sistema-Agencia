
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
      const res = await db
        .prepare('SELECT * FROM task_categories WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = "ws_default")) ORDER BY name ASC')
        .bind(wsId, wsId)
        .all();
      taskCategories = res.results || [];
    }

    if ((type === 'all' || type === 'finance') && user.role !== 'CLIENTE') {
      const res = await db
        .prepare('SELECT * FROM financial_categories WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = "ws_default")) ORDER BY name ASC')
        .bind(wsId, wsId)
        .all();
      financialCategories = res.results || [];
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
    const body = await request.json();
    const { target, name, color, type = 'both', is_active = 1 } = body; // target: 'tasks' | 'finance'

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    if (target === 'tasks') {
      const id = generateId('tcat');
      await db
        .prepare(`INSERT INTO task_categories (id, name, color, is_active, workspace_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
        .bind(id, name.trim(), color || '#3b82f6', is_active, wsId)
        .run();

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: id,
        afterData: { target: 'task_category', name, color },
      });

      return NextResponse.json({ success: true, id });
    } else if (target === 'finance') {
      const id = generateId('fcat');
      await db
        .prepare(`INSERT INTO financial_categories (id, name, type, is_active, workspace_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
        .bind(id, name.trim(), type, is_active, wsId)
        .run();

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: id,
        afterData: { target: 'financial_category', name, type },
      });

      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Alvo de categoria inválido.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao salvar categoria.' }, { status: 500 });
  }
}
