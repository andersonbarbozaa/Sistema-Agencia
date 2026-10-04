import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
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

    const { id: taskId } = await params;
    const firestore = getAdminFirestore();
    const body = await request.json();
    const { action, reason, review_notes } = body;

    const taskRef = firestore.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Tarefa não encontrada.' }, { status: 404 });
    }

    const task: any = taskDoc.data();
    const now = new Date().toISOString();

    // 1. COLLABORATOR REQUESTS DELETION (or action='request')
    if (action === 'request') {
      const existingReq = await firestore
        .collection('task_deletion_requests')
        .where('task_id', '==', taskId)
        .where('status', '==', 'pending')
        .get();

      if (!existingReq.empty) {
        return NextResponse.json({ error: 'Já existe uma solicitação de exclusão pendente para esta tarefa.' }, { status: 400 });
      }

      const reqId = generateId('tdel');
      await firestore.collection('task_deletion_requests').doc(reqId).set({
        id: reqId,
        task_id: taskId,
        requested_by: user.id,
        reason: reason || null,
        status: 'pending',
        created_at: now,
      });

      await logAudit({
        userId: user.id,
        action: 'DELETION_REQUEST',
        module: 'TASKS',
        recordId: taskId,
        afterData: { reason },
      });

      await notifyAdmins({
        title: 'Solicitação de Exclusão de Tarefa',
        message: `${user.name} solicitou a exclusão da tarefa "${task.name || task.title}". Motivo: ${reason || 'Não informado'}`,
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

      const pendingReqSnap = await firestore
        .collection('task_deletion_requests')
        .where('task_id', '==', taskId)
        .where('status', '==', 'pending')
        .get();

      if (pendingReqSnap.empty) {
        return NextResponse.json({ error: 'Nenhuma solicitação pendente encontrada.' }, { status: 404 });
      }

      const pendingReqDoc = pendingReqSnap.docs[0];
      const pendingReq = pendingReqDoc.data();

      if (action === 'approve') {
        await pendingReqDoc.ref.set({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: now,
          review_notes: review_notes || null,
        }, { merge: true });

        // Excluir a tarefa do Firestore
        await taskRef.delete();

        await logAudit({
          userId: user.id,
          action: 'DELETE',
          module: 'TASKS',
          recordId: taskId,
          beforeData: task,
          afterData: { review_notes },
        });

        if (pendingReq.requested_by) {
          await createNotification({
            userId: pendingReq.requested_by,
            title: 'Solicitação de Exclusão Aprovada',
            message: `Sua solicitação de exclusão para a tarefa "${task.name || task.title}" foi aprovada pelo administrador.`,
            type: 'deletion_approved',
            referenceModule: 'tasks',
            referenceId: taskId,
          });
        }

        return NextResponse.json({ success: true, message: 'Tarefa excluída com sucesso.' });
      } else {
        await pendingReqDoc.ref.set({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: now,
          review_notes: review_notes || null,
        }, { merge: true });

        await logAudit({
          userId: user.id,
          action: 'REJECT_DELETION',
          module: 'TASKS',
          recordId: taskId,
          afterData: { review_notes },
        });

        if (pendingReq.requested_by) {
          await createNotification({
            userId: pendingReq.requested_by,
            title: 'Solicitação de Exclusão Rejeitada',
            message: `Sua solicitação de exclusão para a tarefa "${task.name || task.title}" foi rejeitada. Motivo: ${review_notes || 'Não informado'}`,
            type: 'deletion_rejected',
            referenceModule: 'tasks',
            referenceId: taskId,
          });
        }

        return NextResponse.json({ success: true, message: 'Solicitação de exclusão rejeitada.' });
      }
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/tasks/[id]/deletion-request error:', err);
    return NextResponse.json({ error: 'Erro ao processar solicitação de exclusão.' }, { status: 500 });
  }
}
