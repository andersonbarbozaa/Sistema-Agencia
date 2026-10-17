
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/workspaces/current — Get current user's workspace details
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const workspaceId = user.workspace_id || 'ws_default';

    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN logo_url TEXT').run();
    } catch {}
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN description TEXT').run();
    } catch {}

    let workspace = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first<any>();

    if (!workspace) {
      const inviteCode = 'inv_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      await db
        .prepare(
          `INSERT INTO workspaces (id, name, description, logo_url, owner_id, invite_code, created_at, updated_at)
           VALUES (?, 'PixelCraft Studio', 'Audiovisual & Criativo', NULL, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(workspaceId, user.id, inviteCode)
        .run()
        .catch(() => {});
      workspace = await db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(workspaceId).first<any>();
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[GET /api/workspaces/current]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/workspaces/current — Update workspace name, description and logo
export async function PATCH(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Apenas administradores podem alterar os dados da empresa.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, logo_url } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'O Nome da Empresa é obrigatório.' }, { status: 400 });
    }

    const db = getDb();
    const workspaceId = user.workspace_id || 'ws_default';

    // Ensure columns exist on workspaces
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN logo_url TEXT').run();
    } catch {}
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN description TEXT').run();
    } catch {}

    if (!user.workspace_id) {
      try {
        await db.prepare('UPDATE users SET workspace_id = ? WHERE id = ?').bind(workspaceId, user.id).run();
      } catch {}
    }

    const existing = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first<any>();

    const newName = name.trim();
    const newDesc = description !== undefined ? (description ? description.trim() : null) : existing?.description ?? null;
    const newLogo = logo_url !== undefined ? (logo_url || null) : (existing?.logo_url ?? null);

    if (!existing) {
      const inviteCode = 'inv_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      await db
        .prepare(
          `INSERT INTO workspaces (id, name, description, logo_url, owner_id, invite_code, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(workspaceId, newName, newDesc, newLogo, user.id, inviteCode)
        .run();
    } else {
      await db
        .prepare(
          `UPDATE workspaces
           SET name = ?, description = ?, logo_url = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(newName, newDesc, newLogo, workspaceId)
        .run();
    }

    const updated = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first<any>();

    await logAudit({
      userId: user.id,
      action: 'UPDATE_WORKSPACE',
      module: 'SETTINGS',
      recordId: workspaceId,
      beforeData: existing,
      afterData: updated,
    });

    return NextResponse.json({ workspace: updated });
  } catch (error) {
    console.error('[PATCH /api/workspaces/current]', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados da empresa' }, { status: 500 });
  }
}
