import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
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

    const { id: taskId } = await params;
    const firestore = getAdminFirestore();
    const body = await request.json();
    const { action, description } = body; // action: 'approve' | 'request_change'

    const taskRef = firestore.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Tarefa não encontrada.' }, { status: 404 });
    }

    const task: any = taskDoc.data();

    // Client verification: clients can only approve/request changes for their own tasks
    if (user.role === 'CLIENTE' && task.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const prevStatus = task.status;
    const now = new Date().toISOString();

    if (action === 'request_change') {
      if (!description || !description.trim()) {
        return NextResponse.json(
          { error: 'É obrigatório descrever o que precisa ser alterado.' },
          { status: 400 }
        );
      }

      const newStatus = 'Em alteração';

      // Update task status
      await taskRef.set({ status: newStatus, updated_at: now }, { merge: true });

      // Add comment with change request
      const commentId = generateId('com');
      await firestore.collection('task_comments').doc(commentId).set({
        id: commentId,
        task_id: taskId,
        user_id: user.id,
        content: description.trim(),
        type: 'change_request',
        created_at: now,
      });

      // Status history
      const histId = generateId('thist');
      await firestore.collection('task_status_history').doc(histId).set({
        id: histId,
        task_id: taskId,
        user_id: user.id,
        previous_status: prevStatus,
        new_status: newStatus,
        comment: description.trim(),
        created_at: now,
      });

      // Audit
      await logAudit({
        userId: user.id,
        action: 'CHANGE_REQUEST',
        module: 'TASKS',
        recordId: taskId,
        beforeData: { status: prevStatus },
        afterData: { status: newStatus, description: description.trim() },
      });

      // Notify assignees
      const rawAssignees = task.assignee_ids || task.assignees || [];
      for (const a of rawAssignees) {
        const aId = typeof a === 'string' ? a : a.id;
        if (aId) {
          await createNotification({
            userId: aId,
            title: 'Solicitação de Alteração de Conteúdo',
            message: `${user.name} solicitou alterações na tarefa "${task.name || task.title}": "${description.trim().substring(0, 100)}..."`,
            type: 'change_request',
            referenceModule: 'tasks',
            referenceId: taskId,
          });
        }
      }

      return NextResponse.json({ success: true, status: newStatus });
    } else if (action === 'approve') {
      const newStatus = 'Aprovada';

      // Update task status and mark completed_at
      await taskRef.set({
        status: newStatus,
        completed_at: now,
        updated_at: now,
      }, { merge: true });

      const commentId = generateId('com');
      await firestore.collection('task_comments').doc(commentId).set({
        id: commentId,
        task_id: taskId,
        user_id: user.id,
        content: 'Conteúdo aprovado pelo cliente.',
        type: 'approval',
        created_at: now,
      });

      const histId = generateId('thist');
      await firestore.collection('task_status_history').doc(histId).set({
        id: histId,
        task_id: taskId,
        user_id: user.id,
        previous_status: prevStatus,
        new_status: newStatus,
        comment: 'Conteúdo aprovado pelo cliente.',
        created_at: now,
      });

      await logAudit({
        userId: user.id,
        action: 'APPROVE',
        module: 'TASKS',
        recordId: taskId,
        beforeData: { status: prevStatus },
        afterData: { status: newStatus },
      });

      // Notify admins & assignees
      await notifyAdmins({
        title: 'Tarefa Aprovada pelo Cliente',
        message: `${user.name} aprovou a tarefa "${task.name || task.title}"`,
        type: 'approval',
        referenceModule: 'tasks',
        referenceId: taskId,
      });

      const rawAssignees = task.assignee_ids || task.assignees || [];
      for (const a of rawAssignees) {
        const aId = typeof a === 'string' ? a : a.id;
        if (aId) {
          await createNotification({
            userId: aId,
            title: 'Tarefa Aprovada',
            message: `A tarefa "${task.name || task.title}" foi aprovada pelo cliente!`,
            type: 'approval',
            referenceModule: 'tasks',
            referenceId: taskId,
          });
        }
      }

      return NextResponse.json({ success: true, status: newStatus });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/tasks/[id]/approve error:', err);
    return NextResponse.json({ error: 'Erro ao processar aprovação.' }, { status: 500 });
  }
}
