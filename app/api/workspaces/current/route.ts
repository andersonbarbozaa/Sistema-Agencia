
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

    const workspace = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first<any>();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[GET /api/workspaces/current]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/workspaces/current — Update workspace name and description
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

    // Ensure logo_url column exists on workspaces
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN logo_url TEXT').run();
    } catch {
      // Column already exists
    }

    const existing = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first<any>();

    if (!existing) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const newName = name.trim();
    const newDesc = description !== undefined ? (description ? description.trim() : null) : existing.description;
    const newLogo = logo_url !== undefined ? (logo_url || null) : (existing.logo_url ?? null);

    await db
      .prepare(
        `UPDATE workspaces
         SET name = ?, description = ?, logo_url = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(newName, newDesc, newLogo, workspaceId)
      .run();

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
