import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export async function ensureCategoryTables(db: any, wsId: string = 'ws_default') {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS crm_cities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#3b82f6',
        workspace_id TEXT DEFAULT 'ws_default',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
  } catch {}

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS crm_segments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#8b5cf6',
        workspace_id TEXT DEFAULT 'ws_default',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
  } catch {}

  // Auto-seed initial cities from crm_leads or clients if empty
  try {
    const countCities = (await db
      .prepare("SELECT COUNT(*) as c FROM crm_cities WHERE (workspace_id = ? OR workspace_id IS NULL)")
      .bind(wsId)
      .first()) as { c: number } | null;
    if (!countCities || countCities.c === 0) {
      const existingCities = await db.prepare(`
        SELECT DISTINCT city FROM crm_leads WHERE city IS NOT NULL AND TRIM(city) != ''
        UNION
        SELECT DISTINCT city FROM clients WHERE city IS NOT NULL AND TRIM(city) != ''
      `).all();
      if (existingCities?.results) {
        for (const row of existingCities.results) {
          const cName = (row as any)?.city?.trim();
          if (cName) {
            const cId = generateId('city');
            try {
              await db.prepare("INSERT OR IGNORE INTO crm_cities (id, name, color, workspace_id) VALUES (?, ?, ?, ?)").bind(cId, cName, '#3b82f6', wsId).run();
            } catch {}
          }
        }
      }
    }
  } catch {}

  // Auto-seed initial segments from crm_leads if empty
  try {
    const countSegs = (await db
      .prepare("SELECT COUNT(*) as c FROM crm_segments WHERE (workspace_id = ? OR workspace_id IS NULL)")
      .bind(wsId)
      .first()) as { c: number } | null;
    if (!countSegs || countSegs.c === 0) {
      const existingSegs = await db.prepare(`
        SELECT DISTINCT segment FROM crm_leads WHERE segment IS NOT NULL AND TRIM(segment) != ''
      `).all();
      if (existingSegs?.results) {
        for (const row of existingSegs.results) {
          const sName = (row as any)?.segment?.trim();
          if (sName) {
            const sId = generateId('seg');
            try {
              await db.prepare("INSERT OR IGNORE INTO crm_segments (id, name, color, workspace_id) VALUES (?, ?, ?, ?)").bind(sId, sName, '#8b5cf6', wsId).run();
            } catch {}
          }
        }
      }
    }
  } catch {}
}

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'all').toLowerCase(); // 'tasks', 'finance', 'cities', 'segments', 'all'

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';

    await ensureCategoryTables(db, wsId);

    let taskCategories: any[] = [];
    let financialCategories: any[] = [];
    let cities: any[] = [];
    let segments: any[] = [];

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

    if (type === 'all' || type === 'cities' || type === 'cidades') {
      try {
        const res = await db
          .prepare("SELECT * FROM crm_cities WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default')) ORDER BY name ASC")
          .bind(wsId, wsId)
          .all();
        cities = res.results || [];
      } catch {
        const res = await db.prepare('SELECT * FROM crm_cities ORDER BY name ASC').all().catch(() => ({ results: [] }));
        cities = res.results || [];
      }
    }

    if (type === 'all' || type === 'segments' || type === 'segmentos' || type === 'areas') {
      try {
        const res = await db
          .prepare("SELECT * FROM crm_segments WHERE (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default')) ORDER BY name ASC")
          .bind(wsId, wsId)
          .all();
        segments = res.results || [];
      } catch {
        const res = await db.prepare('SELECT * FROM crm_segments ORDER BY name ASC').all().catch(() => ({ results: [] }));
        segments = res.results || [];
      }
    }

    return NextResponse.json({
      task_categories: taskCategories,
      financial_categories: financialCategories,
      cities,
      segments,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao listar categorias.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('target');

    const body = await request.json();
    const { target: targetBody, name, color, type = 'both', is_active = 1 } = body; 
    
    const target = (targetUrl || targetBody || 'tasks').toLowerCase();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    const cleanName = name.trim();
    await ensureCategoryTables(db, wsId);

    // Cidades do CRM
    if (target === 'cities' || target === 'cidades' || target === 'city') {
      const existing = (await db
        .prepare("SELECT * FROM crm_cities WHERE LOWER(name) = LOWER(?) AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))")
        .bind(cleanName, wsId, wsId)
        .first()
        .catch(() => null)) as { id: string; name: string; color?: string } | null;

      if (existing) {
        if (color) {
          try {
            await db.prepare('UPDATE crm_cities SET color = ? WHERE id = ?').bind(color, existing.id).run();
          } catch {}
        }
        return NextResponse.json({ success: true, id: existing.id, item: { ...existing, color: color || existing.color } });
      }

      const id = generateId('city');
      const cityColor = color || '#3b82f6';
      await db
        .prepare("INSERT INTO crm_cities (id, name, color, workspace_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
        .bind(id, cleanName, cityColor, wsId)
        .run();

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: id,
        afterData: { target: 'crm_city', name: cleanName, color: cityColor },
      });

      return NextResponse.json({ success: true, id, item: { id, name: cleanName, color: cityColor } });
    }

    // Áreas de Atuação / Segmentos do CRM
    if (target === 'segments' || target === 'segmentos' || target === 'segment' || target === 'areas' || target === 'area_de_atuacao') {
      const existing = (await db
        .prepare("SELECT * FROM crm_segments WHERE LOWER(name) = LOWER(?) AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))")
        .bind(cleanName, wsId, wsId)
        .first()
        .catch(() => null)) as { id: string; name: string; color?: string } | null;

      if (existing) {
        if (color) {
          try {
            await db.prepare('UPDATE crm_segments SET color = ? WHERE id = ?').bind(color, existing.id).run();
          } catch {}
        }
        return NextResponse.json({ success: true, id: existing.id, item: { ...existing, color: color || existing.color } });
      }

      const id = generateId('seg');
      const segColor = color || '#8b5cf6';
      await db
        .prepare("INSERT INTO crm_segments (id, name, color, workspace_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
        .bind(id, cleanName, segColor, wsId)
        .run();

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: id,
        afterData: { target: 'crm_segment', name: cleanName, color: segColor },
      });

      return NextResponse.json({ success: true, id, item: { id, name: cleanName, color: segColor } });
    }

    // Apenas administradores para tarefas e financeiro
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

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
