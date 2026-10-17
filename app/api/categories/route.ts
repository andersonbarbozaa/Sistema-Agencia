
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
      try {
        await db.prepare('ALTER TABLE task_categories ADD COLUMN is_active INTEGER DEFAULT 1').run();
      } catch {}
      try {
        await db.prepare('ALTER TABLE task_categories ADD COLUMN workspace_id TEXT').run();
      } catch {}

      const existing = await db
        .prepare("SELECT id FROM task_categories WHERE LOWER(name) = LOWER(?) AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))")
        .bind(cleanName, wsId, wsId)
        .first<{ id: string }>()
        .catch(() =>
          db
            .prepare('SELECT id FROM task_categories WHERE LOWER(name) = LOWER(?)')
            .bind(cleanName)
            .first<{ id: string }>()
        );

      if (existing) {
        try {
          await db
            .prepare('UPDATE task_categories SET is_active = 1, color = COALESCE(?, color) WHERE id = ?')
            .bind(color || null, existing.id)
            .run();
        } catch {
          await db
            .prepare('UPDATE task_categories SET color = COALESCE(?, color) WHERE id = ?')
            .bind(color || null, existing.id)
            .run();
        }
        return NextResponse.json({ success: true, id: existing.id });
      }

      const id = generateId('tcat');
      try {
        const r = await db
          .prepare(`INSERT INTO task_categories (id, name, color, workspace_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))`)
          .bind(id, cleanName, color || '#3b82f6', wsId)
          .run();
        if (r && r.success === false) throw new Error(r.error);
      } catch {
        const r2 = await db
          .prepare(`INSERT INTO task_categories (id, name, color, created_at) VALUES (?, ?, ?, datetime('now'))`)
          .bind(id, cleanName, color || '#3b82f6')
          .run();
        if (r2 && r2.success === false) throw new Error(r2.error);
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
      try {
        await db.prepare('ALTER TABLE financial_categories ADD COLUMN is_active INTEGER DEFAULT 1').run();
      } catch {}
      try {
        await db.prepare('ALTER TABLE financial_categories ADD COLUMN workspace_id TEXT').run();
      } catch {}

      const existing = await db
        .prepare("SELECT id FROM financial_categories WHERE LOWER(name) = LOWER(?) AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))")
        .bind(cleanName, wsId, wsId)
        .first<{ id: string }>()
        .catch(() =>
          db
            .prepare('SELECT id FROM financial_categories WHERE LOWER(name) = LOWER(?)')
            .bind(cleanName)
            .first<{ id: string }>()
        );

      if (existing) {
        try {
          await db
            .prepare('UPDATE financial_categories SET is_active = 1, type = COALESCE(?, type) WHERE id = ?')
            .bind(type || null, existing.id)
            .run();
        } catch {
          await db
            .prepare('UPDATE financial_categories SET type = COALESCE(?, type) WHERE id = ?')
            .bind(type || null, existing.id)
            .run();
        }
        return NextResponse.json({ success: true, id: existing.id });
      }

      const id = generateId('fcat');
      try {
        const r = await db
          .prepare(`INSERT INTO financial_categories (id, name, type, workspace_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))`)
          .bind(id, cleanName, type, wsId)
          .run();
        if (r && r.success === false) throw new Error(r.error);
      } catch {
        const r2 = await db
          .prepare(`INSERT INTO financial_categories (id, name, type, created_at) VALUES (?, ?, ?, datetime('now'))`)
          .bind(id, cleanName, type)
          .run();
        if (r2 && r2.success === false) throw new Error(r2.error);
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
