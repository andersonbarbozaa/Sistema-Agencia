import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification, notifyAdmins } from '@/lib/notifications';

type RouteParams = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/tasks/[id]
// ---------------------------------------------------------------------------
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const taskDoc = await firestore.collection('tasks').doc(id).get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    const taskData: any = { id: taskDoc.id, ...taskDoc.data() };

    // CLIENTE visibility check
    if (user.role === 'CLIENTE' && taskData.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Parallel loading of sub-collections and related entities
    const [clientsSnap, catsSnap, usersSnap, commentsSnap, mediaSnap, historySnap, deletionSnap] = await Promise.all([
      firestore.collection('clients').get(),
      firestore.collection('task_categories').get(),
      firestore.collection('users').get(),
      firestore.collection('task_comments').where('task_id', '==', id).get(),
      firestore.collection('task_media_links').where('task_id', '==', id).get(),
      firestore.collection('task_status_history').where('task_id', '==', id).get(),
      firestore.collection('task_deletion_requests').where('task_id', '==', id).where('status', '==', 'pending').get(),
    ]);

    const clientMap: Record<string, string> = {};
    clientsSnap.docs.forEach((d: any) => { clientMap[d.id] = d.data().name; });

    const catMap: Record<string, { name: string; color: string }> = {};
    catsSnap.docs.forEach((d: any) => {
      catMap[d.id] = { name: d.data().name, color: d.data().color || '#3B82F6' };
    });

    const userMap: Record<string, any> = {};
    usersSnap.docs.forEach((d: any) => {
      const u = d.data();
      userMap[d.id] = { id: d.id, name: u.name, avatar_url: u.avatar_url || null, role: u.role, email: u.email };
    });

    // Enriched assignees
    let assignees: any[] = [];
    const rawList = taskData.assignee_ids || taskData.assignees || [];
    if (Array.isArray(rawList)) {
      assignees = rawList.map((a: any) => {
        const uid = typeof a === 'string' ? a : a.id;
        return userMap[uid] || (typeof a === 'object' ? a : { id: uid, name: 'Colaborador' });
      });
    }

    // Comments
    const comments = commentsSnap.docs
      .map((d: any) => {
        const c = d.data();
        const u = c.user_id ? userMap[c.user_id] : null;
        return {
          id: d.id,
          ...c,
          user_name: u?.name || 'Usuário',
          user_avatar: u?.avatar_url || null,
        };
      })
      .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    // Media links
    const mediaLinks = mediaSnap.docs
      .map((d: any) => {
        const m = d.data();
        const u = m.created_by ? userMap[m.created_by] : null;
        return {
          id: d.id,
          ...m,
          created_by_name: u?.name || null,
        };
      })
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    // Status history
    const statusHistory = historySnap.docs
      .map((d: any) => {
        const h = d.data();
        const u = h.user_id ? userMap[h.user_id] : null;
        return {
          id: d.id,
          ...h,
          user_name: u?.name || 'Sistema',
        };
      })
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const deletion_request_status = deletionSnap.empty ? null : 'pending';
    const cat = taskData.category_id ? catMap[taskData.category_id] : null;

    const task = {
      ...taskData,
      name: taskData.name || taskData.title || 'Tarefa sem título',
      title: taskData.title || taskData.name || 'Tarefa sem título',
      delivery_date: taskData.delivery_date || taskData.due_date || null,
      due_date: taskData.delivery_date || taskData.due_date || null,
      client_name: taskData.client_id ? (clientMap[taskData.client_id] || null) : null,
      category_name: cat?.name || null,
      category_color: cat?.color || '#3B82F6',
      created_by_name: taskData.created_by ? (userMap[taskData.created_by]?.name || null) : null,
      assignees,
      comments,
      media_links: mediaLinks,
      status_history: statusHistory,
      media_links_count: mediaLinks.length,
      comments_count: comments.length,
      deletion_request_status,
    };

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('[GET /api/tasks/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/tasks/[id]
// ---------------------------------------------------------------------------
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const taskRef = firestore.collection('tasks').doc(id);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    const existing: any = taskDoc.data();

    // Permissão: CLIENTE não pode alterar tarefas
    if (user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Sem permissão para editar tarefas' }, { status: 403 });
    }

    const body = await request.json();
    const taskName = body.name ?? body.title;
    const {
      description,
      status,
      client_id,
      category_id,
      delivery_date,
      due_date,
      value,
      notes,
      assignees,
      assignee_ids,
    } = body;

    const taskDeliveryDate = delivery_date ?? due_date;
    const now = new Date().toISOString();
    const statusChanged = status && status !== existing.status;
    const isCompleted = status === 'Concluída';

    const updateData: Record<string, any> = {
      updated_at: now,
    };

    if (taskName !== undefined) {
      updateData.name = taskName ? taskName.trim() : existing.name;
      updateData.title = updateData.name;
    }
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (client_id !== undefined) updateData.client_id = client_id;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (taskDeliveryDate !== undefined) {
      updateData.delivery_date = taskDeliveryDate;
      updateData.due_date = taskDeliveryDate;
    }
    if (value !== undefined) updateData.value = Number(value);
    if (notes !== undefined) updateData.notes = notes;

    if (isCompleted && !existing.completed_at) {
      updateData.completed_at = now;
    } else if (status && status !== 'Concluída' && existing.completed_at) {
      updateData.completed_at = null;
    }

    const newAssigneesList = assignee_ids || assignees;
    if (Array.isArray(newAssigneesList)) {
      const formattedIds = newAssigneesList.map((a: any) => (typeof a === 'string' ? a : a.id)).filter(Boolean);
      updateData.assignee_ids = formattedIds;
      updateData.assignees = formattedIds;
    }

    await taskRef.set(updateData, { merge: true });

    if (statusChanged) {
      const histId = 'tsh_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      await firestore.collection('task_status_history').doc(histId).set({
        id: histId,
        task_id: id,
        user_id: user.id,
        previous_status: existing.status,
        new_status: status,
        comment: 'Status alterado',
        created_at: now,
      });

      const notifyIds = new Set<string>();
      if (Array.isArray(updateData.assignee_ids || existing.assignee_ids)) {
        (updateData.assignee_ids || existing.assignee_ids).forEach((uid: string) => notifyIds.add(uid));
      }
      if (existing.created_by) notifyIds.add(existing.created_by);

      const displayName = taskName || existing.name || existing.title;
      for (const targetUserId of notifyIds) {
        if (targetUserId !== user.id) {
          await createNotification({
            userId: targetUserId,
            title: 'Status da tarefa atualizado',
            message: `A tarefa "${displayName}" foi atualizada para "${status}"`,
            type: 'task',
            referenceModule: 'tasks',
            referenceId: id,
          });
        }
      }

      if (isCompleted) {
        await notifyAdmins({
          title: 'Tarefa concluída',
          message: `A tarefa "${displayName}" foi marcada como Concluída por ${user.name}`,
          type: 'task',
          referenceModule: 'tasks',
          referenceId: id,
        });
      }
    }

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      module: 'tasks',
      recordId: id,
      beforeData: existing,
      afterData: body,
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    const updatedDoc = await taskRef.get();
    return NextResponse.json({
      task: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      }
    });
  } catch (error: any) {
    console.error('[PATCH /api/tasks/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/tasks/[id]
// ---------------------------------------------------------------------------
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const taskRef = firestore.collection('tasks').doc(id);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    const task: any = taskDoc.data();

    if (isAdmin(user)) {
      // Exclui tarefa e coleções relacionadas
      await taskRef.delete();

      const [commSnap, medSnap, histSnap, delSnap] = await Promise.all([
        firestore.collection('task_comments').where('task_id', '==', id).get(),
        firestore.collection('task_media_links').where('task_id', '==', id).get(),
        firestore.collection('task_status_history').where('task_id', '==', id).get(),
        firestore.collection('task_deletion_requests').where('task_id', '==', id).get(),
      ]);

      const batch = firestore.batch();
      commSnap.docs.forEach((d: any) => batch.delete(d.ref));
      medSnap.docs.forEach((d: any) => batch.delete(d.ref));
      histSnap.docs.forEach((d: any) => batch.delete(d.ref));
      delSnap.docs.forEach((d: any) => batch.delete(d.ref));
      await batch.commit();

      await logAudit({
        userId: user.id,
        action: 'DELETE',
        module: 'tasks',
        recordId: id,
        beforeData: task,
        ipAddress: request.headers.get('x-forwarded-for'),
      });

      return NextResponse.json({ message: 'Tarefa excluída com sucesso' });
    }

    // COLABORADOR -> cria solicitação de exclusão
    const existingReq = await firestore
      .collection('task_deletion_requests')
      .where('task_id', '==', id)
      .where('status', '==', 'pending')
      .get();

    if (!existingReq.empty) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação de exclusão pendente para esta tarefa' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;
    const requestId = 'tdr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();

    await firestore.collection('task_deletion_requests').doc(requestId).set({
      id: requestId,
      task_id: id,
      requested_by: user.id,
      reason: reason || null,
      status: 'pending',
      created_at: now,
    });

    await notifyAdmins({
      title: 'Solicitação de exclusão de tarefa',
      message: `${user.name} solicitou a exclusão da tarefa "${task.name || task.title}"`,
      type: 'task',
      referenceModule: 'tasks',
      referenceId: id,
    });

    await logAudit({
      userId: user.id,
      action: 'DELETE_REQUEST',
      module: 'tasks',
      recordId: id,
      afterData: { requestId, reason },
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({
      message: 'Solicitação de exclusão criada. Aguardando aprovação do administrador.',
      requestId,
    });
  } catch (error: any) {
    console.error('[DELETE /api/tasks/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
