import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';
import { createNotification, notifyAdmins } from '@/lib/notifications';
import { generateId } from '@/lib/utils';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const firestore = getAdminFirestore();

    const [commentsSnap, usersSnap] = await Promise.all([
      firestore.collection('task_comments').where('task_id', '==', taskId).get(),
      firestore.collection('users').get(),
    ]);

    const userMap: Record<string, any> = {};
    usersSnap.docs.forEach((uDoc: any) => {
      const u = uDoc.data();
      userMap[uDoc.id] = { name: u.name, avatar_url: u.avatar_url || null, role: u.role };
    });

    const comments = commentsSnap.docs
      .map((doc: any) => {
        const c = doc.data();
        const u = c.user_id ? userMap[c.user_id] : null;
        return {
          id: doc.id,
          ...c,
          user_name: u?.name || 'Usuário',
          user_avatar: u?.avatar_url || null,
          user_role: u?.role || null,
        };
      })
      .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    return NextResponse.json({ comments });
  } catch (err: any) {
    console.error('GET /api/tasks/[id]/comments error:', err);
    return NextResponse.json({ error: 'Erro ao buscar comentários' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const firestore = getAdminFirestore();
    const body = await request.json();
    const { content, type = 'comment' } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'O conteúdo é obrigatório.' }, { status: 400 });
    }

    const taskRef = firestore.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Tarefa não encontrada.' }, { status: 404 });
    }

    const task: any = taskDoc.data();
    if (user.role === 'CLIENTE' && task.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const commentId = generateId('com');
    const now = new Date().toISOString();

    await firestore.collection('task_comments').doc(commentId).set({
      id: commentId,
      task_id: taskId,
      user_id: user.id,
      content: content.trim(),
      type,
      created_at: now,
    });

    if (type === 'approval' || type === 'change_request') {
      const newStatus = type === 'approval' ? 'Aprovada' : 'Em alteração';
      const prevStatus = task.status;

      await taskRef.set({
        status: newStatus,
        updated_at: now,
      }, { merge: true });

      const historyId = generateId('thist');
      await firestore.collection('task_status_history').doc(historyId).set({
        id: historyId,
        task_id: taskId,
        user_id: user.id,
        previous_status: prevStatus,
        new_status: newStatus,
        comment: content.trim(),
        created_at: now,
      });
    }

    // Notificar responsáveis da tarefa
    const rawAssignees = task.assignee_ids || task.assignees || [];
    for (const a of rawAssignees) {
      const aId = typeof a === 'string' ? a : a.id;
      if (aId && aId !== user.id) {
        await createNotification({
          userId: aId,
          title: 'Novo comentário na tarefa',
          message: `${user.name} comentou na tarefa "${task.name || task.title}"`,
          type: 'task',
          referenceModule: 'tasks',
          referenceId: taskId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: commentId,
        task_id: taskId,
        user_id: user.id,
        content: content.trim(),
        type,
        created_at: now,
        user_name: user.name,
        user_avatar: user.avatar_url || null,
        user_role: user.role,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/tasks/[id]/comments error:', err);
    return NextResponse.json({ error: 'Erro ao criar comentário' }, { status: 500 });
  }
}
