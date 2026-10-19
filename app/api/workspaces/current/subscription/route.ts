import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Apenas administradores podem gerenciar assinaturas.' }, { status: 403 });
    }

    const body = await request.json();
    const { plan_type } = body;

    const validPlans = ['individual', 'pro', 'corporativo'];
    if (!plan_type || !validPlans.includes(plan_type)) {
      return NextResponse.json({ error: 'Plano inválido selecionado.' }, { status: 400 });
    }

    const db = getDb();
    const workspaceId = user.workspace_id || 'ws_default';

    // Ensure columns exist on workspaces
    try {
      await db.prepare("ALTER TABLE workspaces ADD COLUMN plan_type TEXT DEFAULT 'individual'").run();
    } catch {}
    try {
      await db.prepare("ALTER TABLE workspaces ADD COLUMN subscription_status TEXT DEFAULT 'trial'").run();
    } catch {}
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN trial_ends_at TEXT').run();
    } catch {}

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const existing = await db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(workspaceId).first<any>();

    if (!existing) {
      const inviteCode = 'inv_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      await db
        .prepare(
          `INSERT INTO workspaces (id, name, description, plan_type, subscription_status, trial_ends_at, owner_id, invite_code, created_at, updated_at)
           VALUES (?, 'PixelCraft Studio', 'Audiovisual & Criativo', ?, 'trial', ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(workspaceId, plan_type, trialEndsAt, user.id, inviteCode)
        .run();
    } else {
      await db
        .prepare(
          `UPDATE workspaces
           SET plan_type = ?, subscription_status = 'trial', trial_ends_at = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(plan_type, trialEndsAt, workspaceId)
        .run();
    }

    const updated = await db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(workspaceId).first<any>();

    await logAudit({
      userId: user.id,
      action: 'UPDATE_SUBSCRIPTION',
      module: 'SETTINGS',
      recordId: workspaceId,
      beforeData: existing,
      afterData: updated,
    });

    return NextResponse.json({
      success: true,
      message: 'Período de teste de 30 dias ativado com sucesso!',
      workspace: updated,
    });
  } catch (error) {
    console.error('[POST /api/workspaces/current/subscription]', error);
    return NextResponse.json({ error: 'Erro ao ativar assinatura' }, { status: 500 });
  }
}
