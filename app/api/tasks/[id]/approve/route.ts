
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { createNotification, notifyAdmins } from '@/lib/notifications';
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
    const { action, description } = body; // action: 'approve' | 'request_change'

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first<any>();
    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada.' }, { status: 404 });
    }

    // Client verification: clients can only approve/request changes for their own tasks
    if (user.role === 'CLIENTE' && task.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const prevStatus = task.status;

    if (action === 'request_change') {
      if (!description || !description.trim()) {
        return NextResponse.json(
          { error: 'É obrigatório descrever o que precisa ser alterado.' },
          { status: 400 }
        );
      }

      const newStatus = 'Em alteração';

      // Update task status
      await db
        .prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newStatus, taskId)
        .run();

      // Add comment with change request
      const commentId = generateId('com');
      await db
        .prepare(`
          INSERT INTO task_comments (id, task_id, user_id, content, type, created_at)
          VALUES (?, ?, ?, ?, 'change_request', datetime('now'))
        `)
        .bind(commentId, taskId, user.id, description.trim())
        .run();

      // Status history
      const histId = generateId('thist');
      await db
        .prepare(`
          INSERT INTO task_status_history (id, task_id, user_id, previous_status, new_status, comment, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(histId, taskId, user.id, prevStatus, newStatus, description.trim())
        .run();

      // Audit
      await logAudit({
        userId: user.id,
        action: 'CHANGE_REQUEST',
        module: 'TASKS',
        recordId: taskId,
        beforeData: { status: prevStatus },
        afterData: { status: newStatus, description: description.trim() },
      });

      // Notify assignees and admins
      const assignees = await db
        .prepare('SELECT user_id FROM task_assignees WHERE task_id = ?')
        .bind(taskId)
        .all<any>();

      for (const a of assignees.results || []) {
        await createNotification({
          userId: a.user_id,
          title: 'Solicitação de Alteração de Conteúdo',
          message: `${user.name} solicitou alterações na tarefa "${task.name}": "${description.trim().substring(0, 100)}..."`,
          type: 'change_request',
          referenceModule: 'tasks',
          referenceId: taskId,
        });
      }

      return NextResponse.json({ success: true, status: newStatus });
    } else if (action === 'approve') {
      const newStatus = 'Aprovada';

      await db
        .prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newStatus, taskId)
        .run();

      // Add comment
      const commentId = generateId('com');
      await db
        .prepare(`
          INSERT INTO task_comments (id, task_id, user_id, content, type, created_at)
          VALUES (?, ?, ?, 'Tarefa aprovada com sucesso.', 'approval', datetime('now'))
        `)
        .bind(commentId, taskId, user.id)
        .run();

      // Status history
      const histId = generateId('thist');
      await db
        .prepare(`
          INSERT INTO task_status_history (id, task_id, user_id, previous_status, new_status, comment, created_at)
          VALUES (?, ?, ?, ?, ?, 'Aprovada pelo cliente.', datetime('now'))
        `)
        .bind(histId, taskId, user.id, prevStatus, newStatus)
        .run();

      // Audit
      await logAudit({
        userId: user.id,
        action: 'APPROVAL',
        module: 'TASKS',
        recordId: taskId,
        beforeData: { status: prevStatus },
        afterData: { status: newStatus },
      });

      // Notify assignees and admins
      const assignees = await db
        .prepare('SELECT user_id FROM task_assignees WHERE task_id = ?')
        .bind(taskId)
        .all<any>();

      for (const a of assignees.results || []) {
        await createNotification({
          userId: a.user_id,
          title: 'Tarefa Aprovada pelo Cliente!',
          message: `${user.name} aprovou a tarefa "${task.name}".`,
          type: 'client_approval',
          referenceModule: 'tasks',
          referenceId: taskId,
        });
      }

      return NextResponse.json({ success: true, status: newStatus });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err: any) {
    console.error('[Task Approve Error]:', err);
    return NextResponse.json({ error: 'Erro ao processar aprovação.' }, { status: 500 });
  }
}
