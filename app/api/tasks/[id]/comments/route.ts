export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
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

    const db = getDb();
    const { id: taskId } = await params;

    const comments = await db
      .prepare(`
        SELECT c.*, u.name as user_name, u.avatar_url as user_avatar, u.role as user_role
        FROM task_comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.task_id = ?
        ORDER BY c.created_at ASC
      `)
      .bind(taskId)
      .all();

    return NextResponse.json({ comments: comments.results || [] });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar comentários' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const db = getDb();
    const { id: taskId } = await params;
    const body = await request.json();
    const { content, type = 'comment' } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'O conteúdo é obrigatório.' }, { status: 400 });
    }

    // Check task existence
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first<any>();
    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada.' }, { status: 404 });
    }

    // Role check: client can only comment on own task
    if (user.role === 'CLIENTE' && task.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const commentId = generateId('com');
    await db
      .prepare(`
        INSERT INTO task_comments (id, task_id, user_id, content, type, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(commentId, taskId, user.id, content.trim(), type)
      .run();

    // If type is approval or change_request, also update task status & history
    if (type === 'approval' || type === 'change_request') {
      const newStatus = type === 'approval' ? 'Aprovada' : 'Em alteração';
      const prevStatus = task.status;

      await db
        .prepare(`
          UPDATE tasks
          SET status = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(newStatus, taskId)
        .run();

      const historyId = generateId('thist');
      await db
        .prepare(`
          INSERT INTO task_status_history (id, task_id, user_id, previous_status, new_status, comment, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(historyId, taskId, user.id, prevStatus, newStatus, content.trim())
        .run();
    }

    // Notify assignees
    const assignees = await db
      .prepare('SELECT user_id FROM task_assignees WHERE task_id = ? AND user_id != ?')
      .bind(taskId, user.id)
      .all<any>();

    for (const a of assignees.results || []) {
      await createNotification({
        userId: a.user_id,
        title: type === 'approval' ? 'Tarefa Aprovada!' : type === 'change_request' ? 'Alteração Solicitada' : 'Novo comentário',
        message: `${user.name} adicionou feedback na tarefa "${task.name}".`,
        type: type === 'approval' ? 'client_approval' : type === 'change_request' ? 'change_request' : 'comment',
        referenceModule: 'tasks',
        referenceId: taskId,
      });
    }

    return NextResponse.json({ success: true, commentId });
  } catch (err: any) {
    console.error('[Task Comments Error]:', err);
    return NextResponse.json({ error: 'Erro ao adicionar comentário.' }, { status: 500 });
  }
}
