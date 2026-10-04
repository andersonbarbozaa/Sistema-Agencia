
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { notifyAdmins, createNotification } from '@/lib/notifications';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const db = getDb();
    const { id: taskId } = await params;
    const body = await request.json();
    const { action, reason, review_notes } = body;

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first<any>();
    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada.' }, { status: 404 });
    }

    // 1. COLLABORATOR REQUESTS DELETION (or action='request')
    if (action === 'request') {
      const existingReq = await db
        .prepare('SELECT * FROM task_deletion_requests WHERE task_id = ? AND status = "pending"')
        .bind(taskId)
        .first();

      if (existingReq) {
        return NextResponse.json({ error: 'Já existe uma solicitação de exclusão pendente para esta tarefa.' }, { status: 400 });
      }

      const reqId = generateId('tdel');
      await db
        .prepare(`
          INSERT INTO task_deletion_requests (id, task_id, requested_by, reason, status, created_at)
          VALUES (?, ?, ?, ?, 'pending', datetime('now'))
        `)
        .bind(reqId, taskId, user.id, reason || null)
        .run();

      await logAudit({
        userId: user.id,
        action: 'DELETION_REQUEST',
        module: 'TASKS',
        recordId: taskId,
        afterData: { reason },
      });

      await notifyAdmins({
        title: 'Solicitação de Exclusão de Tarefa',
        message: `${user.name} solicitou a exclusão da tarefa "${task.name}". Motivo: ${reason || 'Não informado'}`,
        type: 'deletion_request',
        referenceModule: 'tasks',
        referenceId: taskId,
      });

      return NextResponse.json({ success: true, message: 'Solicitação enviada ao administrador.' });
    }

    // 2. ADMIN REVIEWS REQUEST (action='approve' or action='reject')
    if (action === 'approve' || action === 'reject') {
      if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Apenas administradores podem aprovar ou rejeitar exclusões.' }, { status: 403 });
      }

      const pendingReq = await db
        .prepare('SELECT * FROM task_deletion_requests WHERE task_id = ? AND status = "pending"')
        .bind(taskId)
        .first<any>();

      if (!pendingReq) {
        return NextResponse.json({ error: 'Nenhuma solicitação pendente encontrada.' }, { status: 404 });
      }

      if (action === 'approve') {
        // Mark request approved
        await db
          .prepare(`
            UPDATE task_deletion_requests
            SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ?
            WHERE id = ?
          `)
          .bind(user.id, review_notes || null, pendingReq.id)
          .run();

        // Delete the task
        await db.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();

        await logAudit({
          userId: user.id,
          action: 'DELETE',
          module: 'TASKS',
          recordId: taskId,
          beforeData: task,
        });

        // Notify requester
        await createNotification({
          userId: pendingReq.requested_by,
          title: 'Exclusão de Tarefa Aprovada',
          message: `A exclusão da tarefa "${task.name}" foi aprovada pelo administrador.`,
          type: 'deletion_request',
          referenceModule: 'tasks',
          referenceId: taskId,
        });

        return NextResponse.json({ success: true, message: 'Tarefa excluída com sucesso.' });
      } else {
        // Reject
        await db
          .prepare(`
            UPDATE task_deletion_requests
            SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ?
            WHERE id = ?
          `)
          .bind(user.id, review_notes || null, pendingReq.id)
          .run();

        await logAudit({
          userId: user.id,
          action: 'DELETION_REJECTED',
          module: 'TASKS',
          recordId: taskId,
          afterData: { review_notes },
        });

        // Notify requester
        await createNotification({
          userId: pendingReq.requested_by,
          title: 'Exclusão de Tarefa Recusada',
          message: `A solicitação de exclusão da tarefa "${task.name}" foi recusada: ${review_notes || 'Sem observações.'}`,
          type: 'deletion_request',
          referenceModule: 'tasks',
          referenceId: taskId,
        });

        return NextResponse.json({ success: true, message: 'Solicitação recusada.' });
      }
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err: any) {
    console.error('[Deletion Request Error]:', err);
    return NextResponse.json({ error: 'Erro ao processar solicitação de exclusão.' }, { status: 500 });
  }
}
