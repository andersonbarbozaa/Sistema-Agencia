import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { isMasterAdmin } from '@/lib/auth-constants';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);

    // Validação estrita: apenas o titular master pode executar ações de concessão de acesso
    if (!user || !isMasterAdmin(user)) {
      return NextResponse.json(
        { error: 'Acesso restrito exclusivamente ao titular master.', code: 'FORBIDDEN_MASTER_ONLY' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, userId, workspaceId, days = 30 } = body;

    if (!action || (!userId && !workspaceId)) {
      return NextResponse.json(
        { error: 'Ação, usuário ou workspace não informados.' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Determina o workspace alvo
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId && userId) {
      const u = await db.prepare('SELECT workspace_id FROM users WHERE id = ?').bind(userId).first<any>();
      targetWorkspaceId = u?.workspace_id || 'ws_default';
    }

    const ws = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(targetWorkspaceId)
      .first<any>();

    if (!ws) {
      return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
    }

    let successMessage = '';
    let updatedStatus = ws.subscription_status;
    let updatedTrialEnds = ws.trial_ends_at;

    if (action === 'grant_access') {
      // Libera acesso 100% ativo (Assinatura Ativada pelo Master)
      updatedStatus = 'active';
      await db
        .prepare(
          `UPDATE workspaces 
           SET subscription_status = 'active', 
               updated_at = datetime('now') 
           WHERE id = ?`
        )
        .bind(targetWorkspaceId)
        .run();

      if (userId) {
        await db
          .prepare("UPDATE users SET status = 'ativo', updated_at = datetime('now') WHERE id = ?")
          .bind(userId)
          .run();
      }

      successMessage = 'Acesso liberado com sucesso! O workspace agora possui status Ativo.';
    } else if (action === 'extend_trial') {
      // Adiciona dias ao período de teste grátis
      const numDays = Math.max(1, parseInt(String(days), 10) || 30);
      const now = Date.now();

      // Se o trial atual ainda não venceu, soma a partir dele; caso contrário, soma a partir de hoje
      let baseTime = now;
      if (ws.trial_ends_at) {
        const currentEnd = new Date(ws.trial_ends_at).getTime();
        if (currentEnd > now) {
          baseTime = currentEnd;
        }
      }

      const newDate = new Date(baseTime + numDays * 24 * 60 * 60 * 1000);
      updatedTrialEnds = newDate.toISOString();
      updatedStatus = 'trial';

      await db
        .prepare(
          `UPDATE workspaces 
           SET subscription_status = 'trial', 
               trial_ends_at = ?, 
               updated_at = datetime('now') 
           WHERE id = ?`
        )
        .bind(updatedTrialEnds, targetWorkspaceId)
        .run();

      if (userId) {
        await db
          .prepare("UPDATE users SET status = 'ativo', updated_at = datetime('now') WHERE id = ?")
          .bind(userId)
          .run();
      }

      successMessage = `Período de teste estendido em +${numDays} dias! Válido até ${newDate.toLocaleDateString('pt-BR')}.`;
    } else if (action === 'suspend_access') {
      // Suspende / bloqueia acesso
      updatedStatus = 'cancelled';
      await db
        .prepare(
          `UPDATE workspaces 
           SET subscription_status = 'cancelled', 
               updated_at = datetime('now') 
           WHERE id = ?`
        )
        .bind(targetWorkspaceId)
        .run();

      successMessage = 'Acesso do workspace suspenso com sucesso.';
    } else {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    // Registra log de auditoria
    await logAudit({
      userId: user.id,
      action: `MASTER_ADMIN_${action.toUpperCase()}`,
      module: 'BILLING',
      recordId: targetWorkspaceId,
      beforeData: ws,
      afterData: {
        subscription_status: updatedStatus,
        trial_ends_at: updatedTrialEnds,
        action,
        granted_by: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: successMessage,
      workspace: {
        id: targetWorkspaceId,
        subscription_status: updatedStatus,
        trial_ends_at: updatedTrialEnds,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/admin-master/actions error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar ação administrativa' },
      { status: 500 }
    );
  }
}
