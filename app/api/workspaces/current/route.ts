
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
    try {
      await db.prepare("ALTER TABLE workspaces ADD COLUMN plan_type TEXT DEFAULT 'individual'").run();
    } catch {}
    try {
      await db.prepare("ALTER TABLE workspaces ADD COLUMN subscription_status TEXT DEFAULT 'trial'").run();
    } catch {}
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN trial_ends_at TEXT').run();
    } catch {}

    let workspace = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first<any>();

    if (!workspace) {
      const inviteCode = 'inv_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db
        .prepare(
          `INSERT INTO workspaces (id, name, description, logo_url, plan_type, subscription_status, trial_ends_at, owner_id, invite_code, created_at, updated_at)
           VALUES (?, 'PixelCraft Studio', 'Audiovisual & Criativo', NULL, 'individual', 'trial', ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(workspaceId, trialEndsAt, user.id, inviteCode)
        .run()
        .catch(() => {});
      workspace = await db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(workspaceId).first<any>();
    }

    // Set default trial date if missing
    if (workspace && !workspace.trial_ends_at) {
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db
        .prepare("UPDATE workspaces SET trial_ends_at = ?, plan_type = COALESCE(plan_type, 'individual'), subscription_status = COALESCE(subscription_status, 'trial') WHERE id = ?")
        .bind(trialEndsAt, workspaceId)
        .run()
        .catch(() => {});
      workspace.trial_ends_at = trialEndsAt;
      workspace.plan_type = workspace.plan_type || 'individual';
      workspace.subscription_status = workspace.subscription_status || 'trial';
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[GET /api/workspaces/current]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/workspaces/current — Update workspace name, description, logo and subscription
export async function PATCH(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Apenas administradores podem alterar os dados da empresa.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, logo_url, plan_type, subscription_status, trial_ends_at } = body;

    const db = getDb();
    const workspaceId = user.workspace_id || 'ws_default';

    // Ensure columns exist on workspaces
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN logo_url TEXT').run();
    } catch {}
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN description TEXT').run();
    } catch {}
    try {
      await db.prepare("ALTER TABLE workspaces ADD COLUMN plan_type TEXT DEFAULT 'individual'").run();
    } catch {}
    try {
      await db.prepare("ALTER TABLE workspaces ADD COLUMN subscription_status TEXT DEFAULT 'trial'").run();
    } catch {}
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN trial_ends_at TEXT').run();
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

    const newName = name !== undefined ? name.trim() : (existing?.name || 'PixelCraft Studio');
    const newDesc = description !== undefined ? (description ? description.trim() : null) : existing?.description ?? null;
    const newLogo = logo_url !== undefined ? (logo_url || null) : (existing?.logo_url ?? null);
    const newPlan = plan_type !== undefined ? plan_type : (existing?.plan_type ?? 'individual');
    const newSubStatus = subscription_status !== undefined ? subscription_status : (existing?.subscription_status ?? 'trial');
    const newTrialEnds = trial_ends_at !== undefined ? trial_ends_at : (existing?.trial_ends_at ?? null);

    if (!existing) {
      const inviteCode = 'inv_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      await db
        .prepare(
          `INSERT INTO workspaces (id, name, description, logo_url, plan_type, subscription_status, trial_ends_at, owner_id, invite_code, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(workspaceId, newName, newDesc, newLogo, newPlan, newSubStatus, newTrialEnds, user.id, inviteCode)
        .run();
    } else {
      await db
        .prepare(
          `UPDATE workspaces
           SET name = ?, description = ?, logo_url = ?, plan_type = ?, subscription_status = ?, trial_ends_at = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(newName, newDesc, newLogo, newPlan, newSubStatus, newTrialEnds, workspaceId)
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
