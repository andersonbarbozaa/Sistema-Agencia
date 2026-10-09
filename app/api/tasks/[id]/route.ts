
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
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

    const db = getDb();
    const { id } = await params;

    const taskRow = await db
      .prepare(`
        SELECT t.*, c.name as client_name,
               tc.name as category_name, tc.color as category_color,
               u.name as created_by_name,
               (SELECT COUNT(*) FROM task_media_links WHERE task_id = t.id) as media_links_count,
               (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comments_count,
               (SELECT status FROM task_deletion_requests WHERE task_id = t.id AND status = 'pending' LIMIT 1) as deletion_request_status
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
      `)
      .bind(id)
      .first<any>();

    if (!taskRow) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    // Normalizing aliases
    const task = {
      ...taskRow,
      title: taskRow.name,
      due_date: taskRow.delivery_date,
    };

    // CLIENTE visibility check
    if (user.role === 'CLIENTE' && task.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Assignees
    const { results: assignees } = await db
      .prepare(`
        SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.position_id,
               p.name as position_name, ta.assigned_at
        FROM task_assignees ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN positions p ON u.position_id = p.id
        WHERE ta.task_id = ?
      `)
      .bind(id)
      .all<any>();

    // Comments
    const { results: comments } = await db
      .prepare(`
        SELECT tc.*, u.name as user_name, u.avatar_url as user_avatar
        FROM task_comments tc
        JOIN users u ON tc.user_id = u.id
        WHERE tc.task_id = ?
        ORDER BY tc.created_at ASC
      `)
      .bind(id)
      .all<any>();

    // Media links
    const { results: mediaLinks } = await db
      .prepare(`
        SELECT tml.*, u.name as created_by_name
        FROM task_media_links tml
        LEFT JOIN users u ON tml.uploaded_by = u.id
        WHERE tml.task_id = ?
        ORDER BY tml.created_at DESC
      `)
      .bind(id)
      .all<any>();

    // Status history
    const { results: statusHistory } = await db
      .prepare(`
        SELECT tsh.*, u.name as user_name
        FROM task_status_history tsh
        LEFT JOIN users u ON tsh.user_id = u.id
        WHERE tsh.task_id = ?
        ORDER BY tsh.created_at DESC
      `)
      .bind(id)
      .all<any>();

    return NextResponse.json({
      task: {
        ...task,
        assignees,
        comments,
        media_links: mediaLinks,
        status_history: statusHistory,
      },
    });
  } catch (error) {
    console.error('[GET /api/tasks/[id]]', error);
    return NextResponse.json({ error: String(error) + String((error as any)?.stack) }, { status: 500 });
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
    if (user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Sem permissão para editar tarefas' }, { status: 403 });
    }

    const db = getDb();
    const { id } = await params;

    const existing = await db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!existing) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const taskName = body.name !== undefined ? body.name : body.title;
    const taskDeliveryDate = body.delivery_date !== undefined ? body.delivery_date : body.due_date;
    const { description, status, client_id, category_id, value, notes, assignees, assignee_ids } = body;

    const now = new Date().toISOString();
    const statusChanged = status && status !== existing.status;
    const isCompleted = status === 'Concluída';

    const setClauses: string[] = ['updated_at = ?'];
    const updateParams: any[] = [now];

    if (taskName !== undefined) {
      setClauses.push('name = ?');
      updateParams.push(taskName ? taskName.trim() : existing.name);
    }
    if (description !== undefined) {
      setClauses.push('description = ?');
      updateParams.push(description);
    }
    if (status !== undefined) {
      setClauses.push('status = ?');
      updateParams.push(status);
    }
    if (client_id !== undefined) {
      setClauses.push('client_id = ?');
      updateParams.push(client_id || null);
    }
    if (category_id !== undefined) {
      setClauses.push('category_id = ?');
      updateParams.push(category_id || null);
    }
    if (taskDeliveryDate !== undefined) {
      setClauses.push('delivery_date = ?');
      updateParams.push(taskDeliveryDate);
    }
    if (value !== undefined) {
      setClauses.push('value = ?');
      updateParams.push(Number(value));
    }
    if (notes !== undefined) {
      setClauses.push('notes = ?');
      updateParams.push(notes);
    }

    if (isCompleted && !existing.completed_at) {
      setClauses.push('completed_at = ?');
      updateParams.push(now);
    } else if (status && status !== 'Concluída' && existing.completed_at) {
      setClauses.push('completed_at = ?');
      updateParams.push(null);
    }

    updateParams.push(id);

    await db
      .prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...updateParams)
      .run();

    // Update assignees if provided
    const newAssigneesList = assignee_ids || assignees;
    if (Array.isArray(newAssigneesList)) {
      await db.prepare('DELETE FROM task_assignees WHERE task_id = ?').bind(id).run();
      for (const uid of newAssigneesList) {
        const assigneeId = 'ta_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        await db
          .prepare(`INSERT INTO task_assignees (id, task_id, user_id, assigned_at) VALUES (?, ?, ?, ?)`)
          .bind(assigneeId, id, uid, now)
          .run();
      }
    }

    if (statusChanged) {
      const histId = 'tsh_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      await db
        .prepare(`
          INSERT INTO task_status_history (id, task_id, user_id, previous_status, new_status, comment, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(histId, id, user.id, existing.status, status, 'Status alterado', now)
        .run();

      const { results: taskAssignees } = await db
        .prepare('SELECT user_id FROM task_assignees WHERE task_id = ?')
        .bind(id)
        .all<{ user_id: string }>();

      const notifySet = new Set<string>(taskAssignees.map((a) => a.user_id));
      if (existing.created_by && existing.created_by !== user.id) {
        notifySet.add(existing.created_by);
      }

      const displayName = taskName || existing.name;

      for (const targetUserId of notifySet) {
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

    const updatedRaw = await db
      .prepare(`
        SELECT t.*, c.name as client_name,
               tc.name as category_name, tc.color as category_color,
               u.name as created_by_name
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
      `)
      .bind(id)
      .first<any>();

    const updated = {
      ...updatedRaw,
      title: updatedRaw?.name,
      due_date: updatedRaw?.delivery_date,
    };

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      module: 'tasks',
      recordId: id,
      beforeData: existing,
      afterData: body,
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('[PATCH /api/tasks/[id]]', error);
    return NextResponse.json({ error: String(error) + String((error as any)?.stack) }, { status: 500 });
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

    const db = getDb();
    const { id } = await params;

    const task = await db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    if (isAdmin(user)) {
      await db.prepare('DELETE FROM task_assignees WHERE task_id = ?').bind(id).run();
      await db.prepare('DELETE FROM task_comments WHERE task_id = ?').bind(id).run();
      await db.prepare('DELETE FROM task_media_links WHERE task_id = ?').bind(id).run();
      await db.prepare('DELETE FROM task_status_history WHERE task_id = ?').bind(id).run();
      await db.prepare('DELETE FROM task_deletion_requests WHERE task_id = ?').bind(id).run();
      await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();

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

    // COLABORADOR -> create deletion request
    const existingReq = await db
      .prepare(`SELECT id FROM task_deletion_requests WHERE task_id = ? AND status = 'pending'`)
      .bind(id)
      .first<any>();

    if (existingReq) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação de exclusão pendente para esta tarefa' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const requestId = 'tdr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();

    await db
      .prepare(`
        INSERT INTO task_deletion_requests (id, task_id, requested_by, reason, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `)
      .bind(requestId, id, user.id, reason || null, now)
      .run();

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
  } catch (error) {
    console.error('[DELETE /api/tasks/[id]]', error);
    return NextResponse.json({ error: String(error) + String((error as any)?.stack) }, { status: 500 });
  }
}
